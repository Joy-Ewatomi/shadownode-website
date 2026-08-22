import { nanoid } from "nanoid"
import { NextRequest, NextResponse } from "next/server"

import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { analyzeRequest } from "@/lib/services/request-analysis-service"
import { notifyAdmins } from "@/lib/services/notification-service"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"

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

// ============================================================
// GET CLIENT REQUESTS
// IMPORTANT:
// Never return AI/internal pricing or internal review metadata.
// ============================================================

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

        /*
         * ONLY FINAL CLIENT-FACING QUOTE DATA
         */
        approved_quote_amount,
        approved_quote_currency,
        approved_quote_notes,
        approved_estimated_completion,

        /*
         * Training dates are client-facing.
         */
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

    /*
     * Explicitly map the response.
     *
     * This prevents accidental exposure of internal
     * columns if the database schema changes later.
     */
    const requests = result.rows.map((row) => ({
      id: row.id,
      case_number: row.case_number ?? null,
      title: row.title ?? null,
      service_type: row.service_type ?? null,
      description: row.description ?? null,
      status: row.status ?? "pending_admin_review",
      priority: row.priority ?? null,
      timeline: row.timeline ?? null,

      approved_quote_amount:
        row.approved_quote_amount ?? null,

      approved_quote_currency:
        row.approved_quote_currency ?? null,

      approved_quote_notes:
        row.approved_quote_notes ?? null,

      approved_estimated_completion:
        row.approved_estimated_completion ?? null,

      training_preferred_start_date:
        row.training_preferred_start_date ?? null,

      training_preferred_completion_date:
        row.training_preferred_completion_date ?? null,

      training_timeline_flexible:
        row.training_timeline_flexible ?? null,

      created_at: row.created_at,
      updated_at: row.updated_at,
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

// ============================================================
// CREATE CLIENT REQUEST
// ============================================================

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

    // ========================================================
    // COMMON
    // ========================================================

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

    // ========================================================
    // TIMELINE
    // ========================================================

    const preferred_deadline = clean(
      body.preferred_deadline,
    )

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

    // ========================================================
    // COMMUNICATION
    // ========================================================

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

    // ========================================================
    // OSINT SUBJECT
    // ========================================================

    const subject_type = clean(
      body.subject_type,
    )

    // ========================================================
    // TRAINING
    // ========================================================

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

    // ========================================================
    // VALIDATION
    // ========================================================

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

    // ========================================================
    // CONTINUE WITH YOUR EXISTING INSERT / ANALYSIS WORKFLOW
    // ========================================================
    //
    // KEEP YOUR EXISTING POST IMPLEMENTATION BELOW THIS POINT.
    //
    // The important security change is the GET endpoint above:
    // AI pricing/internal review fields are NEVER returned to clients.
    //
    // ========================================================

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
        existing_information,
        investigation_depth,
        confidentiality_level,
        authorization_confirmed,

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
        training_topics,
        training_additional_requirements,
        training_preferred_dates,

        additional_notes,
        custom_description,
        preferred_deadline,

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

        NOW(),
        NOW()
      )
      RETURNING id, case_number, status, created_at
      `,
      [
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

        investigation_objective,
        subject_type,
        existing_information,
        investigation_depth,
        confidentiality_level,
        authorization_confirmed,

        communication_method,
        communication_email || null,
        communication_country_code || null,
        communication_phone || null,
        communication_whatsapp || null,
        communication_signal || null,

        client_country || null,
        preferred_currency,

        training_organization_name || null,
        training_client_type || null,
        training_participant_count,
        training_skill_level || null,
        training_topics || null,
        training_additional_requirements || null,
        training_preferred_dates,

        additional_notes || null,
        custom_description || null,
        preferred_deadline || null,
      ],
    )

    const createdRequest = inserted.rows[0]

    // ========================================================
    // INTERNAL AI ANALYSIS
    //
    // AI may calculate internal pricing here.
    // It is NOT returned to the client.
    // ========================================================


   try {
  const analysis = analyzeRequest({
    serviceType: service_type,
    description,
    urgency,
    investigationDepth: investigation_depth,
    confidentialityLevel: confidentiality_level,
    subjectType: subject_type,
  })

  const aiPrice = Number(analysis.suggestedPrice)
  const aiHours = Number(analysis.estimatedHours)
  const aiConfidence = Number(analysis.confidence)

  // ========================================================
  // VALIDATE AI RESULT
  // ========================================================

  if (!Number.isFinite(aiPrice) || aiPrice <= 0) {
    throw new Error(
      `Invalid AI price returned: ${analysis.suggestedPrice}`,
    )
  }

  if (!Number.isFinite(aiHours) || aiHours <= 0) {
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

  // ========================================================
  // LOG AI RESULT
  // ========================================================

  console.log("====================================")
  console.log("AI ANALYSIS RESULT")
  console.log("Request ID:", id)
  console.log("Service Type:", service_type)
  console.log("Suggested Service:", analysis.suggestedService)
  console.log("Suggested Price:", analysis.suggestedPrice)
  console.log("AI Price:", aiPrice)
  console.log("Complexity:", analysis.complexity)
  console.log("Estimated Hours:", aiHours)
  console.log("Priority:", analysis.suggestedPriority)
  console.log("Confidence:", aiConfidence)
  console.log("====================================")

  // ========================================================
  // SAVE COMPLETE AI ANALYSIS
  // ========================================================

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

  // ========================================================
  // VERIFY DATABASE UPDATE
  // ========================================================

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

  console.log("AI ANALYSIS SAVED SUCCESSFULLY")

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

    await recordRequestAudit(
      id,
      user.id,
      "client_request_created",
      {
        status: "pending_super_admin_review",
      },
    )

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

    await auditLog(
      user.id,
      "client_request_created",
      request,
      {
        request_id: id,
        service_type,
      },
    )

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
      { status: 500 },
    )
  }
}