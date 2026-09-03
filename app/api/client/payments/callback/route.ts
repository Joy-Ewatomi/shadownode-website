import {
  NextRequest,
  NextResponse,
} from "next/server"

import { query } from "@/lib/db"

import {
  verifyAndCompletePaystackPayment,
} from "@/lib/services/paystack-payment-service"

export async function GET(
  request: NextRequest,
) {
  const reference =
    String(
      request.nextUrl.searchParams.get(
        "reference",
      ) || "",
    ).trim()

  console.log(
    "PAYSTACK CALLBACK RECEIVED",
    {
      reference,
    },
  )

  // =========================================================
  // 1. DEFAULT FALLBACK
  // =========================================================

  const fallbackUrl =
    new URL(
      "/dashboard/client/payments",
      request.nextUrl.origin,
    )

  // =========================================================
  // 2. VALIDATE REFERENCE
  // =========================================================

  if (!reference) {
    fallbackUrl.searchParams.set(
      "payment",
      "missing_reference",
    )

    return NextResponse.redirect(
      fallbackUrl,
    )
  }

  try {
    // =======================================================
    // 3. FIND LOCAL PAYMENT
    // =======================================================

    const localPayment =
      await query<{
        id: string
        request_id: string | null
        case_id: string | null
        training_engagement_id:
          | string
          | null
      }>(
        `
        SELECT
          id,
          request_id,
          case_id,
          training_engagement_id
        FROM payments
        WHERE provider = 'paystack'
          AND transaction_id = $1
        LIMIT 1
        `,
        [reference],
      )

    const payment =
      localPayment.rows[0]

    if (!payment) {
      console.warn(
        "PAYSTACK CALLBACK: LOCAL PAYMENT NOT FOUND",
        {
          reference,
        },
      )

      fallbackUrl.searchParams.set(
        "payment",
        "not_found",
      )

      return NextResponse.redirect(
        fallbackUrl,
      )
    }

    // =======================================================
    // 4. DETERMINE PAYMENT TYPE
    // =======================================================

    const paymentType =
      payment.training_engagement_id
        ? "training"
        : payment.case_id
          ? "case"
          : null

    if (!paymentType) {
      console.error(
        "PAYSTACK CALLBACK: PAYMENT HAS NO TARGET",
        {
          reference,
          paymentId: payment.id,
        },
      )

      fallbackUrl.searchParams.set(
        "payment",
        "invalid_payment",
      )

      return NextResponse.redirect(
        fallbackUrl,
      )
    }

    // =======================================================
    // 5. VERIFY PAYMENT
    // =======================================================

    const result =
      await verifyAndCompletePaystackPayment(
        reference,
      )

    console.log(
      "PAYSTACK VERIFICATION RESULT",
      result,
    )

    // =======================================================
    // 6. BUILD CLIENT TARGET
    // =======================================================

let target: URL

const trainingEngagementId =
  result.training_engagement_id ||
  payment.training_engagement_id

if (trainingEngagementId) {
  target = new URL(
    `/dashboard/training/${trainingEngagementId}`,
    request.nextUrl.origin,
  )
} else if (payment.request_id) {
  target = new URL(
    `/dashboard/client/payments/${payment.request_id}`,
    request.nextUrl.origin,
  )
} else {
  target = new URL(
    "/dashboard/client/payments",
    request.nextUrl.origin,
  )
}

    // =======================================================
    // 7. SUCCESS
    // =======================================================

    if (result.success) {
      target.searchParams.set(
        "payment",
        "success",
      )

      target.searchParams.set(
        "payment_type",
        result.payment_type ||
          paymentType,
      )

      if (result.payment_id) {
        target.searchParams.set(
          "payment_id",
          result.payment_id,
        )
      }

      if (result.request_id) {
        target.searchParams.set(
          "request_id",
          result.request_id,
        )
      }

      if (result.case_id) {
        target.searchParams.set(
          "case_id",
          result.case_id,
        )
      }

      if (
        result.training_engagement_id
      ) {
        target.searchParams.set(
          "training_engagement_id",
          result.training_engagement_id,
        )
      }

      return NextResponse.redirect(
        target,
      )
    }

    // =======================================================
    // 8. PAYMENT NOT SUCCESSFUL YET
    // =======================================================

    target.searchParams.set(
      "payment",
      "pending",
    )

    target.searchParams.set(
      "payment_type",
      result.payment_type ||
        paymentType,
    )

    target.searchParams.set(
      "status",
      result.status ||
        "unknown",
    )

    if (result.payment_id) {
      target.searchParams.set(
        "payment_id",
        result.payment_id,
      )
    }

    if (result.case_id) {
      target.searchParams.set(
        "case_id",
        result.case_id,
      )
    }

    if (
      result.training_engagement_id
    ) {
      target.searchParams.set(
        "training_engagement_id",
        result.training_engagement_id,
      )
    }

    return NextResponse.redirect(
      target,
    )
  } catch (error) {
    console.error(
      "PAYSTACK CALLBACK ERROR",
      error,
    )

    fallbackUrl.searchParams.set(
      "payment",
      "verification_failed",
    )

    return NextResponse.redirect(
      fallbackUrl,
    )
  }
}