import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  query,
} from "@/lib/db"

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

  /*
   * Where the client should land after
   * Paystack processing.
   */
  const fallbackUrl =
    new URL(
      "/dashboard/client/payments",
      request.nextUrl.origin,
    )

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
    /*
     * Find our local payment first.
     */
    const localPayment =
      await query<{
        request_id: string | null
        case_id: string
      }>(
        `
        SELECT
          request_id,
          case_id
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
      fallbackUrl.searchParams.set(
        "payment",
        "not_found",
      )

      return NextResponse.redirect(
        fallbackUrl,
      )
    }

    const result =
      await verifyAndCompletePaystackPayment(
        reference,
      )

    const target =
      new URL(
        payment.request_id
          ? `/dashboard/client/payments/${payment.request_id}`
          : `/dashboard/client/payments`,
        request.nextUrl.origin,
      )

    if (result.success) {
      target.searchParams.set(
        "payment",
        "success",
      )

      if (result.case_id) {
        target.searchParams.set(
          "case_id",
          result.case_id,
        )
      }
    } else {
      target.searchParams.set(
        "payment",
        "pending",
      )

      target.searchParams.set(
        "status",
        result.status || "unknown",
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

    /*
     * We don't expose internal server
     * errors to the customer.
     */
    fallbackUrl.searchParams.set(
      "payment",
      "verification_failed",
    )

    return NextResponse.redirect(
      fallbackUrl,
    )
  }
}