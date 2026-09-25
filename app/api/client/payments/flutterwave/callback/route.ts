import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { getTrustedApplicationOrigin } from "@/lib/app-origin"
import { isSafeFlutterwaveReference } from "@/lib/payments/flutterwave"
import { verifyAndCompleteFlutterwavePayment } from "@/lib/services/flutterwave-payment-service"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const origin = getTrustedApplicationOrigin() || request.nextUrl.origin
  const fallback = new URL("/dashboard/client/payments", origin)
  const user = await getCurrentUser()
  if (!user || user.role !== "client") return NextResponse.redirect(new URL("/login", origin), { headers: { "Cache-Control": "no-store" } })

  const txRef = request.nextUrl.searchParams.get("tx_ref") || ""
  const transactionId = request.nextUrl.searchParams.get("transaction_id") || ""
  if (!isSafeFlutterwaveReference(txRef) || !/^\d{1,20}$/.test(transactionId)) {
    fallback.searchParams.set("payment", "verification_pending")
    return NextResponse.redirect(fallback, { headers: { "Cache-Control": "no-store" } })
  }

  const local = await query<{ request_id: string }>(
    `SELECT p.request_id FROM payments p JOIN requests r ON r.id=p.request_id
     WHERE p.provider='flutterwave' AND p.provider_reference=$1 AND r.user_id=$2 LIMIT 1`,
    [txRef, user.id],
  )
  const payment = local.rows[0]
  if (!payment) return NextResponse.redirect(fallback, { headers: { "Cache-Control": "no-store" } })

  const destination = new URL(`/dashboard/client/payments/${payment.request_id}`, origin)
  try {
    await verifyAndCompleteFlutterwavePayment(txRef, transactionId)
    destination.searchParams.set("payment", "processing")
  } catch {
    destination.searchParams.set("payment", "verification_pending")
  }
  return NextResponse.redirect(destination, { headers: { "Cache-Control": "no-store" } })
}
