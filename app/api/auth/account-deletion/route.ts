import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser, getIp, verifyPassword } from "@/lib/auth"
import { query } from "@/lib/db"
import { deletionCoolingOffDate, isSameOriginMutation } from "@/lib/security-center"

function unavailable(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "42P01"
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const result = await query<{ status: string; requested_at: string; cooling_off_ends_at: string }>("SELECT status, requested_at, cooling_off_ends_at FROM account_deletion_requests WHERE user_id = $1 ORDER BY requested_at DESC LIMIT 1", [user.id])
    return NextResponse.json({ available: true, request: result.rows[0] || null }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    if (unavailable(error)) return NextResponse.json({ available: false, error: "Account deletion requests require the pending reviewed migration." }, { status: 503 })
    throw error
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified" }, { status: 403 })
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => null)
  const password = typeof body?.password === "string" ? body.password : ""
  const confirmation = typeof body?.confirmation === "string" ? body.confirmation : ""
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : ""
  if (confirmation !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm the request." }, { status: 400 })
  const recent = await query<{ total: string }>("SELECT COUNT(*)::text AS total FROM audit_logs WHERE user_id = $1 AND action = 'account_deletion_request_failed' AND created_at > now() - interval '15 minutes'", [user.id])
  if (Number(recent.rows[0]?.total || 0) >= 5) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  const account = await query<{ password_hash: string }>("SELECT password_hash FROM app_users WHERE id = $1 LIMIT 1", [user.id])
  if (!account.rows[0] || !await verifyPassword(password, account.rows[0].password_hash)) {
    await auditLog(user.id, "account_deletion_request_failed", request)
    return NextResponse.json({ error: "Reauthentication could not be verified." }, { status: 400 })
  }
  try {
    const coolingOffEndsAt = deletionCoolingOffDate()
    const result = await query<{ status: string; requested_at: string; cooling_off_ends_at: string }>(`INSERT INTO account_deletion_requests (user_id, reason, cooling_off_ends_at, created_ip, created_user_agent)
      VALUES ($1, NULLIF($2, ''), $3, $4, $5)
      ON CONFLICT (user_id) WHERE status = 'pending' DO UPDATE SET reason = EXCLUDED.reason
      RETURNING status, requested_at, cooling_off_ends_at`, [user.id, reason, coolingOffEndsAt, getIp(request), request.headers.get("user-agent")?.slice(0, 500) || null])
    await auditLog(user.id, "account_deletion_requested", request, { cooling_off_days: 30 })
    return NextResponse.json({ message: "Deletion request submitted for review.", request: result.rows[0] }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    if (unavailable(error)) return NextResponse.json({ error: "Account deletion requests are not available until the reviewed migration is applied." }, { status: 503 })
    throw error
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified" }, { status: 403 })
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const result = await query("UPDATE account_deletion_requests SET status = 'cancelled' WHERE user_id = $1 AND status = 'pending' RETURNING id", [user.id])
    if (!result.rows[0]) return NextResponse.json({ error: "No pending deletion request was found." }, { status: 404 })
    await auditLog(user.id, "account_deletion_request_cancelled", request)
    return NextResponse.json({ message: "Deletion request cancelled." }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    if (unavailable(error)) return NextResponse.json({ error: "Account deletion requests are not available until the reviewed migration is applied." }, { status: 503 })
    throw error
  }
}
