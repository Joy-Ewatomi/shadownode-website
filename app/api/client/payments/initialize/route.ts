import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    if (user.role !== "client") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      )
    }

    const body = await request.json()

    const requestId = String(
      body.request_id ?? "",
    ).trim()

    if (!requestId) {
      return NextResponse.json(
        {
          error: "Request ID is required",
        },
        { status: 400 },
      )
    }

    /*
     * Get the request and verify ownership.
     *
     * The request must already have been converted
     * into a case before payment can be initialized.
     */
    const result = await query<{
      id: string
      user_id: string | null
      title: string | null
      converted_case_id: string | null
      approved_quote_amount: number | string | null
      approved_quote_currency: string | null
      status: string | null
    }>(
      `
      SELECT
        id,
        user_id,
        title,
        converted_case_id,
        approved_quote_amount,
        approved_quote_currency,
        status
      FROM requests
      WHERE id = $1
        AND user_id = $2
        AND converted_case_id IS NOT NULL
      LIMIT 1
      `,
      [
        requestId,
        user.id,
      ],
    )

    const item = result.rows[0]

    if (!item) {
      return NextResponse.json(
        {
          error: "Payment request not found",
        },
        { status: 404 },
      )
    }

    if (!item.converted_case_id) {
      return NextResponse.json(
        {
          error:
            "This request has not been converted into a case",
        },
        { status: 400 },
      )
    }

    /*
     * Only requests waiting for payment should
     * enter the Paystack checkout workflow.
     */
    if (
      item.status !== "awaiting_payment"
    ) {
      if (item.status === "active") {
        return NextResponse.json(
          {
            error:
              "This investigation has already been paid for",
          },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          error:
            `This request is not awaiting payment. Current status: ${
              item.status || "unknown"
            }`,
        },
        { status: 400 },
      )
    }

    if (
      item.approved_quote_amount === null ||
      item.approved_quote_amount === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "No approved quote amount is available",
        },
        { status: 400 },
      )
    }

    const amount = Number(
      item.approved_quote_amount,
    )

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid approved quote amount",
        },
        { status: 400 },
      )
    }

const currency =
  item.approved_quote_currency
    ?.trim()
    .toUpperCase()

if (!currency) {
  return NextResponse.json(
    {
      error:
        "Approved quote currency is missing",
    },
    { status: 400 },
  )
}

    /*
     * Verify that the case belongs to this client
     * through the client profile relationship.
     *
     * cases.case_user_id references user_profiles.id,
     * NOT auth.users.id.
     */
    const caseOwnership = await query<{
      id: string
      status: string | null
      payment_status: string | null
      organization_id: string | null
    }>(
      `
      SELECT
        c.id,
        c.status,
        c.payment_status,
        c.organization_id
      FROM cases c
      JOIN user_profiles up
        ON up.id = c.case_user_id
      WHERE c.id = $1
        AND up.user_id = $2
      LIMIT 1
      `,
      [
        item.converted_case_id,
        user.id,
      ],
    )

    const caseRecord =
      caseOwnership.rows[0]

    if (!caseRecord) {
      return NextResponse.json(
        {
          error:
            "Case could not be verified for this client",
        },
        { status: 403 },
      )
    }

    /*
     * The case should still be waiting for payment.
     */
    if (
      caseRecord.status === "active" ||
      caseRecord.payment_status === "paid"
    ) {
      return NextResponse.json(
        {
          error:
            "This investigation has already been paid for",
        },
        { status: 400 },
      )
    }

    if (
      caseRecord.status !== "awaiting_payment"
    ) {
      return NextResponse.json(
        {
          error:
            `Case is not awaiting payment. Current status: ${
              caseRecord.status || "unknown"
            }`,
        },
        { status: 400 },
      )
    }

    /*
     * Check whether this request already has
     * a successful payment.
     *
     * We intentionally DO NOT reuse pending payments.
     *
     * If the client abandoned an earlier Paystack
     * checkout, a new checkout receives a new reference.
     *
     * The old payment remains in the database for
     * audit/history purposes.
     */
    const existingPaidPayment =
      await query<{
        id: string
        transaction_id: string | null
        status: string | null
      }>(
        `
        SELECT
          id,
          transaction_id,
          status
        FROM payments
        WHERE request_id = $1
          AND status = 'paid'
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [requestId],
      )

    if (existingPaidPayment.rows[0]) {
      return NextResponse.json(
        {
          error:
            "Payment already completed",
        },
        { status: 400 },
      )
    }

    const secretKey =
      process.env.PAYSTACK_SECRET_KEY

    if (!secretKey) {
      console.error(
        "PAYSTACK_SECRET_KEY is not configured",
      )

      return NextResponse.json(
        {
          error:
            "Payment provider is not configured",
        },
        { status: 500 },
      )
    }

    const email =
      user.email ||
      `client-${user.id}@shadownode.local`

    /*
     * Every new checkout receives a unique
     * Paystack reference.
     */
    const reference =
      `SOB-${requestId}-${Date.now()}`

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.nextUrl.origin

    const callbackUrl =
      `${appUrl}/api/client/payments/callback`

    /*
     * Paystack expects the amount in the
     * smallest currency unit.
     *
     * Example:
     * USD 329.85 -> 32985
     * NGN 329.85 -> 32985
     */
    const paystackAmount =
      Math.round(amount * 100)

    const paystackResponse =
      await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${secretKey}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
            amount: paystackAmount,
            currency,
            reference,
            callback_url:
              callbackUrl,
            metadata: {
              request_id:
                requestId,
              case_id:
                item.converted_case_id,
              user_id:
                user.id,
            },
          }),
        },
      )

    const paystackData =
      await paystackResponse.json()

    if (
      !paystackResponse.ok ||
      !paystackData.status ||
      !paystackData.data
    ) {
      console.error(
        "PAYSTACK INITIALIZE ERROR",
        paystackData,
      )

      return NextResponse.json(
        {
          error:
            paystackData.message ||
            "Unable to initialize payment",
        },
        { status: 502 },
      )
    }

    const authorizationUrl =
      paystackData.data
        .authorization_url

    const accessCode =
      paystackData.data.access_code

    if (!authorizationUrl) {
      console.error(
        "PAYSTACK INITIALIZE MISSING AUTHORIZATION URL",
        paystackData,
      )

      return NextResponse.json(
        {
          error:
            "Payment provider did not return a checkout URL",
        },
        { status: 502 },
      )
    }

    /*
     * Record the payment attempt before
     * redirecting the client to Paystack.
     */
    const paymentInsert =
      await query<{
        id: string
      }>(
        `
        INSERT INTO payments (
          case_id,
          amount,
          currency,
          provider,
          transaction_id,
          status,
          organization_id,
          request_id
        )
        SELECT
          $1,
          $2,
          $3,
          'paystack',
          $4,
          'pending',
          c.organization_id,
          $5
        FROM cases c
        WHERE c.id = $1
          AND c.status = 'awaiting_payment'
          AND c.payment_status <> 'paid'
        RETURNING id
        `,
        [
          item.converted_case_id,
          amount,
          currency,
          reference,
          requestId,
        ],
      )

    if (!paymentInsert.rows[0]) {
      return NextResponse.json(
        {
          error:
            "Unable to create payment record",
        },
        { status: 409 },
      )
    }

    return NextResponse.json({
      success: true,
      authorization_url:
        authorizationUrl,
      access_code:
        accessCode,
      reference,
      payment_id:
        paymentInsert.rows[0].id,
    })
  } catch (error) {
    console.error(
      "CLIENT PAYMENT INITIALIZE ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to initialize payment",
      },
      { status: 500 },
    )
  }
}
