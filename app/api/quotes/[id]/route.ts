import { NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const request = await query(
      `
      SELECT
        r.id,
        r.case_number,
        r.title,
        r.service_type,
        r.status,
        r.currency,
        r.final_price,
        r.price_notes,
        r.approved_quote_amount,
        r.approved_quote_currency,
        r.approved_quote_notes,
        r.approved_estimated_start,
        r.approved_estimated_completion,
        r.quote_sent_at,
        r.client_decision_at,
        r.declined_reason,
        r.converted_case_id,
        r.created_at,
        r.updated_at,
        r.user_id,
        u.username AS client_username,
        COALESCE(r.client_email, u.email) AS client_email
      FROM requests r
      LEFT JOIN app_users u ON u.id = r.user_id
      WHERE r.id = $1
        AND (
          r.user_id = $2
          OR $3::boolean = TRUE
        )
      LIMIT 1
      `,
      [id, user.id, isAdminRole(user.role)],
    )

    const row = request.rows[0]

    if (!row) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    const versions = await query(
      `
      SELECT
        id,
        request_id,
        version_number,
        created_by,
        creator_role,
        source,
        price,
        currency,
        estimated_completion,
        notes,
        reasoning,
        status,
        created_at,
        previous_price,
        price_difference
      FROM quote_versions
      WHERE request_id = $1
      ORDER BY version_number DESC, created_at DESC
      `,
      [id],
    )

    const negotiations = await query(
      `
      SELECT
        id,
        request_id,
        round_number,
        status,
        original_quote_amount,
        quote_currency,
        requested_budget,
        client_reason,
        client_notes,
        administrator_recommendation,
        revised_quote_amount,
        owner_decision,
        owner_decision_notes,
        decided_at,
        created_at,
        updated_at
      FROM quote_negotiations
      WHERE request_id = $1
      ORDER BY round_number DESC, created_at DESC
      `,
      [id],
    ).catch(() => ({ rows: [] }))

    return NextResponse.json({
      quote: row,
      versions: versions.rows,
      negotiations: negotiations.rows,
    })
  } catch (error) {
    console.error("QUOTE DETAIL GET ERROR", error)
    return NextResponse.json({ error: "Failed to load quote" }, { status: 500 })
  }
}
