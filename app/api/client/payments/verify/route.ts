import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  getCurrentUser,
} from "@/lib/auth"

import {
  query,
} from "@/lib/db"

import {
  verifyAndCompletePaystackPayment,
} from "@/lib/services/paystack-payment-service"

export async function POST(
  request: NextRequest,
) {
  try {
    const user =
      await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      )
    }

    if (user.role !== "client") {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        },
      )
    }

    const body =
      await request.json()

    const reference =
      String(
        body.reference ?? "",
      ).trim()

    if (!reference) {
      return NextResponse.json(
        {
          error:
            "Payment reference is required",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * Confirm that this payment belongs
     * to the authenticated client.
     */
    const ownership =
      await query<{
        payment_id: string
        request_id: string | null
        case_id: string
      }>(
        `
        SELECT
          p.id AS payment_id,
          p.request_id,
          p.case_id
        FROM payments p
        LEFT JOIN requests r
          ON r.id = p.request_id
        WHERE p.provider = 'paystack'
          AND p.transaction_id = $1
          AND (
            r.user_id = $2
            OR EXISTS (
              SELECT 1
              FROM cases c
              JOIN user_profiles up
                ON up.id = c.client_profile_id
              WHERE c.id = p.case_id
                AND up.user_id = $2
            )
          )
        LIMIT 1
        `,
        [
          reference,
          user.id,
        ],
      )

    if (!ownership.rows[0]) {
      return NextResponse.json(
        {
          error:
            "Payment not found",
        },
        {
          status: 404,
        },
      )
    }

    const result =
      await verifyAndCompletePaystackPayment(
        reference,
      )

    return NextResponse.json(
      result,
      {
        status: result.success
          ? 200
          : 202,
      },
    )
  } catch (error) {
    console.error(
      "CLIENT PAYMENT VERIFY ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Payment verification failed",
      },
      {
        status: 500,
      },
    )
  }
}