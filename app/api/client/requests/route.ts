import { nanoid } from "nanoid"
import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { analyzeRequest } from "@/lib/services/request-analysis-service"
import { notifyAdmins } from "@/lib/services/notification-service"
import { recordRequestAudit } from "@/lib/services/quote-workflow-service"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
const requests = await query(
  `
  SELECT
    id,
    user_id,
    client_email,
    contact_method,
    token,
    is_anonymous,
    case_number,
    title,
    description,
    service_type,
    status,

    final_price,
    price_notes,
    ai_analysis,

    created_at,
    updated_at,
    currency,
    ai_price_estimate,
    converted_case_id,
    priority,
    ai_status,
    ai_complexity,
    ai_estimated_hours,
    ai_suggested_service,
    ai_suggested_priority,
    ai_confidence,
    ai_reasoning,

    approved_quote_amount,
    approved_quote_currency,
    approved_quote_notes,
    approved_estimated_completion,
    quote_sent_at,
    client_decision_at,
    declined_reason,

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
    training_additional_requirements

  FROM requests
  WHERE user_id = $1
  ORDER BY created_at DESC
  `,
  [user.id]
)

    return NextResponse.json(requests.rows)
  } catch (error) {
    console.error("CLIENT REQUESTS GET ERROR", error)
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()

    // ─── Extract and normalize common fields ───
    const title = String(body.title || "").trim()
    const category = String(body.category || "osint").trim()
    const description = String(body.description || "").trim()
    const urgency = String(body.urgency || "normal").trim()
    const service_type = String(body.service_type || body.category || "").trim()
    const investigation_objective = String(body.investigation_objective || "").trim()
    const existing_information = String(body.existing_information || "").trim()
    const investigation_depth = String(body.investigation_depth || "standard").trim()
    const confidentiality_level = String(body.confidentiality_level || "standard").trim()
    const authorization_confirmed = Boolean(body.authorization_confirmed)
    const additional_notes = String(body.additional_notes || "").trim()

    // ─── Communication ───
    const communication_method = String(body.communication_method || body.communication_channel || "portal_notification").trim()
    const communication_email = String(body.communication_email || "").trim()
    const communication_country_code = String(body.communication_country_code || "").trim()
    const communication_phone = String(body.communication_phone || "").trim()
    const communication_whatsapp = String(body.communication_whatsapp || "").trim()
    const communication_signal = String(body.communication_signal || "").trim()
    const client_country = String(body.client_country || "").trim()
    const preferred_currency = String(body.preferred_currency || "USD").trim()

    // ─── Subject (OSINT) ───
    const subject_type = String(body.subject_type || "").trim()

    // ─── Training (Cybersecurity) ───
    const training_organization_name = String(body.training_organization_name || "").trim()
    const training_client_type = String(body.training_client_type || "organization").trim()
    const training_participant_count = body.training_participant_count ? parseInt(String(body.training_participant_count), 10) || null : null
    const training_skill_level = String(body.training_skill_level || "beginner").trim()
    const training_goal = String(body.training_goal || "").trim()
    const training_topics = String(body.training_topics || "").trim()
    const training_preferred_dates = String(body.training_preferred_dates || "").trim()
    const training_additional_requirements = String(body.training_additional_requirements || "").trim()

    // ─── Validation ───
    if (!title || !category || description.length < 20) {
      return NextResponse.json({ error: "Title, category, and a 20+ character description are required" }, { status: 400 })
    }
    if (!client_country) {
      return NextResponse.json({ error: "Country is required" }, { status: 400 })
    }
    if (!communication_method) {
      return NextResponse.json({ error: "Communication method is required" }, { status: 400 })
    }
    if (!authorization_confirmed) {
      return NextResponse.json({ error: "You must confirm lawful authorization for this request" }, { status: 400 })
    }

    // ─── Generate tracking number ───
    const year = new Date().getFullYear()
    const existing = await query<{ total: string | number }>(
      `SELECT COUNT(*) AS total FROM requests WHERE created_at >= $1 AND created_at < $2`,
      [`${year}-01-01`, `${year + 1}-01-01`],
    )
    const trackingNumber = `SN-${year}-${String(Number(existing.rows[0]?.total || 0) + 1).padStart(6, "0")}`

    // ─── AI Analysis ───
    const analysis = analyzeRequest({
      serviceType: service_type || category,
      description: `${investigation_objective} ${description}`,
      urgency,
      timeline: body.preferred_deadline ? "standard" : urgency,
      investigationDepth: investigation_depth,
      confidentialityLevel: confidentiality_level,
      subjectType: subject_type,
    })

    // ─── Serialize JSON fields ───
    const supportingLinks = body.supporting_links ? JSON.stringify(body.supporting_links) : "[]"
    const evidenceUploads = body.evidence_files ? JSON.stringify(body.evidence_files) : "[]"

    console.log("=== CREATING CLIENT REQUEST ===")
     console.log({
  userId: user.id,
  userEmail: user.email,
  userRole: user.role,
  title,
  service_type,
  client_country,
  preferred_currency,
  trackingNumber,
})

    // ─── INSERT ───
const inserted = await query<{ id: string; case_number: string }>(
  `
  INSERT INTO requests
    (
      token,
      case_number,
      title,
      service_type,
      description,
      status,
      user_id,
      client_email,
      is_anonymous,
      priority,
      currency,
      ai_price_estimate,
      ai_complexity,
      ai_estimated_hours,
      ai_suggested_service,
      ai_suggested_priority,
      ai_confidence,
      ai_reasoning,

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
      additional_notes,
      supporting_links,
      evidence_uploads,

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

      training_organization_name,
      training_client_type,
      training_participant_count,
      training_skill_level,
      training_goal,
      training_topics,
      training_preferred_dates,
      training_additional_requirements
    )
  VALUES
    (
      $1,
      $2,
      $3,
      $4,
      $5,
      'pending_review',
      $6,
      $7,
      false,
      $8,
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
      $64,
      $65,

      $66,
      $67,
      $68,
      $69,
      $70,
      $71,
      $72,
      $73
    )
  RETURNING id, case_number
  `,
  [
    // 1-16: core + AI
    nanoid(32),                                      // 1 token
    trackingNumber,                                  // 2 case_number
    title,                                           // 3 title
    service_type || category,                        // 4 service_type
    description,                                     // 5 description
    user.id,                                         // 6 user_id
    user.email,                                      // 7 client_email
    analysis.suggestedPriority,                      // 8 priority
    preferred_currency,                              // 9 currency
    analysis.suggestedPrice,                         // 10 ai_price_estimate
    analysis.complexity,                             // 11 ai_complexity
    analysis.estimatedHours,                         // 12 ai_estimated_hours
    analysis.suggestedService,                       // 13 ai_suggested_service
    analysis.suggestedPriority,                      // 14 ai_suggested_priority
    analysis.confidence,                             // 15 ai_confidence
    analysis.reasoning,                              // 16 ai_reasoning

    // 17-35: investigation + subject
    investigation_objective || null,                // 17
    subject_type || null,                            // 18
    body.subject_full_name || null,                  // 19
    body.subject_known_usernames || null,            // 20
    body.subject_emails || null,                     // 21
    body.subject_phone_numbers || null,              // 22
    body.subject_location || null,                   // 23
    body.subject_organization || null,               // 24
    body.subject_websites || null,                   // 25
    body.subject_company_name || null,               // 26
    body.subject_company_website || null,            // 27
    body.subject_company_country || null,            // 28
    body.subject_company_industry || null,           // 29
    body.subject_domain || null,                     // 30
    body.subject_url || null,                        // 31
    body.subject_ip_address || null,                 // 32
    body.subject_platform || null,                   // 33
    existing_information || null,                    // 34
    investigation_depth,                             // 35

    // 36-48: confidentiality + communication
    confidentiality_level,                           // 36
    authorization_confirmed,                         // 37
    communication_method,                            // 38
    communication_email || null,                     // 39
    communication_country_code || null,              // 40
    communication_phone || null,                      // 41
    communication_whatsapp || null,                   // 42
    communication_signal || null,                     // 43
    client_country,                                  // 44
    preferred_currency,                              // 45
    additional_notes || null,                        // 46
    supportingLinks,                                 // 47
    evidenceUploads,                                 // 48

    // 49-65: additional identifying information
    body.subject_approximate_age || null,            // 49
    body.subject_height || null,                     // 50
    body.subject_weight || null,                     // 51
    body.subject_hair_color || null,                 // 52
    body.subject_eye_color || null,                  // 53
    body.subject_skin_tone || null,                 // 54
    body.subject_distinguishing_marks || null,       // 55
    body.subject_nationality || null,                // 56
    body.subject_languages_spoken || null,           // 57
    body.subject_last_known_address || null,         // 58
    body.subject_last_known_occupation || null,      // 59
    body.subject_additional_usernames || null,       // 60
    body.subject_gaming_ids || null,                 // 61
    body.subject_cryptocurrency_wallets || null,     // 62
    body.subject_domain_names || null,               // 63
    body.subject_ip_addresses || null,               // 64
    body.subject_vehicle_registration || null,       // 65

    // 66-73: training
    training_organization_name || null,              // 66
    training_client_type || null,                    // 67
    training_participant_count ?? null,              // 68
    training_skill_level || null,                    // 69
    training_goal || null,                           // 70
    training_topics || null,                         // 71
    training_preferred_dates || null,                // 72
    training_additional_requirements || null,        // 73
  ],
)

console.log("=== REQUEST INSERTED ===")
console.log(inserted.rows[0])

    // ─── Notifications & Audit ───
    await notifyAdmins({
      type: "client_request",
      title: "New client investigation request",
      message: `${user.username} submitted ${title} (${trackingNumber}) - ${service_type || category}`,
      metadata: { request_id: inserted.rows[0].id },
    })
    await recordRequestAudit(inserted.rows[0].id, user.id, "ai_estimate_generated", {
      suggested_price: analysis.suggestedPrice,
      confidence: analysis.confidence,
    })
    await auditLog(user.id, "client_request_created", request, { request_id: inserted.rows[0].id })

    // ─── Respond with created request ───
    const created = await query(
      "SELECT * FROM requests WHERE id = $1",
      [inserted.rows[0].id],
    )

    return NextResponse.json(created.rows[0], { status: 201 })
    } catch (error) {
    console.error("CLIENT REQUESTS POST ERROR", error)

    if (error instanceof Error) {
      console.error("MESSAGE:", error.message)
      console.error("STACK:", error.stack)
    }

    return NextResponse.json(
      {
        error: "Failed to create request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
