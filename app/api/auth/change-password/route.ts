import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth"
import { evaluatePassword } from "@/lib/password-policy"
import { query } from "@/lib/db"
import { isSameOriginMutation } from "@/lib/security-center"

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified" }, { status: 403 })
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => null)
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : ""
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : ""
  const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : ""
  if (newPassword !== confirmPassword) return NextResponse.json({ error: "New passwords do not match" }, { status: 400 })
  const passwordPolicy = evaluatePassword(newPassword)
  if (!passwordPolicy.valid) return NextResponse.json({ error: passwordPolicy.message }, { status: 400 })
  const recent = await query<{ total: string }>("SELECT COUNT(*)::text AS total FROM audit_logs WHERE user_id = $1 AND action = 'password_change_failed' AND created_at > now() - interval '15 minutes'", [user.id])
  if (Number(recent.rows[0]?.total || 0) >= 5) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  const result = await query<{ password_hash: string }>("SELECT password_hash FROM app_users WHERE id = $1 LIMIT 1", [user.id])
  const validCurrent = Boolean(result.rows[0]) && await verifyPassword(currentPassword, result.rows[0].password_hash)
  if (!validCurrent) {
    await auditLog(user.id, "password_change_failed", request)
    return NextResponse.json({ error: "Current password could not be verified. OAuth-only accounts can use password reset first." }, { status: 400 })
  }
  if (await verifyPassword(newPassword, result.rows[0].password_hash)) return NextResponse.json({ error: "Choose a password different from your current password." }, { status: 400 })
  await query("UPDATE app_users SET password_hash = $1, updated_at = now() WHERE id = $2", [await hashPassword(newPassword), user.id])
  await auditLog(user.id, "password_changed", request)
  return NextResponse.json({ message: "Password changed successfully." }, { headers: { "Cache-Control": "private, no-store" } })
}
