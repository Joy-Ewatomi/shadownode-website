import { NextRequest, NextResponse } from "next/server"

import { auditLog, decryptSecret, getCurrentUser, verifyPassword, verifyTotp } from "@/lib/auth"
import { query, withTransaction } from "@/lib/db"
import { consumeRecoveryCode } from "@/lib/recovery-codes"
import { isSameOriginMutation } from "@/lib/security-center"

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0" }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS })

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return json({ error: "Request could not be verified" }, 403)
  const user = await getCurrentUser()
  if (!user) return json({ error: "Unauthorized" }, 401)
  const body = await request.json().catch(() => null)
  const password = typeof body?.password === "string" ? body.password : ""
  const code = typeof body?.code === "string" ? body.code.trim() : ""

  const recent = await query<{ total: string }>(
    "SELECT COUNT(*)::text AS total FROM audit_logs WHERE user_id = $1 AND action = 'two_factor_disable_failed' AND created_at > now() - interval '15 minutes'",
    [user.id],
  )
  if (Number(recent.rows[0]?.total || 0) >= 5) return json({ error: "Too many attempts. Try again later." }, 429)

  const disabled = await withTransaction(async (client) => {
    const result = await client.query<{
      password_hash: string
      password_login_enabled: boolean
      totp_secret_encrypted: string | null
      totp_enabled: boolean
    }>(
      `SELECT password_hash, password_login_enabled, totp_secret_encrypted, totp_enabled
       FROM app_users WHERE id = $1 LIMIT 1 FOR UPDATE`,
      [user.id],
    )
    const account = result.rows[0]
    if (!account?.totp_enabled || !account.password_login_enabled || !await verifyPassword(password, account.password_hash)) return false

    let secondFactorValid = false
    if (account.totp_secret_encrypted && /^\d{6}$/.test(code)) {
      try { secondFactorValid = verifyTotp(decryptSecret(account.totp_secret_encrypted), code) } catch { secondFactorValid = false }
    }
    if (!secondFactorValid) secondFactorValid = await consumeRecoveryCode(client, user.id, code)
    if (!secondFactorValid) return false

    await client.query(
      `UPDATE app_users
       SET totp_enabled = false, totp_secret_encrypted = NULL,
           recovery_codes_encrypted = NULL, updated_at = now()
       WHERE id = $1`,
      [user.id],
    )
    await client.query("DELETE FROM two_factor_recovery_codes WHERE user_id = $1", [user.id])
    await client.query(
      "UPDATE pending_two_factor_challenges SET consumed_at = COALESCE(consumed_at, now()) WHERE user_id = $1 AND consumed_at IS NULL",
      [user.id],
    )
    return true
  }).catch(() => false)

  if (!disabled) {
    await auditLog(user.id, "two_factor_disable_failed", request)
    return json({ error: "Reauthentication could not be verified." }, 400)
  }
  await auditLog(user.id, "two_factor_disabled", request)
  return json({ message: "Two-factor authentication disabled. Your current session remains active." })
}
