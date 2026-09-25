import { NextRequest, NextResponse } from "next/server"

import { auditLog, hashToken } from "@/lib/auth"
import { withTransaction } from "@/lib/db"
import { deliverWelcomeEmail } from "@/lib/welcome-email"

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")
  if (!token) return NextResponse.json({ error: "Missing verification token" }, { status: 400 })

  const result = await withTransaction(async (client) => {
    const verification = await client.query<{
      id: string
      user_id: string
      expires_at: string
      used_at: string | null
      email: string
      role: string
      full_name: string | null
    }>(
      `SELECT ev.id, ev.user_id, ev.expires_at, ev.used_at, au.email, au.role, up.full_name
       FROM email_verifications ev
       JOIN app_users au ON au.id = ev.user_id
       LEFT JOIN user_profiles up ON up.user_id = au.id
       WHERE ev.token_hash = $1
       LIMIT 1
       FOR UPDATE OF ev`,
      [hashToken(token)],
    )
    const row = verification.rows[0]
    if (!row || new Date(row.expires_at) <= new Date()) return null
    const newlyVerified = !row.used_at
    if (newlyVerified) {
      await client.query("UPDATE app_users SET email_verified_at = NOW(), status = 'active', updated_at = NOW() WHERE id = $1", [row.user_id])
      await client.query("UPDATE email_verifications SET used_at = NOW() WHERE id = $1 AND used_at IS NULL", [row.id])
    }
    return { ...row, newlyVerified }
  })

  if (!result) return NextResponse.json({ error: "This verification link is invalid or expired" }, { status: 400 })
  if (result.newlyVerified) await auditLog(result.user_id, "email_verified", request)
  if (result.role === "client") {
    await deliverWelcomeEmail({
      userId: result.user_id,
      email: result.email,
      recipientName: result.full_name,
      registerEligibility: result.newlyVerified,
    })
  }
  return NextResponse.redirect(new URL("/login?verified=1", request.url))
}
