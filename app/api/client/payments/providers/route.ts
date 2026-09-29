import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { flutterwaveSupportsCurrency, getFlutterwaveConfig } from "@/lib/payments/flutterwave"
export const dynamic = "force-dynamic"
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== "client") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const requestId = request.nextUrl.searchParams.get("request_id") || ""
  const result = await query<{
    currency: string
    request_status: string | null
    converted_case_id: string | null
    converted_training_engagement_id: string | null
    case_status: string | null
    case_payment_status: string | null
    training_status: string | null
    training_payment_status: string | null
    has_paid_payment: boolean
  }>(`
    SELECT
      q.currency,
      r.status AS request_status,
      r.converted_case_id,
      r.converted_training_engagement_id,
      c.status AS case_status,
      c.payment_status AS case_payment_status,
      te.status AS training_status,
      te.payment_status AS training_payment_status,
      EXISTS (
        SELECT 1 FROM payments paid
        WHERE paid.request_id = r.id AND paid.status = 'paid'
      ) AS has_paid_payment
    FROM requests r
    JOIN quote_versions q
      ON q.id = r.accepted_quote_version_id
     AND q.request_id = r.id
    LEFT JOIN user_profiles up ON up.user_id = r.user_id
    LEFT JOIN cases c
      ON c.id = r.converted_case_id
     AND c.case_user_id = up.id
    LEFT JOIN training_engagements te
      ON te.id = r.converted_training_engagement_id
     AND te.client_profile_id = up.id
    WHERE r.id = $1 AND r.user_id = $2
    LIMIT 1
  `, [requestId, user.id])
  const payment = result.rows[0]
  const currency = payment?.currency?.toUpperCase()
  if (!currency) return NextResponse.json({ error: "Quotation not found" }, { status: 404 })
  const hasCase = Boolean(payment.converted_case_id)
  const hasTraining = Boolean(payment.converted_training_engagement_id)
  const targetStatus = hasTraining ? payment.training_status : hasCase ? payment.case_status : null
  const targetPaymentStatus = hasTraining ? payment.training_payment_status : hasCase ? payment.case_payment_status : null
  const isPaid = payment.has_paid_payment || targetPaymentStatus === "paid"
  const canPay = payment.request_status === "awaiting_payment"
    && hasCase !== hasTraining
    && targetStatus === "awaiting_payment"
    && !isPaid
  return NextResponse.json({ providers: {
    paystack: { available: Boolean(process.env.PAYSTACK_SECRET_KEY), label: "Paystack" },
    flutterwave: { available: Boolean(getFlutterwaveConfig()) && flutterwaveSupportsCurrency(currency), label: "Flutterwave" },
  }, eligibility: {
    canPay,
    isPaid,
    targetType: hasTraining ? "training" : hasCase ? "case" : null,
    targetId: hasTraining ? payment.converted_training_engagement_id : hasCase ? payment.converted_case_id : null,
    targetStatus,
  } }, { headers: { "Cache-Control": "private, no-store" } })
}
