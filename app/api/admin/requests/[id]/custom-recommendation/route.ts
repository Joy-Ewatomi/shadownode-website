import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { withTransaction } from "@/lib/db"
import { isSameOriginMutation } from "@/lib/security-center"
import {
  ADMIN_RECOMMENDATIONS,
  type AdminRecommendation,
  isCustomRequest,
  statusForAdminRecommendation,
} from "@/lib/custom-request-workflow"
import { notifySuperAdmins, notifyUser } from "@/lib/services/notification-service"

export const dynamic = "force-dynamic"

function text(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : ""
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403 })
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "administrator") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { id } = await params
    const body = await request.json() as Record<string, unknown>
    const action = text(body.action, 40) as AdminRecommendation
    const notes = text(body.notes, 5000)
    const clientMessage = text(body.clientMessage, 3000)
    if (!ADMIN_RECOMMENDATIONS.includes(action)) return NextResponse.json({ error: "Select a valid recommendation." }, { status: 400 })
    if (!notes) return NextResponse.json({ error: "Internal recommendation notes are required." }, { status: 400 })
    if (action === "request_more_information" && !clientMessage) return NextResponse.json({ error: "Enter the information requested from the client." }, { status: 400 })

    const result = await withTransaction(async (client) => {
      const locked = await client.query<{ user_id: string; service_type: string; status: string }>(
        "SELECT user_id, service_type, status FROM requests WHERE id = $1 FOR UPDATE",
        [id],
      )
      const row = locked.rows[0]
      if (!row || !isCustomRequest(row.service_type)) throw new Error("NOT_FOUND")
      if (!new Set(["pending_admin_review", "returned_for_revision"]).has(row.status)) throw new Error("INVALID_TRANSITION")
      const nextStatus = statusForAdminRecommendation(action)
      await client.query(
        `UPDATE requests SET status = $2, admin_recommendation = $3::jsonb,
          admin_reviewed_by = $4, admin_reviewed_at = NOW(),
          client_facing_status_explanation = CASE WHEN $5 = '' THEN client_facing_status_explanation ELSE $5 END,
          updated_at = NOW() WHERE id = $1`,
        [id, nextStatus, JSON.stringify({ action, notes }), user.id, clientMessage],
      )
      await client.query(
        "INSERT INTO request_audit_events (request_id, actor_user_id, action, details) VALUES ($1, $2, 'custom_admin_recommendation', $3::jsonb)",
        [id, user.id, JSON.stringify({ action, previous_status: row.status, new_status: nextStatus })],
      )
      return { clientId: row.user_id, nextStatus }
    })

    const event = {
      request_id: id, resource_type: "request", resource_id: id,
    }
    if (result.nextStatus === "more_information_required") {
      await notifyUser(result.clientId, { type: "request_more_information_required", title: "More information required", message: clientMessage, metadata: event })
    } else {
      await notifySuperAdmins({ type: "custom_request_recommendation", title: "Custom request awaiting final review", message: "An administrator submitted a recommendation.", metadata: { ...event, audience: "super_administrator", target_page: "super_admin_request_review" } })
    }
    return NextResponse.json({ success: true, status: result.nextStatus })
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Request not found." }, { status: 404 })
    if (code === "INVALID_TRANSITION") return NextResponse.json({ error: "This request is no longer available for this action." }, { status: 409 })
    console.error("CUSTOM ADMIN RECOMMENDATION ERROR:", code || "Unknown error")
    return NextResponse.json({ error: "Unable to save the recommendation." }, { status: 500 })
  }
}
