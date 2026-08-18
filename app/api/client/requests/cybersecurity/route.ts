import { nanoid } from "nanoid"
import { NextRequest, NextResponse } from "next/server"

import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { createQuoteVersion } from "@/lib/services/quote-version-service"
import { analyzeRequest } from "@/lib/services/request-analysis-service"
import { notifyAdmins } from "@/lib/services/notification-service"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"

// ============================================================
// HELPERS
// ============================================================

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function nullableString(value: unknown): string | null {
  const result = clean(value)
  return result || null
}

function nullableDate(value: unknown): string | null {
  const result = clean(value)
  return result || null
}

function nullableInteger(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null
  }

  const parsed = Number.parseInt(
    String(value),
    10,
  )

  return Number.isFinite(parsed)
    ? parsed
    : null
}

function arrayToText(value: unknown): string {
  if (!Array.isArray(value)) {
    return clean(value)
  }

  return value
    .filter(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0,
    )
    .map((item) => item.trim())
    .join(", ")
}

function combineText(
  ...values: Array<unknown>
): string {
  return values
    .map((value) => clean(value))
    .filter(Boolean)
    .join("\n")
}

// ============================================================
// POST CLIENT CYBERSECURITY TRAINING REQUEST
// ============================================================

export async function POST(
  request: NextRequest,
) {
  try {
    // ========================================================
    // AUTHENTICATION
    // ========================================================

    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      )
    }

    if (user.role !== "client") {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        },
      )
    }

    // ========================================================
    // BODY
    // ========================================================

    const body = await request.json()

    console.log(
      "=== CREATING CYBERSECURITY TRAINING REQUEST ===",
      {
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
      },
    )

    // ========================================================
    // SERVICE
    // ========================================================

    const category = clean(
      body.category || "cybersecurity",
    )

    const service_type = clean(
      body.service_type,
    )

    const custom_description = clean(
      body.custom_description,
    )

    // ========================================================
    // TRAINING ORGANIZATION
    // ========================================================

    const training_organization_name =
      clean(
        body.training_organization_name,
      )

    const training_client_type =
      clean(
        body.training_client_type ||
          "organization",
      )

    const training_participant_count =
      nullableInteger(
        body.training_participant_count,
      )

    const training_skill_level =
      clean(
        body.training_skill_level ||
          "beginner",
      )

    // ========================================================
    // TRAINING AUDIENCE / INDUSTRY
    //
    // These do NOT have dedicated DB columns.
    // We preserve them inside training_additional_requirements.
    // ========================================================

    const training_audience =
      clean(body.training_audience)

    const training_industry =
      clean(body.training_industry)

    const custom_industry =
      clean(body.custom_industry)

    const custom_training_audience =
      clean(
        body.custom_training_audience,
      )

    const finalTrainingAudience =
      training_audience === "custom"
        ? custom_training_audience
        : training_audience

    const finalTrainingIndustry =
      training_industry === "custom"
        ? custom_industry
        : training_industry

    // ========================================================
    // TRAINING GOALS
    // ========================================================

    const training_goal =
      clean(body.training_goal)

    const training_objective =
      clean(body.training_objective)

    const custom_training_objective =
      clean(
        body.custom_training_objective,
      )

    const finalTrainingObjective =
      training_objective === "custom"
        ? custom_training_objective
        : training_objective

    // ========================================================
    // TOPICS
    // ========================================================

    const training_topics_selected =
      arrayToText(
        body.training_topics_selected,
      )

    const training_objectives =
      arrayToText(
        body.training_objectives,
      )

    const training_custom_topic =
      clean(
        body.training_custom_topic,
      )

    const training_topics = combineText(
      training_topics_selected,
      training_custom_topic
        ? `Custom topic: ${training_custom_topic}`
        : "",
      training_objectives
        ? `Learning objectives: ${training_objectives}`
        : "",
    )

    // ========================================================
    // TRAINING FORMAT / DURATION
    //
    // These don't have dedicated DB columns.
    // They are preserved in training_additional_requirements.
    // ========================================================

    const training_format =
      clean(body.training_format)

    const training_duration =
      clean(body.training_duration)

    const custom_sessions_per_week =
      clean(
        body.custom_sessions_per_week,
      )

    const custom_hours_per_session =
      clean(
        body.custom_hours_per_session,
      )

    const custom_training_days =
      arrayToText(
        body.custom_training_days,
      )

    const custom_session_time =
      clean(body.custom_session_time)

    const custom_training_period =
      clean(
        body.custom_training_period,
      )

    // ========================================================
    // MATERIALS / COMPLIANCE
    // ========================================================

    const training_materials =
      arrayToText(
        body.training_materials,
      )

    const training_compliance =
      arrayToText(
        body.training_compliance,
      )

    const training_certificate =
      clean(
        body.training_certificate,
      )

    const training_expected_outcome =
      arrayToText(
        body.training_expected_outcome,
      )

    const custom_expected_outcome =
      clean(
        body.custom_expected_outcome,
      )

    const training_assessment_required =
      body.training_assessment_required ===
      true

    const training_labs_required =
      body.training_labs_required === true

    // ========================================================
    // TRAINING DATES
    //
    // DB has ONLY:
    // training_preferred_dates
    //
    // It does NOT have separate start/completion columns.
    // ========================================================

    const training_preferred_start_date =
      nullableDate(
        body.training_preferred_start_date,
      )

    const training_preferred_completion_date =
      nullableDate(
        body.training_preferred_completion_date,
      )

    const training_timeline_flexible =
      body.training_timeline_flexible ===
      true

    const training_preferred_dates =
      combineText(
        training_preferred_start_date
          ? `Start date: ${training_preferred_start_date}`
          : "",
        training_preferred_completion_date
          ? `Completion date: ${training_preferred_completion_date}`
          : "",
        `Timeline flexible: ${
          training_timeline_flexible
            ? "Yes"
            : "No"
        }`,
      )

    // ========================================================
    // ADDITIONAL REQUIREMENTS
    //
    // Several frontend fields don't have dedicated columns.
    // We preserve them here instead of losing the information.
    // ========================================================

    const frontendAdditionalRequirements =
      clean(
        body.training_additional_requirements,
      )

    const trainingAdditionalRequirements =
      combineText(
        frontendAdditionalRequirements
          ? `Additional requirements:\n${frontendAdditionalRequirements}`
          : "",

        finalTrainingAudience
          ? `Training audience: ${finalTrainingAudience}`
          : "",

        finalTrainingIndustry
          ? `Industry: ${finalTrainingIndustry}`
          : "",

        finalTrainingObjective
          ? `Training objective: ${finalTrainingObjective}`
          : "",

        training_format
          ? `Training format: ${training_format}`
          : "",

        training_duration
          ? `Training duration: ${training_duration}`
          : "",

        custom_sessions_per_week
          ? `Sessions per week: ${custom_sessions_per_week}`
          : "",

        custom_hours_per_session
          ? `Hours per session: ${custom_hours_per_session}`
          : "",

        custom_training_days
          ? `Training days: ${custom_training_days}`
          : "",

        custom_session_time
          ? `Session time: ${custom_session_time}`
          : "",

        custom_training_period
          ? `Training period: ${custom_training_period}`
          : "",

        training_materials
          ? `Materials: ${training_materials}`
          : "",

        training_compliance
          ? `Compliance requirements: ${training_compliance}`
          : "",

        training_certificate
          ? `Certificate: ${training_certificate}`
          : "",

        training_expected_outcome
          ? `Expected outcomes: ${training_expected_outcome}`
          : "",

        custom_expected_outcome
          ? `Custom expected outcome: ${custom_expected_outcome}`
          : "",

        `Assessment required: ${
          training_assessment_required
            ? "Yes"
            : "No"
        }`,

        `Labs required: ${
          training_labs_required
            ? "Yes"
            : "No"
        }`,
      )

    // ========================================================
    // DESCRIPTION
    // ========================================================

    const description = combineText(
      training_goal
        ? `Training goal: ${training_goal}`
        : "",

      finalTrainingObjective
        ? `Training objective: ${finalTrainingObjective}`
        : "",

      training_topics
        ? `Training topics:\n${training_topics}`
        : "",

      trainingAdditionalRequirements,
    )

    const title = clean(
      body.title ||
        custom_description ||
        training_goal ||
        "Cybersecurity Training Request",
    )

    const urgency = clean(
      body.urgency || "normal",
    )

    const existing_information =
      clean(
        body.existing_information,
      )

    const investigation_depth =
      clean(
        body.investigation_depth ||
          "standard",
      )

    const confidentiality_level =
      clean(
        body.confidentiality_level ||
          "standard",
      )

    const authorization_confirmed =
      body.authorization_confirmed ===
      true

    // ========================================================
    // COMMUNICATION
    // ========================================================

    const contact_method = clean(
      body.contact_method ||
        body.communication_method ||
        body.communication_channel ||
        "portal_notification",
    )

    const communication_method =
      clean(
        body.communication_method ||
          body.communication_channel ||
          contact_method,
      )

    const communication_email =
      clean(
        body.communication_email,
      )

    const communication_country_code =
      clean(
        body.communication_country_code,
      )

    const communication_phone =
      clean(
        body.communication_phone,
      )

    const communication_whatsapp =
      clean(
        body.communication_whatsapp,
      )

    const communication_signal =
      clean(
        body.communication_signal,
      )

    // ========================================================
    // COUNTRY / CURRENCY
    // ========================================================

    let client_country =
      clean(body.client_country)

    const custom_country =
      clean(body.custom_country)

    if (
      client_country === "custom" &&
      custom_country
    ) {
      client_country = custom_country
    }

    const preferred_currency =
      clean(
        body.preferred_currency ||
          body.currency ||
          "USD",
      )

    // ========================================================
    // VALIDATION
    // ========================================================

    if (!service_type) {
      return NextResponse.json(
        {
          error:
            "Training service type is required",
        },
        {
          status: 400,
        },
      )
    }

    if (
      description.trim().length < 20
    ) {
      return NextResponse.json(
        {
          error:
            "Please provide enough training details",
        },
        {
          status: 400,
        },
      )
    }

    if (
      !training_goal &&
      !finalTrainingObjective
    ) {
      return NextResponse.json(
        {
          error:
            "Training goal or objective is required",
        },
        {
          status: 400,
        },
      )
    }

    if (
      !training_preferred_start_date
    ) {
      return NextResponse.json(
        {
          error:
            "Preferred training start date is required",
        },
        {
          status: 400,
        },
      )
    }

    if (!client_country) {
      return NextResponse.json(
        {
          error: "Country is required",
        },
        {
          status: 400,
        },
      )
    }

    if (!communication_method) {
      return NextResponse.json(
        {
          error:
            "Communication method is required",
        },
        {
          status: 400,
        },
      )
    }

    if (
      communication_method === "email" &&
      !communication_email
    ) {
      return NextResponse.json(
        {
          error:
            "Communication email is required",
        },
        {
          status: 400,
        },
      )
    }

    if (
      communication_method === "whatsapp" &&
      !communication_whatsapp
    ) {
      return NextResponse.json(
        {
          error:
            "WhatsApp number is required",
        },
        {
          status: 400,
        },
      )
    }

    if (
      communication_method === "signal" &&
      !communication_signal
    ) {
      return NextResponse.json(
        {
          error:
            "Signal contact is required",
        },
        {
          status: 400,
        },
      )
    }

    if (!authorization_confirmed) {
      return NextResponse.json(
        {
          error:
            "You must confirm lawful authorization for this request",
        },
        {
          status: 400,
        },
      )
    }

    // ========================================================
    // TRACKING NUMBER
    // ========================================================

    const year =
      new Date().getFullYear()

    const existing =
      await query<{
        total: string | number
      }>(
        `
        SELECT COUNT(*) AS total
        FROM requests
        WHERE created_at >= $1
          AND created_at < $2
        `,
        [
          `${year}-01-01`,
          `${year + 1}-01-01`,
        ],
      )

    const nextNumber =
      Number(
        existing.rows[0]?.total || 0,
      ) + 1

    const trackingNumber =
      `SOB-${year}-${String(
        nextNumber,
      ).padStart(6, "0")}`

    // ========================================================
    // AI ANALYSIS
    // ========================================================

    const analysis =
      analyzeRequest({
        serviceType: service_type,
        description,
        urgency,
        timeline:
          training_preferred_completion_date
            ? "deadline"
            : urgency,
        investigationDepth:
          investigation_depth,
        confidentialityLevel:
          confidentiality_level,
        subjectType:
          "organization",
      })

    const aiAnalysis =
      JSON.stringify(analysis)

    const aiStatus = "analyzed"

    const timeline =
      training_preferred_completion_date
        ? "deadline"
        : urgency

// ========================================================
// TRAINING DETAILS
// ========================================================

const trainingDetails = {
  audience:
    body.training_audience ?? null,

  custom_audience:
    body.custom_training_audience ?? null,

  industry:
    body.training_industry ?? null,

  custom_industry:
    body.custom_industry ?? null,

  objective:
    body.training_objective ?? null,

  objectives:
    body.training_objectives ?? [],

  custom_objective:
    body.custom_training_objective ?? null,

  topics:
    body.training_topics_selected ?? [],

  custom_topic:
    body.training_custom_topic ?? null,

  format:
    body.training_format ?? null,

  duration:
    body.training_duration ?? null,

  custom_schedule: {
    sessions_per_week:
      body.custom_sessions_per_week ?? null,

    hours_per_session:
      body.custom_hours_per_session ?? null,

    training_days:
      body.custom_training_days ?? [],

    session_time:
      body.custom_session_time ?? null,

    training_period:
      body.custom_training_period ?? null,
  },

  materials:
    body.training_materials ?? [],

  compliance:
    body.training_compliance ?? [],


  expected_outcomes:
    body.training_expected_outcome ?? [],

  custom_expected_outcome:
    body.custom_expected_outcome ?? null,
}

// ========================================================
// JSONB
// ========================================================

const supportingLinks =
  JSON.stringify(body.supporting_links ?? [])

const evidenceUploads =
  JSON.stringify(body.evidence_files ?? [])

    // ========================================================
    // OPTIONAL FINANCIAL
    // ========================================================

    const finalPrice =
      body.final_price !==
        undefined &&
      body.final_price !== null &&
      body.final_price !== ""
        ? Number(body.final_price)
        : null

    const priceNotes =
      nullableString(
        body.price_notes,
      )
      
    

    // ========================================================
    // INSERT
    //
    // ONLY COLUMNS THAT EXIST IN YOUR
    // CURRENT requests TABLE ARE USED.
    // ========================================================

   const inserted =
  await query<{
    id: string
    case_number: string
  }>(
    `
    INSERT INTO requests (
      user_id,
      client_email,
      contact_method,
      token,
      is_anonymous,
      case_number,

      title,
      description,
      custom_description,
      service_type,
      status,

      final_price,
      price_notes,

      ai_analysis,
      ai_price_estimate,
      ai_status,
      ai_complexity,
      ai_estimated_hours,
      ai_suggested_service,
      ai_suggested_priority,
      ai_confidence,
      ai_reasoning,

      created_at,
      updated_at,

      currency,
      priority,

      preferred_deadline,

      investigation_objective,
      subject_type,

      subject_company_name,
      subject_company_country,
      subject_company_industry,

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

      supporting_links,
      evidence_uploads,
      additional_notes,

      training_organization_name,
      training_client_type,
      training_participant_count,
      training_skill_level,
      training_goal,
      training_topics,
      training_preferred_dates,
      training_additional_requirements,

      timeline
    )

    VALUES (
      $1,
      $2,
      $3,
      $4,
      false,
      $5,

      $6,
      $7,
      $8,
      $9,
      'pending_review',

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

      NOW(),
      NOW(),

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
      $49,
      $50,
      $51,

      $52
    )

    RETURNING id, case_number
    `,
    [
      // ==================================================
      // 1-9 BASIC REQUEST
      // ==================================================

      user.id,
      user.email,
      contact_method,
      nanoid(32),
      trackingNumber,

      title,
      description,
      nullableString(custom_description),
      service_type,

      // ==================================================
      // 10-11 FINANCIAL
      // ==================================================

      finalPrice,
      priceNotes,

      // ==================================================
      // 12-20 AI ANALYSIS
      // ==================================================

      aiAnalysis,
      Number(analysis.suggestedPrice),
      aiStatus,
      analysis.complexity,
      Number(analysis.estimatedHours),
      analysis.suggestedService,
      analysis.suggestedPriority,
      Number(analysis.confidence),
      analysis.reasoning,

      // ==================================================
      // 21-22 CURRENCY / PRIORITY
      // ==================================================

      preferred_currency,
      analysis.suggestedPriority,

      // ==================================================
      // 23 DEADLINE
      // ==================================================

      training_preferred_completion_date ||
        training_preferred_start_date,

      // ==================================================
      // 24-25 INVESTIGATION
      // ==================================================

      nullableString(
        training_goal ||
          finalTrainingObjective,
      ),

      "organization",

      // ==================================================
      // 26-28 ORGANIZATION
      // ==================================================

      nullableString(
        training_organization_name,
      ),

      client_country,

      finalTrainingIndustry || null,

      // ==================================================
      // 29-30 EXISTING INFORMATION
      // ==================================================

      nullableString(
        existing_information,
      ),

      investigation_depth,

      // ==================================================
      // 31-32 SECURITY
      // ==================================================

      confidentiality_level,

      authorization_confirmed,

      // ==================================================
      // 33-38 COMMUNICATION
      // ==================================================

      communication_method,

      nullableString(
        communication_email,
      ),

      nullableString(
        communication_country_code,
      ),

      nullableString(
        communication_phone,
      ),

      nullableString(
        communication_whatsapp,
      ),

      nullableString(
        communication_signal,
      ),

      // ==================================================
      // 39-40 COUNTRY / CURRENCY
      // ==================================================

      client_country,

      preferred_currency,

      // ==================================================
      // 41-43 JSON / NOTES
      // ==================================================

      supportingLinks,

      evidenceUploads,

      nullableString(
        trainingAdditionalRequirements,
      ),

      // ==================================================
      // 44-51 TRAINING
      // ==================================================

      nullableString(
        training_organization_name,
      ),

      nullableString(
        training_client_type,
      ),

      training_participant_count,

      nullableString(
        training_skill_level,
      ),

      nullableString(
        training_goal,
      ),

      nullableString(
        training_topics,
      ),

      nullableString(
        training_preferred_dates,
      ),

      nullableString(
        trainingAdditionalRequirements,
      ),

      // ==================================================
      // 52 TIMELINE
      // ==================================================

      timeline,
    ],
  )
    console.log(
      "=== CYBERSECURITY REQUEST INSERTED ===",
      inserted.rows[0],
    )

    // ========================================================
    // REQUEST ID
    // ========================================================

    const requestId =
      inserted.rows[0].id

    // ========================================================
    // CREATE AI QUOTE VERSION
    // ========================================================

    await createQuoteVersion({
      requestId,
      userId: user.id,
      role: "ai",
      source: "ai",
      price: Number(
        analysis.suggestedPrice,
      ),
      currency: preferred_currency,
      estimated_completion:
        training_preferred_completion_date ||
        training_preferred_start_date,
      reasoning:
        analysis.reasoning,
      status: "generated",
    })

    // ========================================================
    // NOTIFY ADMINS
    // ========================================================

    await notifyAdmins({
      type: "client_request",

      title:
        "New cybersecurity training request",

      message:
        `${user.username || user.email} submitted ` +
        `${title} (${trackingNumber}) - ` +
        `${service_type}`,

      metadata: {
        request_id: requestId,
        target_page:
          "admin_request_review",
        action: "review_request",
        category: "cybersecurity",
      },
    })

    // ========================================================
    // REQUEST AUDIT
    // ========================================================

    await recordRequestAudit(
      requestId,
      user.id,
      "ai_estimate_generated",
      {
        suggested_price:
          analysis.suggestedPrice,

        confidence:
          analysis.confidence,

        category: "cybersecurity",
        service_type,
      },
    )

    // ========================================================
    // AUDIT LOG
    //
    // IMPORTANT:
    // auditLog expects the actual Request object,
    // NOT requestId.
    // ========================================================

    await auditLog(
      user.id,
      "client_request_created",
      request,
      {
        request_id: requestId,
        service_type,
        category: "cybersecurity",
      },
    )

    // ========================================================
    // RETURN CREATED REQUEST
    // ========================================================

const created = await query(
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

    preferred_deadline,

    investigation_objective,
    subject_type,

    subject_company_name,
    subject_company_website,
    subject_company_country,
    subject_company_industry,

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

    supporting_links,
    evidence_uploads,
    additional_notes,

    training_organization_name,
    training_client_type,
    training_participant_count,
    training_skill_level,
    training_goal,
    training_topics,
    training_preferred_dates,
    training_additional_requirements,
    training_details,

    quote_sent_at,
    client_decision_at,
    declined_reason,

    created_at,
    updated_at

  FROM requests

  WHERE id = $1
    AND user_id = $2

  LIMIT 1
  `,
  [requestId, user.id],
)

if (!created.rows[0]) {
  throw new Error("Request was created but could not be loaded")
}

return NextResponse.json(
  created.rows[0],
  {
    status: 201,
  },
)
  } catch (error) {
    console.error(
      "CYBERSECURITY REQUEST POST ERROR",
      error,
    )

    if (error instanceof Error) {
      console.error(
        "MESSAGE:",
        error.message,
      )

      console.error(
        "STACK:",
        error.stack,
      )
    }

    return NextResponse.json(
      {
        error:
          "Failed to create cybersecurity training request",

        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      },
    )
  }
}