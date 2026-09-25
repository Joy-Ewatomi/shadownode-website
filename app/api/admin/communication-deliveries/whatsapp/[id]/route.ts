import { NextRequest, NextResponse } from "next/server"

import { auditLog, getCurrentUser, isAdminRole } from "@/lib/auth"
import { withTransaction } from "@/lib/db"
import { isSameOriginMutation } from "@/lib/security-center"

export const dynamic = "force-dynamic"
export const revalidate = 0
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, private" }

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403, headers: NO_STORE })
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE })
  if (!isAdminRole(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE })

  const { id } = await context.params
  const body = await request.json().catch(() => null) as { action?: unknown; reason?: unknown } | null
  const action = body?.action
  if (action !== "confirm_sent" && action !== "cancel") {
    return NextResponse.json({ error: "Unsupported delivery action." }, { status: 400, headers: NO_STORE })
  }
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 300) : null

  const changed = await withTransaction(async (client) => {
    const locked = await client.query<{ status: string }>(
      `SELECT status FROM notification_delivery_attempts
       WHERE id = $1 AND channel = 'whatsapp' FOR UPDATE`, [id],
    )
    if (!locked.rows[0] || !["pending", "ready"].includes(locked.rows[0].status)) return false
    if (action === "confirm_sent" && locked.rows[0].status !== "ready") return false
    if (action === "confirm_sent") {
      await client.query(
        `UPDATE notification_delivery_attempts SET status = 'manually_sent', reviewed_by = $2,
          reviewed_at = COALESCE(reviewed_at, now()), manually_sent_by = $2, manually_sent_at = now()
         WHERE id = $1`, [id, user.id],
      )
    } else {
      await client.query(
        `UPDATE notification_delivery_attempts SET status = 'cancelled', reviewed_by = $2,
          reviewed_at = COALESCE(reviewed_at, now()), cancelled_by = $2, cancelled_at = now(), cancellation_reason = $3
         WHERE id = $1`, [id, user.id, reason || "Cancelled by an authorized operator."],
      )
    }
    return true
  })
  if (!changed) return NextResponse.json({ error: "This delivery is no longer available for that action." }, { status: 409, headers: NO_STORE })
  await auditLog(user.id, action === "confirm_sent" ? "whatsapp_delivery_manually_confirmed" : "whatsapp_delivery_cancelled", request, { delivery_attempt_id: id })
  return NextResponse.json({ success: true, status: action === "confirm_sent" ? "manually_sent" : "cancelled" }, { headers: NO_STORE })
}
