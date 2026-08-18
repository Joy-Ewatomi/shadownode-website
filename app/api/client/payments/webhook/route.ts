import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

import { verifyAndCompletePaystackPayment } from "@/lib/services/paystack-payment-service"

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY

    if (!secretKey) {
      console.error(
        "PAYSTACK_SECRET_KEY is not configured",
      )

      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 },
      )
    }

    /*
     * IMPORTANT:
     * Read the raw body BEFORE JSON parsing.
     * Paystack signs the raw request payload.
     */
    const rawBody = await request.text()

    const signature =
      request.headers.get(
        "x-paystack-signature",
      )

    if (!signature) {
      console.warn(
        "PAYSTACK WEBHOOK: Missing signature",
      )

      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 },
      )
    }

    /*
     * Paystack uses HMAC SHA512.
     */
    const expectedSignature =
      crypto
        .createHmac(
          "sha512",
          secretKey,
        )
        .update(rawBody)
        .digest("hex")

    const signaturesMatch =
      signature.length ===
        expectedSignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      )

    if (!signaturesMatch) {
      console.warn(
        "PAYSTACK WEBHOOK: Invalid signature",
      )

      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      )
    }

    let event: {
      event?: string
      data?: {
        reference?: string
        status?: string
      }
    }

    try {
      event = JSON.parse(rawBody)
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 },
      )
    }

    /*
     * We only need successful charges.
     */
    if (event.event !== "charge.success") {
      return NextResponse.json({
        received: true,
        ignored: true,
        event: event.event || null,
      })
    }

    const reference =
      String(
        event.data?.reference ?? "",
      ).trim()

    if (!reference) {
      console.error(
        "PAYSTACK WEBHOOK: charge.success without reference",
      )

      /*
       * Return 200 because the event was
       * authenticated and received, but
       * there is nothing actionable.
       */
      return NextResponse.json({
        received: true,
        processed: false,
      })
    }

    /*
     * IMPORTANT:
     * We do NOT trust the webhook's amount/status
     * to activate the case.
     *
     * Our existing service calls Paystack's
     * verification endpoint and checks:
     *
     * - transaction exists
     * - status === success
     * - amount matches
     * - currency matches
     * - local payment exists
     *
     * Then it updates the payment/case/request.
     */
    const result =
      await verifyAndCompletePaystackPayment(
        reference,
      )

    console.log(
      "PAYSTACK WEBHOOK PROCESSED",
      {
        reference,
        success: result.success,
        already_processed:
          result.already_processed || false,
        payment_id:
          result.payment_id || null,
        case_id:
          result.case_id || null,
      },
    )

    return NextResponse.json({
      received: true,
      processed: result.success,
      already_processed:
        result.already_processed || false,
    })
  } catch (error) {
    console.error(
      "PAYSTACK WEBHOOK ERROR",
      error,
    )

    /*
     * Returning non-200 tells Paystack that
     * processing failed, allowing its retry
     * mechanism to run.
     */
    return NextResponse.json(
      {
        error:
          "Webhook processing failed",
      },
      { status: 500 },
    )
  }
}
