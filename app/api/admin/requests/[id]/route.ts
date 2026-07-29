import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"
import { declineRequest, recordRequestAudit, sendQuote } from "@/lib/services/quote-workflow-service"

const requestStatuses = new Set(["pending_review", "reviewing", "approved", "quote_sent", "negotiation_requested", "negotiation_reviewing", "revised_quote_sent", "accepted", "active", "rejected", "declined", "submitted", "completed"])

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (!isAdminRole(user.role)) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  return { user }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin()
    if (auth.response) return auth.response

    const { id } = await params
    const body = await request.json()
    const action = String(body.action || "update")

    const current = await query<{
      id: string
      user_id: string | null
      title: string | null
      description: string | null
      category: string | null
      service_type: string | null
      urgency: string | null
      preferred_deadline: string | null
      case_number: string | null
      converted_case_id: string | null
    }>("SELECT * FROM requests WHERE id=$1 LIMIT 1", [id])

    const item = current.rows[0]
    if (!item) return NextResponse.json({ error: "Request not found" }, { status: 404 })

    if (action === "convert_to_case") {
      return NextResponse.json({ error: "Cases are created only after client quote acceptance" }, { status: 409 })
    }

    if (action === "send_quote") {
      const amount = Number(body.approved_quote_amount)
      if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Valid quote amount is required" }, { status: 400 })
      const updated = await sendQuote({
        requestId: id,
        actorUserId: auth.user?.id || "",
        amount,
        currency: String(body.approved_quote_currency || "NGN").trim().slice(0, 10),
        notes: body.quote_notes ? String(body.quote_notes) : null,
        estimatedCompletion: body.approved_estimated_completion ? String(body.approved_estimated_completion) : null,
      })
      await auditLog(auth.user?.id || null, "request_quote_sent", request, { request_id: id, approved_quote_amount: amount })
      return NextResponse.json(updated)
    }

    if (action === "reject") {
      const updated = await declineRequest(id, auth.user?.id || "", body.reason ? String(body.reason) : null)
      await auditLog(auth.user?.id || null, "request_rejected", request, { request_id: id })
      return NextResponse.json(updated)
    }

    const nextStatus = body.status ? String(body.status) : null
    if (nextStatus && !requestStatuses.has(nextStatus)) {
      return NextResponse.json({ error: "Invalid request status" }, { status: 400 })
    }

    const updated = await query(
      `
      UPDATE requests
      SET
        status = COALESCE($2, status),
        approved_quote_amount = COALESCE($3, approved_quote_amount),
        approved_quote_currency = COALESCE($4, approved_quote_currency),
        quote_notes = COALESCE($5, quote_notes),
        final_price = COALESCE($6, final_price),
        reviewed_by = $7,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [
        id,
        nextStatus,
        body.approved_quote_amount ?? null,
        body.approved_quote_currency ?? null,
        body.quote_notes ?? null,
        body.final_price ?? body.approved_quote_amount ?? null,
        auth.user?.id || null,
      ],
    )

    await auditLog(auth.user?.id || null, "request_review_updated", request, {
      request_id: id,
      action,
      status: nextStatus,
      approved_quote_amount: body.approved_quote_amount ?? null,
    })
    await recordRequestAudit(id, auth.user?.id || null, "request_review_updated", {
      action,
      status: nextStatus,
      approved_quote_amount: body.approved_quote_amount ?? null,
    })

    return NextResponse.json(updated.rows[0])
  } catch (error) {
    console.error("ADMIN REQUEST PATCH ERROR", error)
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
  }
}
