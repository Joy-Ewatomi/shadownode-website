import { nanoid } from "nanoid"
import { NextRequest, NextResponse } from "next/server"

import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { analyzeRequest } from "@/lib/services/request-analysis-service"
import { notifyAdmins } from "@/lib/services/notification-service"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"

/* ============================================================
   HELPERS
============================================================ */

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function nullableString(value: unknown): string | null {
  const result = clean(value)
  return result || null
}

function nullableInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const parsed = Number.parseInt(String(value), 10)

  return Number.isFinite(parsed) ? parsed : null
}

function nullableDate(value: unknown): string | null {
  const result = clean(value)

  if (!result) {
    return null
  }

  // Basic YYYY-MM-DD validation.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) {
    return null
  }

  return result
}

function safeJsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/* ============================================================
   GET CLIENT REQUESTS
   IMPORTANT:
   Never expose AI/internal pricing/review metadata.
============================================================ */

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    if (user.role !== "client") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      )
    }

    const result = await query(
      `
      SELECT
        id,
        case_number,
        title,
        service_type,
        description,
        status,
        priority,
        timeline,

        approved_quote_amount,
        approved_quote_currency,
        approved_quote_notes,
        approved_estimated_completion,

        osint_completion_date,

        training_preferred_start_date,
        training_preferred_completion_date,
        training_timeline_flexible,

        created_at,
        updated_at

      FROM requests

      WHERE user_id = $1

      ORDER BY created_at DESC
      `,
      [user.id],
    )

    const requests = result.rows.map((row) => ({
      id: row.id,

      case_number:
        row.case_number ?? null,

      title:
        row.title ?? null,

      service_type:
        row.service_type ?? null,

      description:
        row.description ?? null,

      status:
        row.status ?? "pending_super_admin_review",

      priority:
        row.priority ?? null,

      timeline:
        row.timeline ?? null,

      approved_quote_amount:
        row.approved_quote_amount ?? null,

      approved_quote_currency:
        row.approved_quote_currency ?? null,

      approved_quote_notes:
        row.approved_quote_notes ?? null,

      approved_estimated_completion:
        row.approved_estimated_completion ?? null,

      osint_completion_date:
        row.osint_completion_date ?? null,

      training_preferred_start_date:
        row.training_preferred_start_date ?? null,

      training_preferred_completion_date:
        row.training_preferred_completion_date ?? null,

      training_timeline_flexible:
        row.training_timeline_flexible ?? null,

      created_at:
        row.created_at,

      updated_at:
        row.updated_at,
    }))

    console.log("CLIENT REQUEST RESULTS:", {
      userId: user.id,
      count: requests.length,
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error(
      "CLIENT REQUESTS GET ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to load requests",
      },
      {
        status: 500,
      },
    )
  }
}

/* ============================================================
   CREATE CLIENT REQUEST
============================================================ */

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    if (user.role !== "client") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      )
    }

    const body = await request.json()

    /* ========================================================
       COMMON
    ======================================================== */

    const category = clean(
      body.category || "osint",
    )

    const service_type = clean(
      body.service_type || category,
    )

    const custom_description = clean(
      body.custom_description,
    )

    const investigation_objective = clean(
      body.investigation_objective,
    )

    const training_goal = clean(
      body.training_goal,
    )

    const description = clean(
      body.description ||
        custom_description ||
        training_goal ||
        investigation_objective,
    )

    const title = clean(
      body.title ||
        custom_description ||
        training_goal ||
        investigation_objective ||
        service_type ||
        "Client Service Request",
    )

    const urgency = clean(
      body.urgency || "normal",
    )

    const existing_information = clean(
      body.existing_information,
    )

    const investigation_depth = clean(
      body.investigation_depth || "standard",
    )

    const confidentiality_level = clean(
      body.confidentiality_level || "standard",
    )

    const authorization_confirmed =
      body.authorization_confirmed === true

    const additional_notes = clean(
      body.additional_notes,
    )

    /* ========================================================
       TIMELINE
    ======================================================== */

    const preferred_deadline =
      nullableDate(body.preferred_deadline)

    const osint_completion_date =
      nullableDate(body.osint_completion_date)

    const training_preferred_dates =
      nullableString(
        body.training_preferred_dates,
      )

    const timeline = clean(
      body.timeline ||
        training_preferred_dates ||
        (preferred_deadline
          ? `Deadline: ${preferred_deadline}`
          : urgency),
    )

    /* ========================================================
       COMMUNICATION
    ======================================================== */

    const contact_method = clean(
      body.contact_method ||
        body.communication_method ||
        body.communication_channel ||
        "portal_notification",
    )

    const communication_method = clean(
      body.communication_method ||
        body.communication_channel ||
        contact_method,
    )

    const communication_email = clean(
      body.communication_email,
    )

    const communication_country_code = clean(
      body.communication_country_code,
    )

    const communication_phone = clean(
      body.communication_phone,
    )

    const communication_whatsapp = clean(
      body.communication_whatsapp,
    )

    const communication_signal = clean(
      body.communication_signal,
    )

    const client_country = clean(
      body.client_country,
    )

    const preferred_currency = clean(
      body.preferred_currency ||
        body.currency ||
        "USD",
    )

    /* ========================================================
       OSINT SUBJECT
    ======================================================== */

    const subject_type = clean(
      body.subject_type,
    )

    const subject_full_name = clean(
      body.subject_full_name,
    )

    const subject_known_usernames = clean(
      body.subject_known_usernames,
    )

    const subject_emails = clean(
      body.subject_emails,
    )

    const subject_phone_numbers = clean(
      body.subject_phone_numbers,
    )

    const subject_location = clean(
      body.subject_location,
    )

    const subject_organization = clean(
      body.subject_organization,
    )

    const subject_websites = clean(
      body.subject_websites,
    )

    /* ========================================================
       COMPANY
    ======================================================== */

    const subject_company_name = clean(
      body.subject_company_name,
    )

    const subject_company_website = clean(
      body.subject_company_website,
    )

    const subject_company_country = clean(
      body.subject_company_country,
    )

    const subject_company_industry = clean(
      body.subject_company_industry,
    )

    /* ========================================================
       DIGITAL ASSET
    ======================================================== */

    const subject_domain = clean(
      body.subject_domain,
    )

    const subject_url = clean(
      body.subject_url,
    )

    const subject_ip_address = clean(
      body.subject_ip_address,
    )

    const subject_platform = clean(
      body.subject_platform,
    )

    /* ========================================================
       ADDITIONAL IDENTIFYING INFORMATION
    ======================================================== */

    const subject_approximate_age = clean(
      body.subject_approximate_age,
    )

    const subject_height = clean(
      body.subject_height,
    )

    const subject_weight = clean(
      body.subject_weight,
    )

    const subject_hair_color = clean(
      body.subject_hair_color,
    )

    const subject_eye_color = clean(
      body.subject_eye_color,
    )

    const subject_skin_tone = clean(
      body.subject_skin_tone,
    )

    const subject_distinguishing_marks = clean(
      body.subject_distinguishing_marks,
    )

    const subject_nationality = clean(
      body.subject_nationality,
    )

    const subject_languages_spoken = clean(
      body.subject_languages_spoken,
    )

    const subject_last_known_address = clean(
      body.subject_last_known_address,
    )

    const subject_last_known_occupation = clean(
      body.subject_last_known_occupation,
    )

    const subject_additional_usernames = clean(
      body.subject_additional_usernames,
    )

    const subject_gaming_ids = clean(
      body.subject_gaming_ids,
    )

    const subject_cryptocurrency_wallets = clean(
      body.subject_cryptocurrency_wallets,
    )

    const subject_domain_names = clean(
      body.subject_domain_names,
    )

    const subject_ip_addresses = clean(
      body.subject_ip_addresses,
    )

    const subject_vehicle_registration = clean(
      body.subject_vehicle_registration,
    )

    /* ========================================================
       SUPPORTING LINKS
    ======================================================== */

    const supporting_links = safeJsonArray(
      body.supporting_links,
    )

    /* ========================================================
       EVIDENCE
       
       The form currently sends evidence_files.
       Database column is evidence_uploads.
       
       At this stage we store metadata only.
       Actual binary files should be uploaded to storage
       separately.
    ======================================================== */

    const evidence_uploads = safeJsonArray(
      body.evidence_files ||
        body.evidence_uploads,
    )

    /* ========================================================
       TRAINING
    ======================================================== */

    const training_organization_name = clean(
      body.training_organization_name,
    )

    const training_client_type = clean(
      body.training_client_type ||
        "organization",
    )

    const training_participant_count =
      nullableInteger(
        body.training_participant_count,
      )

    const training_skill_level = clean(
      body.training_skill_level ||
        "beginner",
    )

    const training_topics = clean(
      body.training_topics,
    )

    const training_additional_requirements =
      clean(
        body.training_additional_requirements,
      )

    /* ========================================================
       VALIDATION
    ======================================================== */

    if (!category) {
      return NextResponse.json(
        {
          error: "Service category is required",
        },
        { status: 400 },
      )
    }

    if (!service_type) {
      return NextResponse.json(
        {
          error: "Service type is required",
        },
        { status: 400 },
      )
    }

    if (
      service_type === "custom" &&
      custom_description.length < 10
    ) {
      return NextResponse.json(
        {
          error:
            "Please provide a clear description of your custom service requirement",
        },
        { status: 400 },
      )
    }

    if (
      category === "cybersecurity" &&
      training_goal.length < 5
    ) {
      return NextResponse.json(
        {
          error: "Training goal is required",
        },
        { status: 400 },
      )
    }

    if (
      category === "osint" &&
      description.length < 20
    ) {
      return NextResponse.json(
        {
          error:
            "Investigation description is required",
        },
        { status: 400 },
      )
    }

    if (!authorization_confirmed) {
      return NextResponse.json(
        {
          error:
            "Legal authorization confirmation is required",
        },
        { status: 400 },
      )
    }

    /* ========================================================
       CREATE REQUEST
    ======================================================== */

    const id = crypto.randomUUID()
    const token = nanoid(32)

    const inserted = await query(
      `
      INSERT INTO requests (
        id,
        user_id,
        client_email,
        contact_method,
        token,
        is_anonymous,

        title,
        description,
        service_type,
        status,
        priority,
        timeline,

        investigation_objective,

        subject_type,
        subject_full_name,
        subject_known_usernames,
        subject_emails,
        subject_phone_numbers,
        subject_location,
        subject_organization,
        subject_websites,

        subject_company_name,
        subject_company_website,
        subject_company_country,
        subject_company_industry,

        subject_domain,
        subject_url,
        subject_ip_address,
        subject_platform,

        existing_information,
        investigation_depth,
        confidentiality_level,
        authorization_confirmed,

        subject_approximate_age,
        subject_height,
        subject_weight,
        subject_hair_color,
        subject_eye_color,
        subject_skin_tone,
        subject_distinguishing_marks,
        subject_nationality,
        subject_languages_spoken,
        subject_last_known_address,
        subject_last_known_occupation,

        subject_additional_usernames,
        subject_gaming_ids,
        subject_cryptocurrency_wallets,
        subject_domain_names,
        subject_ip_addresses,
        subject_vehicle_registration,

        supporting_links,
        evidence_uploads,
        additional_notes,

        communication_method,
        communication_email,
        communication_country_code,
        communication_phone,
        communication_whatsapp,
        communication_signal,

        client_country,
        preferred_currency,

        training_organization_name,
        training_client_type,
        training_participant_count,
        training_skill_level,
        training_goal,
        training_topics,
        training_preferred_dates,
        training_additional_requirements,

        custom_description,
        preferred_deadline,
        osint_completion_date,

        created_at,
        updated_at
      )

      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        false,

        $6,
        $7,
        $8,
        'pending_super_admin_review',
        $9,
        $10,

        $11,

        $12,
        $13,
        $14,
        $15,
        $16,
        $17,
        $18,
        $19,

        $20,
        $21,
        $22,
        $23,

        $24,
        $25,
        $26,
        $27,

        $28,
        $29,
        $30,
        $31,

        $32,
        $33,
        $34,
        $35,
        $36,
        $37,
        $38,
        $39,
        $40,
        $41,
        $42,

        $43,
        $44,
        $45,
        $46,
        $47,
        $48,

        $49::jsonb,
        $50::jsonb,
        $51,

        $52,
        $53,
        $54,
        $55,
        $56,
        $57,

        $58,
        $59,

        $60,
        $61,
        $62,
        $63,
        $64,
        $65,
        $66,
        $67,

        $68,
        $69,
        $70,

        NOW(),
        NOW()
      )

      RETURNING
        id,
        case_number,
        status,
        created_at
      `,
      [
        /* 1-10 */
        id,
        user.id,
        user.email,
        contact_method,
        token,

        title,
        description,
        service_type,
        urgency,
        timeline,

        /* 11 */
        investigation_objective,

        /* 12-19 */
        subject_type || null,
        subject_full_name || null,
        subject_known_usernames || null,
        subject_emails || null,
        subject_phone_numbers || null,
        subject_location || null,
        subject_organization || null,
        subject_websites || null,

        /* 20-23 */
        subject_company_name || null,
        subject_company_website || null,
        subject_company_country || null,
        subject_company_industry || null,

        /* 24-27 */
        subject_domain || null,
        subject_url || null,
        subject_ip_address || null,
        subject_platform || null,

        /* 28-31 */
        existing_information || null,
        investigation_depth,
        confidentiality_level,
        authorization_confirmed,

        /* 32-42 */
        subject_approximate_age || null,
        subject_height || null,
        subject_weight || null,
        subject_hair_color || null,
        subject_eye_color || null,
        subject_skin_tone || null,
        subject_distinguishing_marks || null,
        subject_nationality || null,
        subject_languages_spoken || null,
        subject_last_known_address || null,
        subject_last_known_occupation || null,

        /* 43-48 */
        subject_additional_usernames || null,
        subject_gaming_ids || null,
        subject_cryptocurrency_wallets || null,
        subject_domain_names || null,
        subject_ip_addresses || null,
        subject_vehicle_registration || null,

        /* 49-51 */
        JSON.stringify(supporting_links),
        JSON.stringify(evidence_uploads),
        additional_notes || null,

        /* 52-57 */
        communication_method,
        communication_email || null,
        communication_country_code || null,
        communication_phone || null,
        communication_whatsapp || null,
        communication_signal || null,

        /* 58-59 */
        client_country || null,
        preferred_currency,

        /* 60-67 */
        training_organization_name || null,
        training_client_type || null,
        training_participant_count,
        training_skill_level || null,
        training_goal || null,
        training_topics || null,
        training_preferred_dates,
        training_additional_requirements || null,

        /* 68-70 */
        custom_description || null,
        preferred_deadline,
        osint_completion_date,
      ],
    )

    const createdRequest = inserted.rows[0]

    /* ========================================================
       INTERNAL AI ANALYSIS
       
       NEVER return these fields to the client.
    ======================================================== */

    try {
      const analysis = analyzeRequest({
        serviceType: service_type,
        description,
        urgency,
        investigationDepth: investigation_depth,
        confidentialityLevel: confidentiality_level,
        subjectType: subject_type,
      })

      const aiPrice = Number(
        analysis.suggestedPrice,
      )

      const aiHours = Number(
        analysis.estimatedHours,
      )

      const aiConfidence = Number(
        analysis.confidence,
      )

      /* ======================================================
         VALIDATE AI RESULT
      ====================================================== */

      if (
        !Number.isFinite(aiPrice) ||
        aiPrice <= 0
      ) {
        throw new Error(
          `Invalid AI price returned: ${analysis.suggestedPrice}`,
        )
      }

      if (
        !Number.isFinite(aiHours) ||
        aiHours <= 0
      ) {
        throw new Error(
          `Invalid AI estimated hours: ${analysis.estimatedHours}`,
        )
      }

      if (
        !Number.isFinite(aiConfidence) ||
        aiConfidence < 0 ||
        aiConfidence > 1
      ) {
        throw new Error(
          `Invalid AI confidence: ${analysis.confidence}`,
        )
      }

      /* ======================================================
         SAVE AI ANALYSIS
      ====================================================== */

      const aiUpdate = await query(
        `
        UPDATE requests
        SET
          ai_analysis = $2,
          ai_price_estimate = $3::numeric,
          ai_status = $4,
          ai_complexity = $5,
          ai_estimated_hours = $6::numeric,
          ai_suggested_service = $7,
          ai_suggested_priority = $8,
          ai_confidence = $9::numeric,
          ai_reasoning = $10,
          updated_at = NOW()

        WHERE id = $1

        RETURNING
          id,
          ai_price_estimate,
          ai_status,
          ai_complexity,
          ai_estimated_hours,
          ai_suggested_service,
          ai_suggested_priority,
          ai_confidence,
          ai_reasoning
        `,
        [
          id,
          JSON.stringify(analysis),
          aiPrice,
          "analyzed",
          analysis.complexity,
          aiHours,
          analysis.suggestedService,
          analysis.suggestedPriority,
          aiConfidence,
          analysis.reasoning,
        ],
      )

      const savedAI = aiUpdate.rows[0]

      console.log(
        "AI DATABASE UPDATE RESULT:",
        savedAI,
      )

      if (!savedAI) {
        throw new Error(
          "AI analysis update affected zero rows",
        )
      }

      console.log(
        "AI ANALYSIS SAVED SUCCESSFULLY",
      )
    } catch (analysisError) {
      console.error(
        "====================================",
      )

      console.error(
        "REQUEST AI ANALYSIS ERROR:",
        analysisError,
      )

      console.error(
        "====================================",
      )
    }

    /* ========================================================
       AUDIT
    ======================================================== */

    await recordRequestAudit(
      id,
      user.id,
      "client_request_created",
      {
        status:
          "pending_super_admin_review",
      },
    )

    /* ========================================================
       ADMIN NOTIFICATION
    ======================================================== */

    await notifyAdmins({
      type: "new_request",
      title: "New client request",
      message: `${title} requires review.`,
      metadata: {
        request_id: id,
        target_page: "admin_request_review",
        action: "view_request",
      },
    })

    /* ========================================================
       GENERAL AUDIT LOG
    ======================================================== */

    await auditLog(
      user.id,
      "client_request_created",
      request,
      {
        request_id: id,
        service_type,
      },
    )

    /* ========================================================
       CLIENT RESPONSE
       
       Deliberately return only safe creation data.
    ======================================================== */

    return NextResponse.json(
      {
        success: true,
        request: createdRequest,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error(
      "CLIENT REQUEST POST ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to create request",
      },
      {
        status: 500,
      },
    )
  }
}