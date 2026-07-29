import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!isAdminRole(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const reviews = await query(
      `
      SELECT
        qn.*,
        r.case_number,
        r.title AS request_title,
        r.description AS request_description,
        r.ai_price_estimate,
        r.ai_reasoning,
        r.approved_quote_amount,
        r.quote_notes,
        au.email AS client_email,
        reviewer.email AS reviewer_email,
        COALESCE(
          json_agg(
            json_build_object(
              'id', history.id,
              'round_number', history.round_number,
              'status', history.status,
              'requested_budget', history.requested_budget,
              'client_reason', history.client_reason,
              'administrator_recommendation', history.administrator_recommendation,
              'revised_quote_amount', history.revised_quote_amount,
              'owner_decision', history.owner_decision,
              'created_at', history.created_at
            )
            ORDER BY history.created_at ASC
          ) FILTER (WHERE history.id IS NOT NULL),
          '[]'::json
        ) AS history
      FROM quote_negotiations qn
      JOIN requests r ON r.id=qn.request_id
      LEFT JOIN app_users au ON au.id=qn.user_id
      LEFT JOIN app_users reviewer ON reviewer.id=qn.assigned_reviewer_id
      LEFT JOIN quote_negotiations history ON history.request_id=qn.request_id
      WHERE qn.id IN (
        SELECT DISTINCT ON (request_id) id
        FROM quote_negotiations
        ORDER BY request_id, created_at DESC
      )
      GROUP BY qn.id, r.id, au.email, reviewer.email
      ORDER BY qn.created_at DESC
      `,
    )

    return NextResponse.json(reviews.rows)
  } catch (error) {
    console.error("ADMIN QUOTE NEGOTIATIONS GET ERROR", error)
    return NextResponse.json({ error: "Failed to fetch quote reviews" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!isAdminRole(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const id = String(body.id || "")
    const action = String(body.action || "")
    if (!id) return NextResponse.json({ error: "Negotiation id is required" }, { status: 400 })

    const current = await query<{ request_id: string; approved_quote_currency: string | null }>(
      `
      SELECT qn.request_id, r.approved_quote_currency
      FROM quote_negotiations qn
      JOIN requests r ON r.id=qn.request_id
      WHERE qn.id=$1
      LIMIT 1
      `,
      [id],
    )
    if (!current.rows[0]) return NextResponse.json({ error: "Quote review not found" }, { status: 404 })

    const revisedAmount = body.revised_quote_amount === undefined || body.revised_quote_amount === "" ? null : Number(body.revised_quote_amount)
    if (revisedAmount !== null && (!Number.isFinite(revisedAmount) || revisedAmount <= 0)) {
      return NextResponse.json({ error: "Revised quote amount must be valid" }, { status: 400 })
    }

    const status = action === "reject" ? "rejected" : action === "send_revised_quote" ? "revised_quote_sent" : action === "approve" ? "approved" : "reviewing"
    const ownerDecision = action === "reject" ? "rejected" : revisedAmount ? "modified" : action === "approve" ? "approved" : null
    const updated = await query(
      `
      UPDATE quote_negotiations
      SET status=$2,
          administrator_recommendation=COALESCE($3, administrator_recommendation),
          revised_quote_amount=COALESCE($4, revised_quote_amount),
          owner_approver_id=$5,
          owner_decision=COALESCE($6, owner_decision),
          owner_decision_notes=COALESCE($7, owner_decision_notes),
          decided_at=CASE WHEN $6 IS NULL THEN decided_at ELSE NOW() END,
          updated_at=NOW()
      WHERE id=$1
      RETURNING *
      `,
      [id, status, body.administrator_recommendation ? String(body.administrator_recommendation) : null, revisedAmount, user.id, ownerDecision, body.owner_decision_notes ? String(body.owner_decision_notes) : null],
    )

    if (action === "send_revised_quote" && revisedAmount) {
      await query(
        `
        UPDATE requests
        SET status='revised_quote_sent',
            final_price=$2,
            approved_quote_amount=$2,
            approved_quote_currency=$3,
            quote_sent_at=NOW(),
            reviewed_by=$4,
            updated_at=NOW()
        WHERE id=$1
        `,
        [current.rows[0].request_id, revisedAmount, current.rows[0].approved_quote_currency || "NGN", user.id],
      )
    }

    await query("INSERT INTO request_audit_events (request_id, actor_user_id, action, details) VALUES ($1, $2, $3, $4)", [
      current.rows[0].request_id,
      user.id,
      `negotiation_${action}`,
      JSON.stringify({ negotiation_id: id, revised_quote_amount: revisedAmount }),
    ]).catch(() => undefined)
    await auditLog(user.id, "quote_negotiation_updated", request, { negotiation_id: id, action })
    return NextResponse.json(updated.rows[0])
  } catch (error) {
    console.error("ADMIN QUOTE NEGOTIATIONS PATCH ERROR", error)
    return NextResponse.json({ error: "Failed to update quote review" }, { status: 500 })
  }
}
