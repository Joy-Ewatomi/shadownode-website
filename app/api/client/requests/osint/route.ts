import { nanoid } from "nanoid"
import { NextRequest, NextResponse } from "next/server"

import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { createQuoteVersion } from "@/lib/services/quote-version-service"
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

function nullableDate(value: unknown): string | null {
  const result = clean(value)
  return result || null
}

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

    /*
     * ========================================================
     * OSINT ONLY
     * ========================================================
     */

    const service_type = clean(
      body.service_type || "osint",
    )

    const custom_description = clean(
      body.custom_description,
    )

    const investigation_objective = clean(
      body.investigation_objective,
    )

    const description = clean(
      body.description ||
        custom_description ||
        investigation_objective,
    )

    const title = clean(
      body.title ||
        custom_description ||
        investigation_objective ||
        "OSINT Investigation Request",
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

    const preferred_deadline =
      nullableDate(body.preferred_deadline)

    /*
     * ========================================================
     * COMMUNICATION
     * ========================================================
     */

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

    /*
     * ========================================================
     * SUBJECT
     * ========================================================
     */

    const subject_type = clean(
      body.subject_type,
    )

    /*
     * ========================================================
     * VALIDATION
     * ========================================================
     */

    if (description.length < 20) {
      return NextResponse.json(
        {
          error:
            "Investigation description is required",
        },
        { status: 400 },
      )
    }

    if (!client_country) {
      return NextResponse.json(
        {
          error: "Country is required",
        },
        { status: 400 },
      )
    }

    if (!communication_method) {
      return NextResponse.json(
        {
          error:
            "Communication method is required",
        },
        { status: 400 },
      )
    }

    if (!authorization_confirmed) {
      return NextResponse.json(
        {
          error:
            "You must confirm lawful authorization for this request",
        },
        { status: 400 },
      )
    }

    /*
     * ========================================================
     * TRACKING NUMBER
     * ========================================================
     */

    const year = new Date().getFullYear()

    const existing = await query<{
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
      Number(existing.rows[0]?.total || 0) + 1

    const trackingNumber =
      `SOB-${year}-${String(nextNumber).padStart(6, "0")}`

    /*
     * ========================================================
     * AI ANALYSIS
     * ========================================================
     */

    const analysis = analyzeRequest({
      serviceType: service_type,
      description:
        `${investigation_objective} ${description}`,
      urgency,
      timeline:
        preferred_deadline
          ? "deadline"
          : urgency,
      investigationDepth:
        investigation_depth,
      confidentialityLevel:
        confidentiality_level,
      subjectType:
        subject_type,
    })

    const aiAnalysis =
      JSON.stringify(analysis)

    const aiStatus = "analyzed"

    const timeline =
      preferred_deadline
        ? "deadline"
        : urgency

    /*
     * ========================================================
     * JSONB
     * ========================================================
     */

    const supportingLinks =
      body.supporting_links
        ? JSON.stringify(body.supporting_links)
        : "[]"

    const evidenceUploads =
      body.evidence_files
        ? JSON.stringify(body.evidence_files)
        : "[]"

    /*
     * ========================================================
     * FINANCIAL
     * ========================================================
     */

    const finalPrice =
      body.final_price !== undefined &&
      body.final_price !== null &&
      body.final_price !== ""
        ? Number(body.final_price)
        : null

    const priceNotes =
      nullableString(body.price_notes)

    /*
     * ========================================================
     * INSERT OSINT REQUEST
     * ========================================================
     */

   const inserted = await query<{
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

      created_at,
      updated_at,

      currency,
      priority,

      approved_quote_amount,
      approved_quote_currency,
      approved_quote_notes,
      approved_estimated_completion,

      quote_sent_at,
      client_decision_at,
      declined_reason,

      preferred_deadline,

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

      NULL,
      $10,
      $11,

      NOW(),
      NOW(),

      $12,
      $13,

      NULL,
      NULL,
      NULL,
      NULL,

      NULL,
      NULL,
      NULL,

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
      $49,
      $50,
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

      $64
    )

    RETURNING
      id,
      case_number
  `,
  [
    // 1-5
    user.id,
    user.email,
    contact_method,
    nanoid(32),
    trackingNumber,

    // 6-9
    title,
    description,
    nullableString(custom_description),
    service_type,

    // 10-11
    priceNotes,
    aiAnalysis,

    // 12-13
    preferred_currency,
    analysis.suggestedPriority,

    // 14
    preferred_deadline,

    // 15-16
    nullableString(investigation_objective),
    nullableString(subject_type),

    // 17-23 SUBJECT
    nullableString(body.subject_full_name),
    nullableString(body.subject_known_usernames),
    nullableString(body.subject_emails),
    nullableString(body.subject_phone_numbers),
    nullableString(body.subject_location),
    nullableString(body.subject_organization),
    nullableString(body.subject_websites),

    // 24-27 COMPANY
    nullableString(body.subject_company_name),
    nullableString(body.subject_company_website),
    nullableString(body.subject_company_country),
    nullableString(body.subject_company_industry),

    // 28-31 TECHNICAL SUBJECT
    nullableString(body.subject_domain),
    nullableString(body.subject_url),
    nullableString(body.subject_ip_address),
    nullableString(body.subject_platform),

    // 32-33 INVESTIGATION
    nullableString(existing_information),
    investigation_depth,

    // 34-35 SECURITY
    confidentiality_level,
    authorization_confirmed,

    // 36-41 COMMUNICATION
    communication_method,
    nullableString(communication_email),
    nullableString(communication_country_code),
    nullableString(communication_phone),
    nullableString(communication_whatsapp),
    nullableString(communication_signal),

    // 42-43 CLIENT
    client_country,
    preferred_currency,

    // 44-46 JSON / NOTES
    supportingLinks,
    evidenceUploads,
    nullableString(additional_notes),

    // 47-63 SUBJECT DETAILS
    nullableString(body.subject_approximate_age),
    nullableString(body.subject_height),
    nullableString(body.subject_weight),
    nullableString(body.subject_hair_color),
    nullableString(body.subject_eye_color),
    nullableString(body.subject_skin_tone),
    nullableString(body.subject_distinguishing_marks),
    nullableString(body.subject_nationality),
    nullableString(body.subject_languages_spoken),
    nullableString(body.subject_last_known_address),
    nullableString(body.subject_last_known_occupation),
    nullableString(body.subject_additional_usernames),
    nullableString(body.subject_gaming_ids),
    nullableString(body.subject_cryptocurrency_wallets),
    nullableString(body.subject_domain_names),
    nullableString(body.subject_ip_addresses),
    nullableString(body.subject_vehicle_registration),

    // 64
    timeline,
  ],
)

    const requestId =
      inserted.rows[0].id

    /*
     * ========================================================
     * AI QUOTE
     * ========================================================
     */

    await createQuoteVersion({
      requestId,
      userId: user.id,
      role: "ai",
      source: "ai",
      price: Number(analysis.suggestedPrice),
      currency: preferred_currency,
      estimated_completion: preferred_deadline,
      reasoning: analysis.reasoning,
      status: "generated",
    })

    /*
     * ========================================================
     * ADMIN NOTIFICATION
     * ========================================================
     */

    await notifyAdmins({
      type: "client_request",
      title: "New OSINT investigation request",
      message:
        `${user.username || user.email} submitted ` +
        `${title} (${trackingNumber}) - ${service_type}`,
      metadata: {
        request_id: requestId,
        target_page: "admin_request_review",
        action: "review_request",
      },
    })

    /*
     * ========================================================
     * AUDIT
     * ========================================================
     */

    await recordRequestAudit(
      requestId,
      user.id,
      "ai_estimate_generated",
      {
        suggested_price:
          analysis.suggestedPrice,
        confidence:
          analysis.confidence,
      },
    )

 await auditLog(
  user.id,
  "client_request_created",
  request,
  {
    request_id: requestId,
    service_type,
    category: "osint",
  },
)

    /*
     * ========================================================
     * RETURN
     * ========================================================
     */

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

const row = created.rows[0]

const clientRequest = {
  id: row.id,
  case_number: row.case_number ?? null,
  title: row.title ?? null,
  description: row.description ?? null,
  custom_description: row.custom_description ?? null,
  service_type: row.service_type ?? null,
  status: row.status ?? "pending_review",

  currency: row.currency ?? null,
  priority: row.priority ?? null,

  preferred_deadline:
    row.preferred_deadline ?? null,

  investigation_objective:
    row.investigation_objective ?? null,

  evidence_uploads:
    row.evidence_uploads ?? null,

  additional_notes:
    row.additional_notes ?? null,

  subject_approximate_age:
    row.subject_approximate_age ?? null,

  subject_height:
    row.subject_height ?? null,

  subject_weight:
    row.subject_weight ?? null,

  subject_hair_color:
    row.subject_hair_color ?? null,

  subject_eye_color:
    row.subject_eye_color ?? null,

  subject_skin_tone:
    row.subject_skin_tone ?? null,

  subject_distinguishing_marks:
    row.subject_distinguishing_marks ?? null,

  subject_nationality:
    row.subject_nationality ?? null,

  subject_languages_spoken:
    row.subject_languages_spoken ?? null,

  subject_last_known_address:
    row.subject_last_known_address ?? null,

  subject_last_known_occupation:
    row.subject_last_known_occupation ?? null,

  subject_additional_usernames:
    row.subject_additional_usernames ?? null,

  subject_gaming_ids:
    row.subject_gaming_ids ?? null,

  subject_cryptocurrency_wallets:
    row.subject_cryptocurrency_wallets ?? null,

  subject_domain_names:
    row.subject_domain_names ?? null,

  subject_ip_addresses:
    row.subject_ip_addresses ?? null,

  subject_vehicle_registration:
    row.subject_vehicle_registration ?? null,

  quote_sent_at:
    row.quote_sent_at ?? null,

  client_decision_at:
    row.client_decision_at ?? null,

  declined_reason:
    row.declined_reason ?? null,

  created_at: row.created_at,
  updated_at: row.updated_at,
}

return NextResponse.json(
  clientRequest,
  { status: 201 },
)

  } catch (error) {
    console.error(
      "OSINT REQUEST POST ERROR",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to create OSINT request",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    )
  }
}