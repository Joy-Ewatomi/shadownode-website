import { NextRequest, NextResponse } from "next/server"
import { auditLog, decryptSecret, getCurrentUser, verifyPassword, verifyTotp } from "@/lib/auth"
import { query } from "@/lib/db"
import { generateRecoveryCodes, isSameOriginMutation, serializeRecoveryCodeHashes } from "@/lib/security-center"

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified" }, { status: 403 })
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => null)
  const password = typeof body?.password === "string" ? body.password : ""
  const code = typeof body?.code === "string" ? body.code.trim() : ""
  const recent = await query<{ total: string }>("SELECT COUNT(*)::text AS total FROM audit_logs WHERE user_id = $1 AND action = 'recovery_codes_failed' AND created_at > now() - interval '15 minutes'", [user.id])
  if (Number(recent.rows[0]?.total || 0) >= 5) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  const result = await query<{ password_hash: string; totp_secret_encrypted: string | null; totp_enabled: boolean }>("SELECT password_hash, totp_secret_encrypted, totp_enabled FROM app_users WHERE id = $1 LIMIT 1", [user.id])
  const account = result.rows[0]
  let validCode = false
  try { validCode = Boolean(account?.totp_secret_encrypted) && verifyTotp(decryptSecret(account.totp_secret_encrypted!), code) } catch { validCode = false }
  if (!account?.totp_enabled || !await verifyPassword(password, account.password_hash) || !validCode) {
    await auditLog(user.id, "recovery_codes_failed", request)
    return NextResponse.json({ error: "Reauthentication could not be verified." }, { status: 400 })
  }
  const codes = generateRecoveryCodes()
  await query("UPDATE app_users SET recovery_codes_encrypted = $1, updated_at = now() WHERE id = $2", [serializeRecoveryCodeHashes(codes), user.id])
  await auditLog(user.id, "recovery_codes_regenerated", request)
  return NextResponse.json({ codes, message: "Old recovery codes were invalidated. Store these new codes securely; they will not be shown again." }, { headers: { "Cache-Control": "private, no-store" } })
}
