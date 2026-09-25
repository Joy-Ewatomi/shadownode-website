import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { withTransaction, query } from "@/lib/db"
import { getTrustedApplicationOrigin } from "@/lib/app-origin"
import { isSameOriginMutation } from "@/lib/security-center"
import {
  FLUTTERWAVE_API_BASE,
  flutterwaveSupportsCurrency,
  getFlutterwaveConfig,
} from "@/lib/payments/flutterwave"

export const dynamic = "force-dynamic"
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, private" }

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403, headers: NO_STORE })
  }

  const user = await getCurrentUser()
  if (!user || user.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE })
  }
  if (!user.email_verified_at) {
    return NextResponse.json({ error: "A verified email is required." }, { status: 403, headers: NO_STORE })
  }

  const config = getFlutterwaveConfig()
  const origin = getTrustedApplicationOrigin()
  if (!config || !origin) {
    return NextResponse.json({ error: "Flutterwave is currently unavailable." }, { status: 503, headers: NO_STORE })
  }

  const body = await request.json().catch(() => null) as { request_id?: unknown } | null
  const requestId = typeof body?.request_id === "string" ? body.request_id.trim() : ""
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    return NextResponse.json({ error: "Payment request is invalid." }, { status: 400, headers: NO_STORE })
  }

  const txRef = `SOB-FLW-${crypto.randomBytes(24).toString("base64url")}`
  const attempt = await withTransaction(async (client) => {
    const locked = await client.query<{
      id: string; title: string | null; accepted_quote_version_id: string
      amount: string; currency: string; quote_status: string
      converted_case_id: string | null; converted_training_engagement_id: string | null
      organization_id: string | null
    }>(
      `SELECT r.id, r.title, r.accepted_quote_version_id,
              q.price AS amount, q.currency, q.status AS quote_status,
              r.converted_case_id, r.converted_training_engagement_id,
              COALESCE(c.organization_id, te.organization_id) AS organization_id
       FROM requests r
       JOIN quote_versions q ON q.id = r.accepted_quote_version_id AND q.request_id = r.id
       LEFT JOIN cases c ON c.id = r.converted_case_id
       LEFT JOIN training_engagements te ON te.id = r.converted_training_engagement_id
       WHERE r.id = $1 AND r.user_id = $2 FOR UPDATE OF r, q`,
      [requestId, user.id],
    )
    const item = locked.rows[0]
    if (!item || !["accepted", "paid"].includes(item.quote_status)) throw new Error("NOT_PAYABLE")
    if (!flutterwaveSupportsCurrency(item.currency)) throw new Error("UNSUPPORTED_CURRENCY")
    const paid = await client.query(`SELECT 1 FROM payments WHERE quote_version_id=$1 AND status='paid' LIMIT 1`, [item.accepted_quote_version_id])
    if (paid.rows[0]) throw new Error("ALREADY_PAID")
    if ((!item.converted_case_id && !item.converted_training_engagement_id) || (item.converted_case_id && item.converted_training_engagement_id)) throw new Error("NOT_PAYABLE")
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO payments
       (case_id, amount, currency, provider, transaction_id, status, organization_id,
        request_id, training_engagement_id, quote_version_id, provider_reference, initiated_at)
       VALUES ($1,$2,$3,'flutterwave',$4,'pending',$5,$6,$7,$8,$4,NOW()) RETURNING id`,
      [item.converted_case_id, item.amount, item.currency, txRef, item.organization_id,
       item.id, item.converted_training_engagement_id, item.accepted_quote_version_id],
    )
    return { ...item, paymentId: inserted.rows[0].id }
  }).catch((error: unknown) => {
    const code = error instanceof Error ? error.message : ""
    if (["NOT_PAYABLE", "UNSUPPORTED_CURRENCY", "ALREADY_PAID"].includes(code)) return { error: code } as const
    throw error
  })

  if ("error" in attempt) {
    const message = attempt.error === "UNSUPPORTED_CURRENCY"
      ? "Flutterwave is unavailable for this quotation currency."
      : attempt.error === "ALREADY_PAID" ? "Payment has already been completed." : "This quotation is not payable."
    return NextResponse.json({ error: message }, { status: 409, headers: NO_STORE })
  }

  const redirectUrl = new URL("/api/client/payments/flutterwave/callback", origin).toString()
  const providerResponse = await fetch(`${FLUTTERWAVE_API_BASE}/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: txRef,
      amount: attempt.amount,
      currency: attempt.currency,
      redirect_url: redirectUrl,
      customer: { email: user.email, name: user.username },
      customizations: { title: "ShadowNode Operations Bureau", description: attempt.title || "Service payment" },
      meta: { payment_id: attempt.paymentId },
      configurations: { session_duration: 10, max_retry_attempt: 5 },
    }),
    cache: "no-store",
  })
  const data = await providerResponse.json().catch(() => null) as { status?: string; data?: { link?: string } } | null
  const checkoutUrl = data?.data?.link
  if (!providerResponse.ok || data?.status !== "success" || !checkoutUrl?.startsWith("https://checkout.flutterwave.com/")) {
    await query(`UPDATE payments SET status='failed', failure_reason_category='provider_initialization_error' WHERE id=$1 AND status='pending'`, [attempt.paymentId])
    return NextResponse.json({ error: "Unable to start Flutterwave checkout." }, { status: 502, headers: NO_STORE })
  }

  await query(`UPDATE payments SET checkout_url=$2 WHERE id=$1 AND status='pending'`, [attempt.paymentId, checkoutUrl])
  return NextResponse.json({ checkout_url: checkoutUrl, reference: txRef, payment_id: attempt.paymentId }, { headers: NO_STORE })
}
