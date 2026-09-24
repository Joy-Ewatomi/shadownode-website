import QRCode from "qrcode"
import { NextRequest, NextResponse } from "next/server"

import {
  auditLog,
  encryptSecret,
  generateTotpSecret,
  getCurrentUser,
  totpUri,
} from "@/lib/auth"
import { query } from "@/lib/db"
import { isSameOriginMutation } from "@/lib/security-center"

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Request could not be verified" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.totp_enabled) {
    return NextResponse.json({ error: "Two-factor authentication is already enabled" }, { status: 409 })
  }

  const recent = await query<{ total: string }>(
    `
      SELECT COUNT(*)::text AS total
      FROM audit_logs
      WHERE user_id = $1
        AND action = 'two_factor_setup_started'
        AND created_at > now() - interval '1 hour'
    `,
    [user.id],
  )
  if (Number(recent.rows[0]?.total || 0) >= 5) {
    return NextResponse.json({ error: "Too many setup attempts. Try again later." }, { status: 429 })
  }

  const secret = generateTotpSecret()
  const provisioningUri = totpUri(user.email, secret)
  await query(
    `
      UPDATE app_users
      SET totp_secret_encrypted = $1, totp_enabled = false, updated_at = now()
      WHERE id = $2 AND totp_enabled = false
    `,
    [encryptSecret(secret), user.id],
  )
  await auditLog(user.id, "two_factor_setup_started", request)

  return NextResponse.json({
    secret,
    qrCodeDataUrl: await QRCode.toDataURL(provisioningUri, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
    }),
  }, {
    headers: { "Cache-Control": "private, no-store" },
  })
}
