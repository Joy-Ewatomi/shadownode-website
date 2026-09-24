import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { withTransaction } from "@/lib/db"
import { isSameOriginMutation } from "@/lib/security-center"
import { isCustomRequest } from "@/lib/custom-request-workflow"
import { notifyAdmins } from "@/lib/services/notification-service"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403 })
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { id } = await params
    const body = await request.json() as Record<string, unknown>
    const information = typeof body.information === "string" ? body.information.trim() : ""
    if (!information || information.length > 5000) return NextResponse.json({ error: "Enter the requested information (maximum 5,000 characters)." }, { status: 400 })
    await withTransaction(async (client) => {
      const locked = await client.query<{ service_type: string; status: string }>(
        "SELECT service_type, status FROM requests WHERE id = $1 AND user_id = $2 FOR UPDATE",
        [id, user.id],
      )
      const row = locked.rows[0]
      if (!row || !isCustomRequest(row.service_type)) throw new Error("NOT_FOUND")
      if (row.status !== "more_information_required") throw new Error("INVALID_TRANSITION")
      await client.query(
        "INSERT INTO request_amendments (request_id, submitted_by, content) VALUES ($1, $2, $3::jsonb)",
        [id, user.id, JSON.stringify({ information })],
      )
      await client.query("UPDATE requests SET status = 'pending_admin_review', updated_at = NOW() WHERE id = $1", [id])
      await client.query(
        "INSERT INTO request_audit_events (request_id, actor_user_id, action, details) VALUES ($1, $2, 'custom_additional_information_submitted', $3::jsonb)",
        [id, user.id, JSON.stringify({ previous_status: row.status, new_status: "pending_admin_review" })],
      )
    })
    await notifyAdmins({
      type: "client_request",
      title: "Additional custom-request information received",
      message: "The client supplied the requested additional information.",
      metadata: { request_id: id, resource_type: "request", resource_id: id, audience: "administrator", target_page: "admin_request_review" },
    })
    return NextResponse.json({ success: true, status: "pending_admin_review" })
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Request not found." }, { status: 404 })
    if (code === "INVALID_TRANSITION") return NextResponse.json({ error: "Additional information is not currently requested." }, { status: 409 })
    console.error("CUSTOM REQUEST AMENDMENT ERROR:", code || "Unknown error")
    return NextResponse.json({ error: "Unable to submit additional information." }, { status: 500 })
  }
}
