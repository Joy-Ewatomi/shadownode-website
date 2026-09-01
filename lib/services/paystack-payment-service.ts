import { query } from "@/lib/db"

import {
  notifySuperAdmins,
  notifyUser,
} from "@/lib/services/notification-service"

type PaystackTransaction = {
  id?: number
  status?: string
  reference?: string
  amount?: number
  currency?: string
  paid_at?: string | null
  metadata?: {
    request_id?: string
    case_id?: string
    training_engagement_id?: string
    user_id?: string
  }
}

type VerifyResult = {
  success: boolean
  already_processed?: boolean
  payment_id?: string
  request_id?: string
  case_id?: string
  training_engagement_id?: string
  status?: string
  payment_type?: "case" | "training"
  message?: string
}

/**
 * Verify a Paystack payment and activate the
 * associated investigation case or training engagement.
 *
 * Important:
 * - Paystack is treated as the payment authority.
 * - The local payment record must already exist.
 * - Amount and currency are verified.
 * - Payment activation is idempotent.
 * - Database state changes happen inside one transaction.
 * - Notifications are sent only after a successful commit.
 */
export async function verifyAndCompletePaystackPayment(
  reference: string,
): Promise<VerifyResult> {
  const cleanReference = reference.trim()

  if (!cleanReference) {
    throw new Error("Payment reference is required")
  }

  const secretKey =
    process.env.PAYSTACK_SECRET_KEY

  if (!secretKey) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not configured",
    )
  }

  // =========================================================
  // 1. FIND LOCAL PAYMENT
  // =========================================================

  const localPayment =
    await query<{
      id: string
      case_id: string | null
      request_id: string | null
      training_engagement_id: string | null
      amount: number | string
      currency: string | null
      status: string | null
    }>(
      `
      SELECT
        id,
        case_id,
        request_id,
        training_engagement_id,
        amount,
        currency,
        status
      FROM payments
      WHERE provider = 'paystack'
        AND transaction_id = $1
      LIMIT 1
      `,
      [cleanReference],
    )

  const payment = localPayment.rows[0]

  if (!payment) {
    throw new Error(
      "Payment reference was not found",
    )
  }

  const paymentType =
    payment.training_engagement_id
      ? "training"
      : payment.case_id
        ? "case"
        : null

  if (!paymentType) {
    throw new Error(
      "Payment is not associated with a case or training engagement",
    )
  }

  // =========================================================
  // 2. IDEMPOTENCY CHECK
  // =========================================================

  if (payment.status === "paid") {
    return {
      success: true,
      already_processed: true,
      payment_id: payment.id,
      request_id:
        payment.request_id || undefined,
      case_id:
        payment.case_id || undefined,
      training_engagement_id:
        payment.training_engagement_id ||
        undefined,
      payment_type: paymentType,
      status: "paid",
      message:
        "Payment was already processed",
    }
  }

  // =========================================================
  // 3. VERIFY DIRECTLY WITH PAYSTACK
  // =========================================================

  const verifyUrl =
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(
      cleanReference,
    )}`

  const response = await fetch(
    verifyUrl,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  )

  let payload: {
    status?: boolean
    message?: string
    data?: PaystackTransaction
  }

  try {
    payload = await response.json()
  } catch {
    throw new Error(
      "Paystack returned an invalid response",
    )
  }

  if (
    !response.ok ||
    !payload.status ||
    !payload.data
  ) {
    console.error(
      "PAYSTACK VERIFY ERROR",
      {
        reference: cleanReference,
        httpStatus: response.status,
        payload,
      },
    )

    throw new Error(
      payload.message ||
        "Paystack verification failed",
    )
  }

  const transaction =
    payload.data

  // =========================================================
  // 4. VERIFY REFERENCE
  // =========================================================

  if (
    transaction.reference &&
    transaction.reference !== cleanReference
  ) {
    console.error(
      "PAYSTACK REFERENCE MISMATCH",
      {
        expected: cleanReference,
        received:
          transaction.reference,
      },
    )

    throw new Error(
      "Paystack transaction reference does not match",
    )
  }

  // =========================================================
  // 5. PAYMENT MUST BE SUCCESSFUL
  // =========================================================

  if (
    transaction.status !== "success"
  ) {
    return {
      success: false,
      payment_id: payment.id,
      request_id:
        payment.request_id || undefined,
      case_id:
        payment.case_id || undefined,
      training_engagement_id:
        payment.training_engagement_id ||
        undefined,
      payment_type: paymentType,
      status:
        transaction.status ||
        "unknown",
      message:
        `Payment is not successful. Paystack status: ${
          transaction.status ||
          "unknown"
        }`,
    }
  }

  // =========================================================
  // 6. VERIFY LOCAL AMOUNT
  // =========================================================

  const localAmount =
    Number(payment.amount)

  if (
    !Number.isFinite(localAmount) ||
    localAmount <= 0
  ) {
    throw new Error(
      "Invalid local payment amount",
    )
  }

  const localAmountMinor =
    Math.round(localAmount * 100)

  const paystackAmount =
    Number(transaction.amount)

  if (
    !Number.isFinite(
      paystackAmount,
    ) ||
    paystackAmount !==
      localAmountMinor
  ) {
    console.error(
      "PAYMENT AMOUNT MISMATCH",
      {
        reference: cleanReference,
        localAmount,
        localAmountMinor,
        paystackAmount,
        paymentType,
      },
    )

    throw new Error(
      "Payment amount does not match the approved quote",
    )
  }

  // =========================================================
  // 7. VERIFY CURRENCY
  // =========================================================

  const localCurrency =
    String(
      payment.currency || "NGN",
    ).toUpperCase()

  const paystackCurrency =
    String(
      transaction.currency || "",
    ).toUpperCase()

  if (
    paystackCurrency &&
    paystackCurrency !==
      localCurrency
  ) {
    console.error(
      "PAYMENT CURRENCY MISMATCH",
      {
        reference: cleanReference,
        localCurrency,
        paystackCurrency,
        paymentType,
      },
    )

    throw new Error(
      "Payment currency does not match the approved quote",
    )
  }

  // =========================================================
  // 8. DATABASE TRANSACTION
  // =========================================================

  await query("BEGIN")

  try {
    // =======================================================
    // 9. LOCK PAYMENT
    // =======================================================

    const lockedPayment =
      await query<{
        id: string
        case_id: string | null
        request_id: string | null
        training_engagement_id:
          | string
          | null
        status: string | null
      }>(
        `
        SELECT
          id,
          case_id,
          request_id,
          training_engagement_id,
          status
        FROM payments
        WHERE id = $1
        FOR UPDATE
        `,
        [payment.id],
      )

    const current =
      lockedPayment.rows[0]

    if (!current) {
      throw new Error(
        "Payment disappeared during verification",
      )
    }

    // =======================================================
    // 10. SECOND IDEMPOTENCY CHECK
    // =======================================================

    if (
      current.status === "paid"
    ) {
      await query("COMMIT")

      return {
        success: true,
        already_processed: true,
        payment_id: current.id,
        request_id:
          current.request_id ||
          undefined,
        case_id:
          current.case_id ||
          undefined,
        training_engagement_id:
          current.training_engagement_id ||
          undefined,
        payment_type:
          current.training_engagement_id
            ? "training"
            : "case",
        status: "paid",
        message:
          "Payment was already processed",
      }
    }

    // =======================================================
    // 11. MARK PAYMENT AS PAID
    // =======================================================

    await query(
      `
      UPDATE payments
      SET
        status = 'paid',
        paid_at = COALESCE(
          $2::timestamptz,
          NOW()
        )
      WHERE id = $1
      `,
      [
        current.id,
        transaction.paid_at ||
          null,
      ],
    )

    // =======================================================
    // 12. INVESTIGATION PAYMENT
    // =======================================================

    if (current.case_id) {
      await query(
        `
        UPDATE cases
        SET
          payment_status = 'paid',
          status = 'active',
          started_at = COALESCE(
            started_at,
            NOW()
          ),
          updated_at = NOW()
        WHERE id = $1
        `,
        [current.case_id],
      )

      if (current.request_id) {
        await query(
          `
          UPDATE requests
          SET
            status = 'active',
            updated_at = NOW()
          WHERE id = $1
          `,
          [current.request_id],
        )
      }

      await query(
        `
        INSERT INTO case_updates (
          case_id,
          updated_by,
          update_type,
          title,
          content
        )
        VALUES (
          $1,
          NULL,
          'payment',
          'Payment Confirmed',
          $2
        )
        `,
        [
          current.case_id,
          `Payment confirmed through Paystack. Reference: ${cleanReference}. Investigation activated.`,
        ],
      )
    }

    // =======================================================
    // 13. TRAINING PAYMENT
    // =======================================================

    if (
      current.training_engagement_id
    ) {
      await query(
        `
        UPDATE training_engagements
        SET
          payment_status = 'paid',
          status = 'active',
          started_at = COALESCE(
            started_at,
            NOW()
          ),
          updated_at = NOW()
        WHERE id = $1
        `,
        [
          current.training_engagement_id,
        ],
      )

      if (current.request_id) {
        await query(
          `
          UPDATE requests
          SET
            status = 'active',
            updated_at = NOW()
          WHERE id = $1
          `,
          [current.request_id],
        )
      }

      await query(
        `
        INSERT INTO training_updates (
          training_engagement_id,
          updated_by,
          update_type,
          title,
          content
        )
        VALUES (
          $1,
          NULL,
          'payment',
          'Payment Confirmed',
          $2
        )
        `,
        [
          current.training_engagement_id,
          `Payment confirmed through Paystack. Reference: ${cleanReference}. Training engagement activated.`,
        ],
      )
    }

    // =======================================================
    // 14. COMMIT
    // =======================================================

    await query("COMMIT")

    // =======================================================
    // 15. NOTIFICATIONS
    // =======================================================

    if (current.case_id) {
      try {
        const caseInfo =
          await query<{
            case_number:
              | string
              | null
            title:
              | string
              | null
            client_user_id:
              | string
              | null
          }>(
            `
            SELECT
              c.case_number,
              c.title,
              up.user_id AS client_user_id
            FROM cases c
            LEFT JOIN user_profiles up
              ON up.id =
                c.client_profile_id
            WHERE c.id = $1
            LIMIT 1
            `,
            [current.case_id],
          )

        const caseRow =
          caseInfo.rows[0]

        if (
          caseRow?.client_user_id
        ) {
          await notifyUser(
            caseRow.client_user_id,
            {
              caseId:
                current.case_id,
              type:
                "payment_confirmed",
              title:
                "Payment confirmed",
              message:
                "Your payment has been confirmed and your investigation is now active.",
              metadata: {
                request_id:
                  current.request_id,
                case_id:
                  current.case_id,
                payment_id:
                  current.id,
                target_page:
                  "case",
                action:
                  "open_case",
              },
            },
          )
        }

        await notifySuperAdmins({
          type:
            "case_ready_for_assignment",
          title:
            "Case ready for assignment",
          message:
            `${caseRow?.case_number || "A case"} is paid and ready for investigator assignment.`,
          metadata: {
            request_id:
              current.request_id,
            case_id:
              current.case_id,
            payment_id:
              current.id,
            target_page:
              "case_assignment",
            action:
              "assign_investigator",
          },
        })
      } catch (notificationError) {
        console.error(
          "CASE PAYMENT NOTIFICATION ERROR",
          notificationError,
        )
      }
    }

    // =======================================================
    // 16. TRAINING NOTIFICATIONS
    // =======================================================

    if (
      current.training_engagement_id
    ) {
      try {
        const trainingInfo =
          await query<{
            engagement_number:
              | string
              | null
            training_organization_name:
              | string
              | null
            client_user_id:
              | string
              | null
          }>(
            `
            SELECT
              te.engagement_number,
              te.training_organization_name,
              up.user_id AS client_user_id
            FROM training_engagements te
            LEFT JOIN user_profiles up
              ON up.id =
                te.client_profile_id
            WHERE te.id = $1
            LIMIT 1
            `,
            [
              current.training_engagement_id,
            ],
          )

        const trainingRow =
          trainingInfo.rows[0]

        if (
          trainingRow?.client_user_id
        ) {
          await notifyUser(
            trainingRow.client_user_id,
            {
              type:
                "payment_confirmed",
              title:
                "Training payment confirmed",
              message:
                "Your payment has been confirmed and your training engagement is now active.",
              metadata: {
                request_id:
                  current.request_id,
                training_engagement_id:
                  current.training_engagement_id,
                payment_id:
                  current.id,
                engagement_number:
                  trainingRow.engagement_number ||
                  undefined,
                target_page:
                  "client_training_engagement",
                action:
                  "open_training_engagement",
              },
            },
          )
        }

        await notifySuperAdmins({
          type:
            "training_ready_for_assignment",
          title:
            "Training ready for assignment",
          message:
            `${trainingRow?.engagement_number || "A training engagement"} is paid and ready for trainer assignment.`,
          metadata: {
            request_id:
              current.request_id,
            training_engagement_id:
              current.training_engagement_id,
            payment_id:
              current.id,
            target_page:
              "training_assignment",
            action:
              "assign_trainer",
          },
        })
      } catch (notificationError) {
        console.error(
          "TRAINING PAYMENT NOTIFICATION ERROR",
          notificationError,
        )
      }
    }

    // =======================================================
    // 17. RETURN
    // =======================================================

    return {
      success: true,
      payment_id: current.id,
      request_id:
        current.request_id ||
        undefined,
      case_id:
        current.case_id ||
        undefined,
      training_engagement_id:
        current.training_engagement_id ||
        undefined,
      payment_type:
        current.training_engagement_id
          ? "training"
          : "case",
      status: "paid",
      message:
        current.training_engagement_id
          ? "Payment confirmed and training engagement activated"
          : "Payment confirmed and investigation activated",
    }
  } catch (error) {
    try {
      await query("ROLLBACK")
    } catch (rollbackError) {
      console.error(
        "PAYSTACK PAYMENT ROLLBACK ERROR",
        rollbackError,
      )
    }

    throw error
  }
}