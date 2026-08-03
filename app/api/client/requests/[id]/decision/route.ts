import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { convertAcceptedRequestToCase } from "@/lib/services/case-conversion-service"
import { notifyAdmins } from "@/lib/services/notification-service"
import { recordRequestAudit, requestQuoteReview } from "@/lib/services/quote-workflow-service"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const action = String(body.action || "")

    if (action === "accept") {
      const eligible = await query<{ id: string }>(
        "SELECT id FROM requests WHERE id=$1 AND user_id=$2 AND status IN ('quote_sent', 'revised_quote_sent', 'awaiting_client_acceptance') AND converted_case_id IS NULL LIMIT 1",
        [id, user.id],
      )
      if (!eligible.rows[0]) return NextResponse.json({ error: "No active quote is available for acceptance" }, { status: 400 })
      const caseId = await convertAcceptedRequestToCase(id, user.id)
      await auditLog(user.id, "client_accepted_quote", request, { request_id: id, case_id: caseId })
      return NextResponse.json({ success: true, case_id: caseId })
    }

    if (action === "review") {
      const requestedBudget = Number(body.requested_budget)
      const reason = String(body.reason || "").trim()
      if (!Number.isFinite(requestedBudget) || requestedBudget <= 0 || reason.length < 10) {
        return NextResponse.json({ error: "Requested budget and a clear reason are required" }, { status: 400 })
      }
      const negotiation = await requestQuoteReview({
        requestId: id,
        clientId: user.id,
        requestedBudget,
        reason,
        notes: body.notes ? String(body.notes) : null,
      })
      await auditLog(user.id, "client_requested_quote_review", request, { request_id: id, negotiation_id: negotiation.id })
      return NextResponse.json(negotiation, { status: 201 })
    }

    if (action === "decline") {
      const reason = body.reason ? String(body.reason).slice(0, 2000) : null
      const updated = await query("UPDATE requests SET status='declined', declined_reason=$3, client_decision_at=NOW(), updated_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING *", [id, user.id, reason])
      if (!updated.rows[0]) return NextResponse.json({ error: "Request not found" }, { status: 404 })
      await recordRequestAudit(id, user.id, "client_declined_quote", { reason })
      await notifyAdmins({ type: "quote_rejected", title: "Client declined quote", message: reason || "A client declined a quote.", metadata: { request_id: id } })
      await auditLog(user.id, "client_declined_quote", request, { request_id: id })
      return NextResponse.json(updated.rows[0])
    }

    return NextResponse.json({ error: "Invalid decision action" }, { status: 400 })
  } catch (error) {
    console.error("CLIENT QUOTE DECISION ERROR", error)
    return NextResponse.json({ error: "Failed to process quote decision" }, { status: 500 })
  }
}
