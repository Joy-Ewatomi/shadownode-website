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
  const startedAt =
    performance.now()

  // =========================================================
  // 1. READ PAYSTACK REFERENCE
  // =========================================================
  //
  // Paystack may return either:
  //
  //   ?reference=...
  //   ?trxref=...
  //
  // Prefer reference, with trxref as fallback.
  // =========================================================

  const reference =
    String(
      request.nextUrl.searchParams.get(
        "reference",
      ) ||
        request.nextUrl.searchParams.get(
          "trxref",
        ) ||
        "",
    ).trim()

  console.log(
    "[PAYSTACK CALLBACK] RECEIVED",
    {
      reference,
    },
  )

  // =========================================================
  // 2. GENERIC FALLBACK
  // =========================================================

  const fallbackUrl =
    new URL(
      "/dashboard/client/payments",
      request.nextUrl.origin,
    )

  // =========================================================
  // 3. VALIDATE REFERENCE
  // =========================================================

  if (!reference) {
    console.warn(
      "[PAYSTACK CALLBACK] Missing payment reference",
    )

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
    // 4. FIND LOCAL PAYMENT
    // =======================================================

    console.log(
      "[PAYSTACK CALLBACK] STEP 1 — Finding local payment",
    )

    const lookupStartedAt =
      performance.now()

    const localPayment =
      await query<{
        id: string
        request_id: string | null
        case_id: string | null
        training_engagement_id:
          | string
          | null
        status: string | null
      }>(
        `
        SELECT
          id,
          request_id,
          case_id,
          training_engagement_id,
          status
        FROM payments
        WHERE provider = 'paystack'
          AND transaction_id = $1
        LIMIT 1
        `,
        [reference],
      )

    const lookupMs =
      Math.round(
        performance.now() -
          lookupStartedAt,
      )

    const payment =
      localPayment.rows[0]

    console.log(
      "[PAYSTACK CALLBACK] STEP 1 COMPLETE",
      {
        ms: lookupMs,
        found: Boolean(payment),
        paymentId:
          payment?.id || null,
        requestId:
          payment?.request_id || null,
        caseId:
          payment?.case_id || null,
        trainingEngagementId:
          payment?.training_engagement_id ||
          null,
        status:
          payment?.status || null,
      },
    )

    if (!payment) {
      console.warn(
        "[PAYSTACK CALLBACK] Local payment not found",
        {
          reference,
        },
      )

      fallbackUrl.searchParams.set(
        "payment",
        "not_found",
      )

      fallbackUrl.searchParams.set(
        "reference",
        reference,
      )

      return NextResponse.redirect(
        fallbackUrl,
      )
    }

    // =======================================================
    // 5. DETERMINE PAYMENT TYPE
    // =======================================================

    const hasTraining =
      Boolean(
        payment.training_engagement_id,
      )

    const hasCase =
      Boolean(
        payment.case_id,
      )

    if (
      hasTraining &&
      hasCase
    ) {
      console.error(
        "[PAYSTACK CALLBACK] Payment has conflicting targets",
        {
          reference,
          paymentId:
            payment.id,
          caseId:
            payment.case_id,
          trainingEngagementId:
            payment.training_engagement_id,
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

    const paymentType:
      | "case"
      | "training"
      | null =
      hasTraining
        ? "training"
        : hasCase
          ? "case"
          : null

    if (!paymentType) {
      console.error(
        "[PAYSTACK CALLBACK] Payment has no case or training target",
        {
          reference,
          paymentId:
            payment.id,
          requestId:
            payment.request_id,
        },
      )

      fallbackUrl.searchParams.set(
        "payment",
        "invalid_payment",
      )

      fallbackUrl.searchParams.set(
        "reference",
        reference,
      )

      return NextResponse.redirect(
        fallbackUrl,
      )
    }

    // =======================================================
    // 6. VERIFY AND COMPLETE PAYMENT
    // =======================================================

    console.log(
      "[PAYSTACK CALLBACK] STEP 2 — Starting Paystack verification",
      {
        paymentType,
        paymentId:
          payment.id,
      },
    )

    const verificationStartedAt =
      performance.now()

    let result:
      | Awaited<
          ReturnType<
            typeof verifyAndCompletePaystackPayment
          >
        >

    try {
      result =
        await verifyAndCompletePaystackPayment(
          reference,
        )
    } catch (verificationError) {
      const verificationMs =
        Math.round(
          performance.now() -
            verificationStartedAt,
        )

      console.error(
        "[PAYSTACK CALLBACK] STEP 2 FAILED — Verification/completion error",
        {
          ms: verificationMs,
          reference,
          paymentId:
            payment.id,
          paymentType,
          error:
            verificationError,
        },
      )

      /*
       * IMPORTANT:
       *
       * This does NOT mean Paystack rejected the payment.
       *
       * Paystack may have successfully charged/recorded the
       * transaction while the local ShadowNode processing failed.
       */
      fallbackUrl.searchParams.set(
        "payment",
        "processing_error",
      )

      fallbackUrl.searchParams.set(
        "payment_type",
        paymentType,
      )

      fallbackUrl.searchParams.set(
        "payment_id",
        payment.id,
      )

      if (
        payment.request_id
      ) {
        fallbackUrl.searchParams.set(
          "request_id",
          payment.request_id,
        )
      }

      if (
        payment.case_id
      ) {
        fallbackUrl.searchParams.set(
          "case_id",
          payment.case_id,
        )
      }

      if (
        payment.training_engagement_id
      ) {
        fallbackUrl.searchParams.set(
          "training_engagement_id",
          payment.training_engagement_id,
        )
      }

      return NextResponse.redirect(
        fallbackUrl,
      )
    }

    const verificationMs =
      Math.round(
        performance.now() -
          verificationStartedAt,
      )

    console.log(
      "[PAYSTACK CALLBACK] STEP 2 COMPLETE",
      {
        ms: verificationMs,
        result,
      },
    )

    // =======================================================
    // 7. RESOLVE FINAL IDS
    // =======================================================

    const finalCaseId =
      result.case_id ||
      payment.case_id ||
      undefined

    const finalTrainingEngagementId =
      result.training_engagement_id ||
      payment.training_engagement_id ||
      undefined

    const finalRequestId =
      result.request_id ||
      payment.request_id ||
      undefined

    // =======================================================
    // 8. BUILD FINAL CLIENT DESTINATION
    // =======================================================
    //
    // IMPORTANT:
    //
    // The operational entity is the final destination.
    //
    // Training:
    //   /dashboard/client/training/[engagementId]
    //
    // Investigation / OSINT:
    //   /dashboard/client/cases/[caseId]
    //
    // Only use the payment page as a fallback.
    // =======================================================

    let target: URL

    if (
      finalTrainingEngagementId
    ) {
      target =
        new URL(
          `/dashboard/client/training/${finalTrainingEngagementId}`,
          request.nextUrl.origin,
        )
    } else if (
      finalCaseId
    ) {
      target =
        new URL(
          `/dashboard/client/cases/${finalCaseId}`,
          request.nextUrl.origin,
        )
    } else if (
      finalRequestId
    ) {
      target =
        new URL(
          `/dashboard/client/payments/${finalRequestId}`,
          request.nextUrl.origin,
        )
    } else {
      target =
        new URL(
          "/dashboard/client/payments",
          request.nextUrl.origin,
        )
    }

    // =======================================================
    // 9. SUCCESS
    // =======================================================

    if (
      result.success
    ) {
      target.searchParams.set(
        "payment",
        "success",
      )

      target.searchParams.set(
        "payment_type",
        result.payment_type ||
          paymentType,
      )

      if (
        result.payment_id
      ) {
        target.searchParams.set(
          "payment_id",
          result.payment_id,
        )
      }

      if (
        finalRequestId
      ) {
        target.searchParams.set(
          "request_id",
          finalRequestId,
        )
      }

      if (
        finalCaseId
      ) {
        target.searchParams.set(
          "case_id",
          finalCaseId,
        )
      }

      if (
        finalTrainingEngagementId
      ) {
        target.searchParams.set(
          "training_engagement_id",
          finalTrainingEngagementId,
        )
      }

      console.log(
        "[PAYSTACK CALLBACK] SUCCESS — Redirecting client",
        {
          paymentType:
            result.payment_type ||
            paymentType,
          paymentId:
            result.payment_id ||
            payment.id,
          requestId:
            finalRequestId,
          caseId:
            finalCaseId,
          trainingEngagementId:
            finalTrainingEngagementId,
          destination:
            target.pathname,
          totalMs:
            Math.round(
              performance.now() -
                startedAt,
            ),
        },
      )

      return NextResponse.redirect(
        target,
      )
    }

    // =======================================================
    // 10. PAYMENT NOT SUCCESSFUL YET
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

    if (
      result.payment_id
    ) {
      target.searchParams.set(
        "payment_id",
        result.payment_id,
      )
    }

    if (
      finalRequestId
    ) {
      target.searchParams.set(
        "request_id",
        finalRequestId,
      )
    }

    if (
      finalCaseId
    ) {
      target.searchParams.set(
        "case_id",
        finalCaseId,
      )
    }

    if (
      finalTrainingEngagementId
    ) {
      target.searchParams.set(
        "training_engagement_id",
        finalTrainingEngagementId,
      )
    }

    console.log(
      "[PAYSTACK CALLBACK] Payment not complete — Redirecting",
      {
        status:
          result.status ||
          "unknown",
        destination:
          target.pathname,
        totalMs:
          Math.round(
            performance.now() -
              startedAt,
          ),
      },
    )

    return NextResponse.redirect(
      target,
    )
  } catch (error) {
    const totalMs =
      Math.round(
        performance.now() -
          startedAt,
      )

    console.error(
      "[PAYSTACK CALLBACK] UNHANDLED ERROR",
      {
        reference,
        totalMs,
        error,
      },
    )

    fallbackUrl.searchParams.set(
      "payment",
      "processing_error",
    )

    fallbackUrl.searchParams.set(
      "reference",
      reference,
    )

    return NextResponse.redirect(
      fallbackUrl,
    )
  }
}