import { NextRequest, NextResponse } from "next/server"

import {
  auditLog,
  decryptSecret,
  getCurrentUser,
  verifyTotp,
} from "@/lib/auth"
import { query } from "@/lib/db"
import { canConfirmTwoFactorSetup, isSameOriginMutation } from "@/lib/security-center"

const INVALID_CODE = "Invalid authentication code"

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Request could not be verified" }, { status: 403 })
  }

  const user = await getCurrentUser()
  const body = await request.json().catch(() => null)
  const code = body && typeof body.code === "string" ? body.code.trim() : ""
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.totp_enabled) {
    return NextResponse.json({ error: "Two-factor authentication is already enabled" }, { status: 409 })
  }

  const failures = await query<{ total: string }>(
    `
      SELECT COUNT(*)::text AS total
      FROM audit_logs
      WHERE user_id = $1
        AND action = 'two_factor_setup_failed'
        AND created_at > now() - interval '15 minutes'
    `,
    [user.id],
  )
  if (Number(failures.rows[0]?.total || 0) >= 5) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }

  const { rows } = await query<{ totp_secret_encrypted: string | null }>(
    "SELECT totp_secret_encrypted FROM app_users WHERE id = $1 LIMIT 1",
    [user.id],
  )
  const encrypted = rows[0]?.totp_secret_encrypted
  let valid = false
  if (encrypted && /^\d{6}$/.test(code)) {
    try {
      valid = verifyTotp(decryptSecret(encrypted), code)
    } catch {
      valid = false
    }
  }

  if (!canConfirmTwoFactorSetup(user.totp_enabled, valid)) {
    await auditLog(user.id, "two_factor_setup_failed", request)
    return NextResponse.json({ error: INVALID_CODE }, { status: 400 })
  }

  const enabled = await query<{ id: string }>(
    `
      UPDATE app_users
      SET totp_enabled = true, updated_at = now()
      WHERE id = $1 AND totp_enabled = false
      RETURNING id
    `,
    [user.id],
  )
  if (!enabled.rows[0]) {
    return NextResponse.json({ error: "Two-factor authentication is already enabled" }, { status: 409 })
  }

  await auditLog(user.id, "two_factor_enabled", request)
  return NextResponse.json(
    { message: "Two-factor authentication enabled" },
    { headers: { "Cache-Control": "private, no-store" } },
  )
}
