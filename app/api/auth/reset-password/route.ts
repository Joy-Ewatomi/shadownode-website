import { NextRequest, NextResponse } from "next/server"
import { auditLog, getIp, hashPassword, hashToken } from "@/lib/auth"
import { query, withTransaction } from "@/lib/db"
import { evaluatePassword } from "@/lib/password-policy"
import { isUsablePasswordReset } from "@/lib/password-reset"

const INVALID_RESET = "Reset link is invalid or expired. Please request a new reset link."

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const token = typeof body?.token === "string" ? body.token.trim() : ""
  const password = typeof body?.password === "string" ? body.password : null
  const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : null
  if (!token || password === null) return NextResponse.json({ error: INVALID_RESET }, { status: 400 })
  if (confirmPassword !== password) return NextResponse.json({ error: "Passwords do not match" }, { status: 400 })
  const passwordPolicy = evaluatePassword(password)
  if (!passwordPolicy.valid) return NextResponse.json({ error: passwordPolicy.message }, { status: 400 })

  const requestIp = getIp(request)
  if (requestIp) {
    const recent = await query<{ total: string }>(
      "SELECT COUNT(*)::text AS total FROM audit_logs WHERE action = 'password_reset_failed' AND ip = $1::inet AND created_at > now() - interval '15 minutes'",
      [requestIp],
    )
    if (Number(recent.rows[0]?.total || 0) >= 10) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 })
    }
  }

  const userId = await withTransaction(async (client) => {
    const result = await client.query<{ id: string; user_id: string; expires_at: string; used_at: string | null }>(
      "SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = $1 LIMIT 1 FOR UPDATE",
      [hashToken(token)],
    )
    const reset = result.rows[0]
    if (!isUsablePasswordReset(reset)) return null
    const consumed = await client.query(
      "UPDATE password_resets SET used_at = NOW() WHERE id = $1 AND used_at IS NULL RETURNING id",
      [reset.id],
    )
    if (!consumed.rows[0]) return null
    await client.query("UPDATE app_users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [await hashPassword(password), reset.user_id])
    await client.query("DELETE FROM sessions WHERE user_id = $1", [reset.user_id])
    return reset.user_id
  })

  if (!userId) {
    await auditLog(null, "password_reset_failed", request)
    return NextResponse.json({ error: INVALID_RESET }, { status: 400 })
  }
  await auditLog(userId, "password_change", request)
  return NextResponse.json({ message: "Password reset successfully. Please sign in again." }, { headers: { "Cache-Control": "private, no-store" } })
}
