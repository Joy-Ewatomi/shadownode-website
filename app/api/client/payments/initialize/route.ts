import {
  NextRequest,
  NextResponse,
} from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

export async function POST(
  request: NextRequest,
) {
  try {
    // =========================================================
    // 1. AUTHENTICATION
    // =========================================================

    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 },
      )
    }

    if (user.role !== "client") {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        { status: 403 },
      )
    }

    // =========================================================
    // 2. READ REQUEST BODY
    // =========================================================

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

    // =========================================================
    // 3. GET REQUEST
    // =========================================================
    //
    // A request may belong to:
    //
    //   INVESTIGATION
    //     converted_case_id
    //
    //   TRAINING
    //     converted_training_engagement_id
    //
    // We intentionally support both.
    // =========================================================

    const result = await query<{
      id: string
      user_id: string | null
      title: string | null
      status: string | null

      converted_case_id: string | null
      converted_training_engagement_id:
        | string
        | null

      approved_quote_amount:
        | number
        | string
        | null

      approved_quote_currency:
        | string
        | null
    }>(
      `
      SELECT
        id,
        user_id,
        title,
        status,
        converted_case_id,
        converted_training_engagement_id,
        approved_quote_amount,
        approved_quote_currency
      FROM requests
      WHERE id = $1
        AND user_id = $2
        AND (
          converted_case_id IS NOT NULL
          OR converted_training_engagement_id IS NOT NULL
        )
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
          error:
            "Payment request not found",
        },
        { status: 404 },
      )
    }

    // =========================================================
    // 4. DETERMINE PAYMENT TYPE
    // =========================================================

    const hasCase =
      Boolean(item.converted_case_id)

    const hasTraining =
      Boolean(
        item.converted_training_engagement_id,
      )

    if (!hasCase && !hasTraining) {
      return NextResponse.json(
        {
          error:
            "This request is not associated with a payable case or training engagement",
        },
        { status: 400 },
      )
    }

    /*
     * A request should never simultaneously
     * represent both payment targets.
     *
     * If that ever happens, stop rather than
     * guessing which one should receive money.
     */

    if (hasCase && hasTraining) {
      console.error(
        "PAYMENT INITIALIZE: Request has both case and training engagement",
        {
          requestId,
          caseId:
            item.converted_case_id,
          trainingEngagementId:
            item.converted_training_engagement_id,
        },
      )

      return NextResponse.json(
        {
          error:
            "This request has conflicting payment targets",
        },
        { status: 409 },
      )
    }

    const paymentType:
      | "case"
      | "training" =
      hasTraining
        ? "training"
        : "case"

    // =========================================================
    // 5. REQUEST STATUS
    // =========================================================
    //
    // Both investigation and training payments
    // must be explicitly waiting for payment.
    // =========================================================

    if (
      item.status !== "awaiting_payment"
    ) {
      if (item.status === "active") {
        return NextResponse.json(
          {
            error:
              paymentType === "training"
                ? "This training engagement has already been paid for"
                : "This investigation has already been paid for",
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

    // =========================================================
    // 6. VALIDATE QUOTE AMOUNT
    // =========================================================

    if (
      item.approved_quote_amount ===
        null ||
      item.approved_quote_amount ===
        undefined
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

    // =========================================================
    // 7. VALIDATE CURRENCY
    // =========================================================

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

    // =========================================================
    // 8A. VERIFY INVESTIGATION CASE
    // =========================================================

    if (
      paymentType === "case" &&
      item.converted_case_id
    ) {
      const caseOwnership =
        await query<{
          id: string
          status: string | null
          payment_status:
            | string
            | null
          organization_id:
            | string
            | null
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

      if (
        caseRecord.status ===
          "active" ||
        caseRecord.payment_status ===
          "paid"
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
        caseRecord.status !==
        "awaiting_payment"
      ) {
        return NextResponse.json(
          {
            error:
              `Case is not awaiting payment. Current status: ${
                caseRecord.status ||
                "unknown"
              }`,
          },
          { status: 400 },
        )
      }
    }

    // =========================================================
    // 8B. VERIFY TRAINING ENGAGEMENT
    // =========================================================

    if (
      paymentType === "training" &&
      item.converted_training_engagement_id
    ) {
      const trainingOwnership =
        await query<{
          id: string
          organization_id: string
          request_id: string
          client_profile_id:
            | string
            | null
          status: string | null
          payment_status:
            | string
            | null
          engagement_number:
            | string
            | null
        }>(
          `
          SELECT
            te.id,
            te.organization_id,
            te.request_id,
            te.client_profile_id,
            te.status,
            te.payment_status,
            te.engagement_number
          FROM training_engagements te
          JOIN user_profiles up
            ON up.id = te.client_profile_id
          WHERE te.id = $1
            AND up.user_id = $2
          LIMIT 1
          `,
          [
            item.converted_training_engagement_id,
            user.id,
          ],
        )

      const trainingRecord =
        trainingOwnership.rows[0]

      if (!trainingRecord) {
        return NextResponse.json(
          {
            error:
              "Training engagement could not be verified for this client",
          },
          { status: 403 },
        )
      }

      if (
        trainingRecord.status ===
          "active" ||
        trainingRecord.payment_status ===
          "paid"
      ) {
        return NextResponse.json(
          {
            error:
              "This training engagement has already been paid for",
          },
          { status: 400 },
        )
      }

      if (
        trainingRecord.status !==
        "awaiting_payment"
      ) {
        return NextResponse.json(
          {
            error:
              `Training engagement is not awaiting payment. Current status: ${
                trainingRecord.status ||
                "unknown"
              }`,
          },
          { status: 400 },
        )
      }
    }

    // =========================================================
    // 9. CHECK FOR EXISTING SUCCESSFUL PAYMENT
    // =========================================================

    const existingPaidPayment =
      await query<{
        id: string
        transaction_id:
          | string
          | null
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

    // =========================================================
    // 10. PAYSTACK CONFIGURATION
    // =========================================================

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

    // =========================================================
    // 11. CLIENT EMAIL
    // =========================================================

    const email =
      user.email ||
      `client-${user.id}@shadownode.local`

    // =========================================================
    // 12. UNIQUE PAYSTACK REFERENCE
    // =========================================================

    const reference =
      `SOB-${paymentType.toUpperCase()}-${requestId}-${Date.now()}`

    // =========================================================
    // 13. CALLBACK URL
    // =========================================================

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.nextUrl.origin

    const callbackUrl =
      `${appUrl}/api/client/payments/callback`

    // =========================================================
    // 14. CONVERT TO PAYSTACK MINOR UNIT
    // =========================================================

    const paystackAmount =
      Math.round(amount * 100)

    // =========================================================
    // 15. PAYSTACK INITIALIZATION
    // =========================================================

    const metadata: Record<
      string,
      string
    > = {
      request_id: requestId,
      user_id: user.id,
      payment_type: paymentType,
    }

    if (
      paymentType === "case" &&
      item.converted_case_id
    ) {
      metadata.case_id =
        item.converted_case_id
    }

    if (
      paymentType === "training" &&
      item.converted_training_engagement_id
    ) {
      metadata.training_engagement_id =
        item.converted_training_engagement_id
    }

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
            amount:
              paystackAmount,
            currency,
            reference,
            callback_url:
              callbackUrl,
            metadata,
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

    // =========================================================
    // 16. GET CHECKOUT INFORMATION
    // =========================================================

    const authorizationUrl =
      paystackData.data
        .authorization_url

    const accessCode =
      paystackData.data
        .access_code

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

    // =========================================================
    // 17. RECORD PAYMENT ATTEMPT
    // =========================================================
    //
    // IMPORTANT:
    //
    // Investigation:
    //   case_id = case
    //   training_engagement_id = NULL
    //
    // Training:
    //   case_id = NULL
    //   training_engagement_id = engagement
    //
    // Both use the same payments table.
    // =========================================================

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
          request_id,
          training_engagement_id
        )
        SELECT
          $1,
          $2,
          $3,
          'paystack',
          $4,
          'pending',
          organization_id,
          $5,
          $6
        FROM (
          SELECT
            c.organization_id
          FROM cases c
          WHERE $7 = 'case'
            AND c.id = $1
            AND c.status = 'awaiting_payment'
            AND c.payment_status <> 'paid'

          UNION ALL

          SELECT
            te.organization_id
          FROM training_engagements te
          WHERE $7 = 'training'
            AND te.id = $6
            AND te.status = 'awaiting_payment'
            AND te.payment_status <> 'paid'
        ) AS payable
        RETURNING id
        `,
        [
          paymentType === "case"
            ? item.converted_case_id
            : null,
          amount,
          currency,
          reference,
          requestId,
          paymentType ===
          "training"
            ? item.converted_training_engagement_id
            : null,
          paymentType,
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

    // =========================================================
    // 18. RETURN CHECKOUT INFORMATION
    // =========================================================

    return NextResponse.json({
      success: true,

      payment_type:
        paymentType,

      authorization_url:
        authorizationUrl,

      access_code:
        accessCode,

      reference,

      payment_id:
        paymentInsert.rows[0].id,

      request_id:
        requestId,

      case_id:
        item.converted_case_id ||
        null,

      training_engagement_id:
        item.converted_training_engagement_id ||
        null,
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