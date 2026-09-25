import { query } from "@/lib/db"
import {
  FLUTTERWAVE_API_BASE,
  getFlutterwaveConfig,
  isSafeFlutterwaveReference,
  moneyToMinorUnits,
} from "@/lib/payments/flutterwave"
import {
  completeVerifiedPayment,
  recordPaymentFailure,
} from "@/lib/services/payment-completion-service"

type VerificationPayload = {
  status?: string
  data?: {
    id?: number
    tx_ref?: string
    amount?: number | string
    currency?: string
    status?: string
    created_at?: string
  }
}

export async function verifyAndCompleteFlutterwavePayment(
  txRef: string,
  transactionId: string,
) {
  if (!isSafeFlutterwaveReference(txRef) || !/^\d{1,20}$/.test(transactionId)) {
    throw new Error("Payment verification information is invalid")
  }

  const config = getFlutterwaveConfig()
  if (!config) throw new Error("Payment provider is unavailable")

  const local = await query<{
    id: string
    request_id: string
    amount: string
    currency: string
    status: string
    quote_version_id: string
    accepted_quote_version_id: string
  }>(
    `SELECT p.id, p.request_id, p.amount, p.currency, p.status,
            p.quote_version_id, r.accepted_quote_version_id
     FROM payments p JOIN requests r ON r.id = p.request_id
     WHERE p.provider = 'flutterwave' AND p.provider_reference = $1 LIMIT 1`,
    [txRef],
  )

  const payment = local.rows[0]
  if (!payment || payment.quote_version_id !== payment.accepted_quote_version_id) {
    throw new Error("Payment attempt was not found")
  }

  const response = await fetch(
    `${FLUTTERWAVE_API_BASE}/transactions/${encodeURIComponent(transactionId)}/verify`,
    {
      headers: { Authorization: `Bearer ${config.secretKey}`, Accept: "application/json" },
      cache: "no-store",
    },
  )
  const payload = (await response.json().catch(() => null)) as VerificationPayload | null
  if (!response.ok || payload?.status !== "success" || !payload.data) {
    throw new Error("Payment verification is temporarily unavailable")
  }

  const data = payload.data
  if (data.tx_ref !== txRef) {
    await recordPaymentFailure(payment.id, payment.request_id, "reference_mismatch")
    throw new Error("Payment verification failed")
  }
  if (String(data.id) !== transactionId) {
    await recordPaymentFailure(payment.id, payment.request_id, "provider_transaction_mismatch")
    throw new Error("Payment verification failed")
  }
  if (data.status !== "successful") {
    return {
      success: false,
      payment_id: payment.id,
      request_id: payment.request_id,
      status: data.status || "pending",
    }
  }

  const expected = moneyToMinorUnits(payment.amount, payment.currency)
  const received = moneyToMinorUnits(data.amount ?? "", payment.currency)
  if (expected === null || received === null || expected !== received) {
    await recordPaymentFailure(payment.id, payment.request_id, "amount_mismatch")
    throw new Error("Payment requires review")
  }
  if (String(data.currency || "").toUpperCase() !== payment.currency.toUpperCase()) {
    await recordPaymentFailure(payment.id, payment.request_id, "currency_mismatch")
    throw new Error("Payment requires review")
  }

  return completeVerifiedPayment({
    paymentId: payment.id,
    provider: "flutterwave",
    providerTransactionId: transactionId,
    paidAt: data.created_at || null,
  })
}
