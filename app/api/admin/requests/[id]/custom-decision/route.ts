import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { withTransaction } from "@/lib/db"
import { isSameOriginMutation } from "@/lib/security-center"
import {
  SUPER_ADMIN_DECISIONS,
  type SuperAdminDecision,
  isCustomRequest,
  statusForSuperAdminDecision,
} from "@/lib/custom-request-workflow"
import { notifyAdmins, notifyUser } from "@/lib/services/notification-service"

export const dynamic = "force-dynamic"

function safeText(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : ""
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403 })
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!new Set(["super_administrator", "super-administrator"]).has(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { id } = await params
    const body = await request.json() as Record<string, unknown>
    const action = safeText(body.action, 40) as SuperAdminDecision
    const internalReason = safeText(body.internalReason, 5000)
    const clientMessage = safeText(body.clientMessage, 3000)
    if (!SUPER_ADMIN_DECISIONS.includes(action)) return NextResponse.json({ error: "Select a valid final decision." }, { status: 400 })
    if (body.confirmed !== true) return NextResponse.json({ error: "Confirm the final decision before submitting." }, { status: 400 })
    if (!internalReason) return NextResponse.json({ error: "An internal decision reason is required." }, { status: 400 })
    if (action !== "approve_for_quote" && !clientMessage) return NextResponse.json({ error: "A separate client-facing explanation is required." }, { status: 400 })

    const result = await withTransaction(async (client) => {
      const locked = await client.query<{ user_id: string; service_type: string; status: string }>(
        "SELECT user_id, service_type, status FROM requests WHERE id = $1 FOR UPDATE",
        [id],
      )
      const row = locked.rows[0]
      if (!row || !isCustomRequest(row.service_type)) throw new Error("NOT_FOUND")
      if (row.status !== "pending_super_admin_review") throw new Error("INVALID_TRANSITION")
      const nextStatus = statusForSuperAdminDecision(action)
      await client.query(
        `UPDATE requests SET status = $2, super_admin_decision = $3::jsonb,
          internal_decision_reason = $4, client_facing_status_explanation = $5,
          super_admin_reviewed_by = $6, super_admin_reviewed_at = NOW(),
          decision_confirmed_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [id, nextStatus, JSON.stringify({ action }), internalReason, clientMessage || "Approved for quote preparation.", user.id],
      )
      await client.query(
        "INSERT INTO request_audit_events (request_id, actor_user_id, action, details) VALUES ($1, $2, 'custom_super_admin_decision', $3::jsonb)",
        [id, user.id, JSON.stringify({ action, previous_status: row.status, new_status: nextStatus })],
      )
      return { clientId: row.user_id, nextStatus }
    })

    const metadata = { request_id: id, resource_type: "request", resource_id: id }
    await Promise.allSettled([
      notifyUser(result.clientId, {
        type: result.nextStatus === "approved_for_quote" ? "request_approved" : "request_status_changed",
        title: result.nextStatus === "approved_for_quote" ? "Request approved for quotation" : "Custom request update",
        message: clientMessage || "Your request has been approved for quote preparation.",
        metadata,
      }),
      notifyAdmins({
        type: "custom_request_decided",
        title: "Custom request decision recorded",
        message: `The request status is now ${result.nextStatus.replaceAll("_", " ")}.`,
        metadata: { ...metadata, audience: "administrator", target_page: "admin_request_review" },
      }),
    ])
    return NextResponse.json({ success: true, status: result.nextStatus })
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Request not found." }, { status: 404 })
    if (code === "INVALID_TRANSITION") return NextResponse.json({ error: "This request is no longer available for this action." }, { status: 409 })
    console.error("CUSTOM SUPER ADMIN DECISION ERROR:", code || "Unknown error")
    return NextResponse.json({ error: "Unable to record the final decision." }, { status: 500 })
  }
}
