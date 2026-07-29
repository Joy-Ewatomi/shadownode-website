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
