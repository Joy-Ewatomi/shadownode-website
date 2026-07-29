import { NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!isAdminRole(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const requests = await query(
      `
      SELECT
        r.id,
        r.token,
        r.case_number,
        r.title,
        r.category,
        r.service_type,
        r.description,
        r.urgency,
        r.preferred_deadline,
        r.status,
        r.progress,
        r.estimated_price,
        r.ai_price_estimate,
        r.ai_complexity,
        r.ai_estimated_hours,
        r.ai_suggested_service,
        r.ai_suggested_priority,
        r.ai_confidence,
        r.ai_reasoning,
        r.final_price,
        r.quote_notes,
        r.approved_quote_amount,
        r.approved_quote_currency,
        r.approved_quote_notes,
        r.approved_estimated_completion,
        r.client_email,
        r.user_id,
        r.is_anonymous,
        r.converted_case_id,
        r.created_at,
        r.updated_at,
        r.investigation_objective,
        r.subject_type,
        r.subject_full_name,
        r.subject_known_usernames,
        r.subject_emails,
        r.subject_phone_numbers,
        r.subject_location,
        r.subject_organization,
        r.subject_websites,
        r.subject_company_name,
        r.subject_company_website,
        r.subject_company_country,
        r.subject_company_industry,
        r.subject_domain,
        r.subject_url,
        r.subject_ip_address,
        r.subject_platform,
        r.existing_information,
        r.investigation_depth,
        r.confidentiality_level,
        r.authorization_confirmed,
        r.communication_method,
        r.communication_email,
        r.communication_country_code,
        r.communication_phone,
        r.communication_whatsapp,
        r.communication_signal,
        r.client_country,
        r.preferred_currency,
        r.additional_notes,
        r.supporting_links,
        r.evidence_uploads,
        r.subject_approximate_age,
        r.subject_height,
        r.subject_weight,
        r.subject_hair_color,
        r.subject_eye_color,
        r.subject_skin_tone,
        r.subject_distinguishing_marks,
        r.subject_nationality,
        r.subject_languages_spoken,
        r.subject_last_known_address,
        r.subject_last_known_occupation,
        r.subject_additional_usernames,
        r.subject_gaming_ids,
        r.subject_cryptocurrency_wallets,
        r.subject_domain_names,
        r.subject_ip_addresses,
        r.subject_vehicle_registration,
        r.training_organization_name,
        r.training_client_type,
        r.training_participant_count,
        r.training_skill_level,
        r.training_goal,
        r.training_topics,
        r.training_preferred_dates,
        r.training_additional_requirements,
        u.username AS client_username,
        u.email AS account_email
      FROM requests r
      LEFT JOIN app_users u ON u.id = r.user_id
      ORDER BY r.created_at DESC
      `,
    )

    return NextResponse.json(requests.rows)
  } catch (error) {
    console.error("ADMIN REQUESTS GET ERROR", error)
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 })
  }
}
