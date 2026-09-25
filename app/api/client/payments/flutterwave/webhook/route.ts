import { NextRequest, NextResponse } from "next/server"
import {
  getFlutterwaveConfig,
  isSafeFlutterwaveReference,
  verifyFlutterwaveWebhookSignature,
} from "@/lib/payments/flutterwave"
import { verifyAndCompleteFlutterwavePayment } from "@/lib/services/flutterwave-payment-service"

export const dynamic = "force-dynamic"
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, private" }

export async function POST(request: NextRequest) {
  const config = getFlutterwaveConfig()
  if (!config) return NextResponse.json({ error: "Webhook unavailable" }, { status: 503, headers: NO_STORE })

  const rawBody = await request.text()
  const signature = request.headers.get("flutterwave-signature")
  if (!verifyFlutterwaveWebhookSignature(rawBody, signature, config.secretHash)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401, headers: NO_STORE })
  }

  let event: { type?: string; event?: string; data?: { id?: number; tx_ref?: string; status?: string } }
  try {
    event = JSON.parse(rawBody) as typeof event
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE })
  }
  const txRef = String(event.data?.tx_ref || "")
  const transactionId = String(event.data?.id || "")
  if (!isSafeFlutterwaveReference(txRef) || !/^\d{1,20}$/.test(transactionId)) {
    return NextResponse.json({ received: true, processed: false }, { headers: NO_STORE })
  }

  if (!String(event.type || event.event || "").includes("charge") || event.data?.status !== "successful") {
    return NextResponse.json({ received: true, ignored: true }, { headers: NO_STORE })
  }

  try {
    const result = await verifyAndCompleteFlutterwavePayment(txRef, transactionId)
    return NextResponse.json({ received: true, processed: result.success, already_processed: "already_processed" in result ? result.already_processed || false : false }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500, headers: NO_STORE })
  }
}
