import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser, getIp } from "@/lib/auth"
import { withTransaction } from "@/lib/db"
import { isSameOriginMutation } from "@/lib/security-center"

export const dynamic = "force-dynamic"

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
  Expires: "0",
}

const SERVICE_KEYS = new Set([
  "digital_forensics",
  "ethical_hacking",
  "government_consulting",
  "correctional_intelligence",
  "legal_advisory",
  "research_threat_intelligence",
  "opsec_consulting",
])

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403, headers: NO_STORE })
  }

  const body = await request.json().catch(() => null) as { email?: unknown; service_key?: unknown } | null
  const serviceKey = typeof body?.service_key === "string" ? body.service_key : ""
  const email = normalizeEmail(body?.email)
  if (!SERVICE_KEYS.has(serviceKey) || !email) {
    return NextResponse.json({ error: "Enter a valid email address and try again." }, { status: 400, headers: NO_STORE })
  }

  const user = await getCurrentUser()
  const fingerprint = crypto.createHash("sha256").update(`service-launch:${getIp(request)}`).digest("hex")

  try {
    const accepted = await withTransaction(async (client) => {
      const rate = await client.query<{ submission_count: number }>(
        `INSERT INTO service_launch_interest_rate_limits
           (request_fingerprint_hash, window_started_at, submission_count)
         VALUES ($1, date_trunc('hour', NOW()), 1)
         ON CONFLICT (request_fingerprint_hash, window_started_at)
         DO UPDATE SET submission_count = service_launch_interest_rate_limits.submission_count + 1
         RETURNING submission_count`,
        [fingerprint],
      )
      if (Number(rate.rows[0]?.submission_count || 0) > 10) return false

      await client.query(
        `INSERT INTO service_launch_interests
           (service_key, email_normalized, user_id, consent_at, source, status)
         VALUES ($1, $2, $3, NOW(), 'public_homepage', 'active')
         ON CONFLICT (service_key, (lower(email_normalized)))
         DO UPDATE SET consent_at = NOW(), updated_at = NOW(), status = 'active',
           user_id = COALESCE(service_launch_interests.user_id, EXCLUDED.user_id),
           unsubscribed_at = NULL`,
        [serviceKey, email, user?.id || null],
      )
      return true
    })

    if (!accepted) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: NO_STORE })
    }

    return NextResponse.json(
      { message: "You're on the notification list. We'll email you when this service becomes available." },
      { headers: NO_STORE },
    )
  } catch {
    return NextResponse.json({ error: "We could not save your request. Please try again." }, { status: 503, headers: NO_STORE })
  }
}
