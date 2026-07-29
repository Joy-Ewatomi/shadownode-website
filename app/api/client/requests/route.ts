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
        case_number,
        title,
        category,
        service_type,
        description,
        urgency,
        preferred_deadline,
        status,
        quote_notes,
        ai_price_estimate,
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
        converted_case_id,
        created_at,
        updated_at,
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
      FROM requests
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [user.id],
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

    // ─── INSERT ───
    const inserted = await query<{ id: string; case_number: string }>(
      `
      INSERT INTO requests
        (
          token, case_number, title, category, service_type, description,
          urgency, preferred_deadline, status, user_id, client_email,
          is_anonymous, priority, timeline, currency, estimated_price,
          ai_price_estimate, ai_complexity, ai_estimated_hours,
          ai_suggested_service, ai_suggested_priority, ai_confidence, ai_reasoning,
          investigation_objective, subject_type,
          subject_full_name, subject_known_usernames, subject_emails,
          subject_phone_numbers, subject_location, subject_organization,
          subject_websites, subject_company_name, subject_company_website,
          subject_company_country, subject_company_industry,
          subject_domain, subject_url, subject_ip_address, subject_platform,
          existing_information, investigation_depth, confidentiality_level,
          authorization_confirmed, communication_method,
          communication_email, communication_country_code,
          communication_phone, communication_whatsapp, communication_signal,
          client_country, preferred_currency, additional_notes,
          supporting_links, evidence_uploads,
          subject_approximate_age, subject_height, subject_weight,
          subject_hair_color, subject_eye_color, subject_skin_tone,
          subject_distinguishing_marks, subject_nationality, subject_languages_spoken,
          subject_last_known_address, subject_last_known_occupation,
          subject_additional_usernames, subject_gaming_ids,
          subject_cryptocurrency_wallets, subject_domain_names,
          subject_ip_addresses, subject_vehicle_registration,
          training_organization_name, training_client_type,
          training_participant_count, training_skill_level, training_goal,
          training_topics, training_preferred_dates, training_additional_requirements,
          created_at, updated_at
        )
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,'pending_review',$9,$10,false,$12,$11,
         $13,$14,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,
         $29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,
         $46,$47,$48,$49,$50,$51,$52,$53,$54,
         $55,$56,$57,$58,$59,$60,$61,$62,$63,$64,$65,$66,$67,$68,$69,$70,$71,
         $72,$73,$74,$75,$76,$77,$78,$79,
         NOW(), NOW())
      RETURNING id, case_number
      `,
      [
        // 1-11: core fields
        nanoid(32),                                                       // 1  token
        trackingNumber,                                                   // 2  case_number
        title,                                                            // 3  title
        category,                                                         // 4  category
        service_type || category,                                         // 5  service_type
        description,                                                      // 6  description
        urgency,                                                          // 7  urgency
        body.preferred_deadline || null,                                  // 8  preferred_deadline
        user.id,                                                          // 9  user_id
        user.email,                                                       // 10 client_email
        body.preferred_deadline || urgency,                               // 11 timeline
        // 12-13: priority/price
        analysis.suggestedPriority,                                       // 12 priority
        preferred_currency,                                               // 13 currency
        // 14-20: AI analysis
        analysis.suggestedPrice,                                          // 14 estimated_price / ai_price_estimate
        analysis.complexity,                                              // 15 ai_complexity
        analysis.estimatedHours,                                          // 16 ai_estimated_hours
        analysis.suggestedService,                                        // 17 ai_suggested_service
        analysis.suggestedPriority,                                       // 18 ai_suggested_priority
        analysis.confidence,                                              // 19 ai_confidence
        analysis.reasoning,                                               // 20 ai_reasoning
        // 21-39: investigation objective & subject
        investigation_objective || null,                                  // 21 investigation_objective
        subject_type || null,                                             // 22 subject_type
        body.subject_full_name || null,                                   // 23 subject_full_name
        body.subject_known_usernames || null,                             // 24 subject_known_usernames
        body.subject_emails || null,                                      // 25 subject_emails
        body.subject_phone_numbers || null,                               // 26 subject_phone_numbers
        body.subject_location || null,                                    // 27 subject_location
        body.subject_organization || null,                                // 28 subject_organization
        body.subject_websites || null,                                    // 29 subject_websites
        body.subject_company_name || null,                                // 30 subject_company_name
        body.subject_company_website || null,                             // 31 subject_company_website
        body.subject_company_country || null,                             // 32 subject_company_country
        body.subject_company_industry || null,                            // 33 subject_company_industry
        body.subject_domain || null,                                      // 34 subject_domain
        body.subject_url || null,                                         // 35 subject_url
        body.subject_ip_address || null,                                  // 36 subject_ip_address
        body.subject_platform || null,                                    // 37 subject_platform
        existing_information || null,                                     // 38 existing_information
        investigation_depth,                                              // 39 investigation_depth
        // 40-53: confidentiality, auth, communication
        confidentiality_level,                                            // 40 confidentiality_level
        authorization_confirmed,                                          // 41 authorization_confirmed
        communication_method,                                             // 42 communication_method
        communication_email || null,                                      // 43 communication_email
        communication_country_code || null,                               // 44 communication_country_code
        communication_phone || null,                                      // 45 communication_phone
        communication_whatsapp || null,                                   // 46 communication_whatsapp
        communication_signal || null,                                     // 47 communication_signal
        client_country,                                                   // 48 client_country
        preferred_currency,                                               // 49 preferred_currency
        additional_notes || null,                                         // 50 additional_notes
        supportingLinks,                                                  // 51 supporting_links
        evidenceUploads,                                                  // 52 evidence_uploads
        // 53-67: additional identifying info (physical)
        body.subject_approximate_age || null,                             // 53
        body.subject_height || null,                                      // 54
        body.subject_weight || null,                                      // 55
        body.subject_hair_color || null,                                  // 56
        body.subject_eye_color || null,                                   // 57
        body.subject_skin_tone || null,                                   // 58
        body.subject_distinguishing_marks || null,                        // 59
        body.subject_nationality || null,                                 // 60
        body.subject_languages_spoken || null,                            // 61
        body.subject_last_known_address || null,                          // 62
        body.subject_last_known_occupation || null,                       // 63
        // 64-71: digital info
        body.subject_additional_usernames || null,                        // 64
        body.subject_gaming_ids || null,                                  // 65
        body.subject_cryptocurrency_wallets || null,                      // 66
        body.subject_domain_names || null,                                // 67
        body.subject_ip_addresses || null,                                // 68
        body.subject_vehicle_registration || null,                        // 69
        // 70-79: training fields
        training_organization_name || null,                               // 70
        training_client_type,                                             // 71
        training_participant_count,                                       // 72
        training_skill_level,                                             // 73
        training_goal || null,                                            // 74
        training_topics || null,                                          // 75
        training_preferred_dates || null,                                 // 76
        training_additional_requirements || null,                         // 77
        // (78-79 handled as NOW())
      ],
    )

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
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 })
  }
}
