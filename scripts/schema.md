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

type PaymentType = "case" | "training"

export type VerifyResult = {
  success: boolean
  already_processed?: boolean
  payment_id?: string
  request_id?: string
  case_id?: string
  training_engagement_id?: string
  status?: string
  payment_type?: PaymentType
  message?: string
}

type LocalPayment = {
  id: string
  case_id: string | null
  request_id: string | null
  training_engagement_id: string | null
  amount: number | string
  currency: string | null
  status: string | null
}

function getPaymentType(
  payment: Pick<
    LocalPayment,
    "case_id" | "training_engagement_id"
  >,
): PaymentType | null {
  if (
    payment.case_id &&
    payment.training_engagement_id
  ) {
    throw new Error(
      "Payment cannot be associated with both a case and a training engagement",
    )
  }

  if (payment.case_id) {
    return "case"
  }

  if (payment.training_engagement_id) {
    return "training"
  }

  return null
}

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

  const localPaymentResult =
    await query<LocalPayment>(
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

  const payment =
    localPaymentResult.rows[0]

  if (!payment) {
    throw new Error(
      "Payment reference was not found",
    )
  }

  const paymentType =
    getPaymentType(payment)

  if (!paymentType) {
    throw new Error(
      "Payment is not associated with a case or training engagement",
    )
  }

  // =========================================================
  // 2. IDEMPOTENCY
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

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(
      cleanReference,
    )}`,
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
      "Invalid response received from Paystack",
    )
  }

  if (!response.ok || !payload.status) {
    console.error(
      "PAYSTACK VERIFY ERROR",
      {
        status: response.status,
        payload,
        reference: cleanReference,
      },
    )

    throw new Error(
      payload.message ||
        "Paystack verification failed",
    )
  }

  const transaction = payload.data

  if (!transaction) {
    throw new Error(
      "Paystack verification returned no transaction data",
    )
  }

  // =========================================================
  // 4. PAYMENT MUST BE SUCCESSFUL
  // =========================================================

  if (transaction.status !== "success") {
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
        transaction.status || "unknown",
      message:
        `Payment is not successful. Paystack status: ${
          transaction.status || "unknown"
        }`,
    }
  }

  // =========================================================
  // 5. VERIFY AMOUNT
  // =========================================================

  const localAmount = Number(
    payment.amount,
  )

  if (!Number.isFinite(localAmount)) {
    throw new Error(
      "Invalid local payment amount",
    )
  }

  const localAmountMinor =
    Math.round(localAmount * 100)

  const paystackAmount = Number(
    transaction.amount,
  )

  if (
    !Number.isFinite(paystackAmount) ||
    paystackAmount !== localAmountMinor
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
  // 6. VERIFY CURRENCY
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
    paystackCurrency !== localCurrency
  ) {
    console.error(
      "PAYMENT CURRENCY MISMATCH",
      {
        reference: cleanReference,
        localCurrency,
        paystackCurrency,
      },
    )

    throw new Error(
      "Payment currency does not match the approved quote",
    )
  }

  // =========================================================
  // 7. BEGIN DATABASE TRANSACTION
  // =========================================================
  //
  // IMPORTANT:
  // This assumes your query() helper keeps transaction
  // statements on the same database connection.
  //
  // If query() uses pool.query() independently for every
  // call, BEGIN/COMMIT must instead be handled through a
  // dedicated database client.
  // =========================================================

  await query("BEGIN")

  try {
    // =======================================================
    // 8. LOCK PAYMENT
    // =======================================================

    const lockedPaymentResult =
      await query<{
        id: string
        case_id: string | null
        request_id: string | null
        training_engagement_id: string | null
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
      lockedPaymentResult.rows[0]

    if (!current) {
      throw new Error(
        "Payment disappeared during verification",
      )
    }

    const currentPaymentType =
      getPaymentType(current)

    if (!currentPaymentType) {
      throw new Error(
        "Payment is no longer associated with a valid target",
      )
    }

    // =======================================================
    // 9. HANDLE RACE CONDITION
    // =======================================================

    if (current.status === "paid") {
      await query("COMMIT")

      return {
        success: true,
        already_processed: true,
        payment_id: current.id,
        request_id:
          current.request_id || undefined,
        case_id:
          current.case_id || undefined,
        training_engagement_id:
          current.training_engagement_id ||
          undefined,
        payment_type:
          currentPaymentType,
        status: "paid",
        message:
          "Payment was already processed",
      }
    }

    // =======================================================
    // 10. MARK PAYMENT AS PAID
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
        transaction.paid_at || null,
      ],
    )

    // =======================================================
    // 11. INVESTIGATION PAYMENT
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
    // 12. TRAINING PAYMENT
    // =======================================================

    if (current.training_engagement_id) {
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
    // 13. COMMIT
    // =======================================================

    await query("COMMIT")

    // =======================================================
    // 14. INVESTIGATION NOTIFICATIONS
    // =======================================================

    if (current.case_id) {
      const caseInfo =
        await query<{
          case_number: string | null
          title: string | null
          client_user_id: string | null
        }>(
          `
          SELECT
            c.case_number,
            c.title,
            up.user_id AS client_user_id
          FROM cases c
          LEFT JOIN user_profiles up
            ON up.id = c.client_profile_id
          WHERE c.id = $1
          LIMIT 1
          `,
          [current.case_id],
        )

      const caseRow =
        caseInfo.rows[0]

      if (caseRow?.client_user_id) {
        await notifyUser(
          caseRow.client_user_id,
          {
            caseId: current.case_id,
            type: "payment_confirmed",
            title: "Payment confirmed",
            message:
              "Your payment has been confirmed and your investigation is now active.",
            metadata: {
              request_id:
                current.request_id,
              case_id:
                current.case_id,
              payment_id:
                current.id,
              target_page: "case",
              action: "open_case",
            },
          },
        )
      }

      await notifySuperAdmins({
        type: "case_ready_for_assignment",
        title:
          "Case ready for assignment",
        message:
          `${
            caseRow?.case_number ||
            "A case"
          } is paid and ready for investigator assignment.`,
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
    }

    // =======================================================
    // 15. TRAINING NOTIFICATIONS
    // =======================================================

    if (
      current.training_engagement_id
    ) {
      const trainingInfo =
        await query<{
          engagement_number: string | null
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
            ON up.id = te.client_profile_id
          WHERE te.id = $1
          LIMIT 1
          `,
          [
            current.training_engagement_id,
          ],
        )

      const trainingRow =
        trainingInfo.rows[0]

      if (trainingRow?.client_user_id) {
        await notifyUser(
          trainingRow.client_user_id,
          {
            type: "payment_confirmed",
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
          `${
            trainingRow?.engagement_number ||
            "A training engagement"
          } is paid and ready for trainer assignment.`,
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
    }

    // =======================================================
    // 16. RETURN
    // =======================================================

    return {
      success: true,
      payment_id: current.id,
      request_id:
        current.request_id || undefined,
      case_id:
        current.case_id || undefined,
      training_engagement_id:
        current.training_engagement_id ||
        undefined,
      payment_type:
        currentPaymentType,
      status: "paid",
      message:
        currentPaymentType === "training"
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