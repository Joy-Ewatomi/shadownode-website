import { query } from "@/lib/db"
import { notifySuperAdmins, notifyUser } from "@/lib/services/notification-service"

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
    user_id?: string
  }
}

type VerifyResult = {
  success: boolean
  already_processed?: boolean
  payment_id?: string
  request_id?: string
  case_id?: string
  status?: string
  message?: string
}

export async function verifyAndCompletePaystackPayment(
  reference: string,
): Promise<VerifyResult> {
  const cleanReference =
    reference.trim()

  if (!cleanReference) {
    throw new Error(
      "Payment reference is required",
    )
  }

  const secretKey =
    process.env.PAYSTACK_SECRET_KEY

  if (!secretKey) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not configured",
    )
  }

  /*
   * First find the payment that our system
   * created.
   *
   * This prevents someone from supplying an
   * arbitrary Paystack reference and trying
   * to activate a case.
   */
  const localPayment =
    await query<{
      id: string
      case_id: string
      request_id: string | null
      amount: number | string
      currency: string | null
      status: string | null
    }>(
      `
      SELECT
        id,
        case_id,
        request_id,
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
    localPayment.rows[0]

  if (!payment) {
    throw new Error(
      "Payment reference was not found",
    )
  }

  /*
   * Already paid means the webhook/callback
   * can safely be retried.
   */
  if (payment.status === "paid") {
    return {
      success: true,
      already_processed: true,
      payment_id: payment.id,
      request_id:
        payment.request_id || undefined,
      case_id: payment.case_id,
      status: "paid",
      message:
        "Payment was already processed",
    }
  }

  /*
   * Ask Paystack directly.
   */
  const response =
    await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        cleanReference,
      )}`,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${secretKey}`,
        },
        cache: "no-store",
      },
    )

  const payload =
    await response.json()

  if (
    !response.ok ||
    !payload.status
  ) {
    console.error(
      "PAYSTACK VERIFY ERROR",
      payload,
    )

    throw new Error(
      payload.message ||
        "Paystack verification failed",
    )
  }

  const transaction =
    payload.data as PaystackTransaction

  /*
   * NEVER activate a case unless Paystack
   * explicitly reports success.
   */
  if (
    transaction.status !== "success"
  ) {
    return {
      success: false,
      payment_id: payment.id,
      request_id:
        payment.request_id || undefined,
      case_id: payment.case_id,
      status:
        transaction.status || "unknown",
      message:
        `Payment is not successful. Paystack status: ${
          transaction.status || "unknown"
        }`,
    }
  }

  /*
   * Verify amount.
   *
   * Paystack returns the amount in the
   * smallest currency unit.
   */
  const localAmount =
    Number(payment.amount)

  const localAmountMinor =
    Math.round(
      localAmount * 100,
    )

  const paystackAmount =
    Number(transaction.amount)

  if (
    !Number.isFinite(paystackAmount) ||
    paystackAmount !== localAmountMinor
  ) {
    console.error(
      "PAYMENT AMOUNT MISMATCH",
      {
        reference: cleanReference,
        localAmountMinor,
        paystackAmount,
      },
    )

    throw new Error(
      "Payment amount does not match the approved quote",
    )
  }

  /*
   * Verify currency too.
   */
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
    throw new Error(
      "Payment currency does not match the approved quote",
    )
  }

  /*
   * Everything checks out.
   *
   * Update the payment and case together.
   */
  await query("BEGIN")

  try {
    /*
     * Lock the payment row so two simultaneous
     * callbacks cannot activate it twice.
     */
    const lockedPayment =
      await query<{
        id: string
        case_id: string
        request_id: string | null
        status: string | null
      }>(
        `
        SELECT
          id,
          case_id,
          request_id,
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

    /*
     * Another request may have completed
     * the payment while this request was
     * verifying it.
     */
    if (current.status === "paid") {
      await query("COMMIT")

      return {
        success: true,
        already_processed: true,
        payment_id: current.id,
        request_id:
          current.request_id || undefined,
        case_id: current.case_id,
        status: "paid",
      }
    }

    /*
     * Mark payment paid.
     */
    await query(
      `
      UPDATE payments
      SET
        status = 'paid',
        paid_at = COALESCE($2::timestamptz, NOW())
      WHERE id = $1
      `,
      [
        current.id,
        transaction.paid_at || null,
      ],
    )

    /*
     * Activate the case.
     */
    await query(
      `
      UPDATE cases
      SET
        payment_status = 'paid',
        status = 'active',
        started_at = COALESCE(
          started_at,
          NOW()
        )
      WHERE id = $1
      `,
      [current.case_id],
    )

    /*
     * Update the original request.
     */
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

    /*
     * Create the permanent case timeline event.
     *
     * updated_by is intentionally NULL because
     * this event was generated by the payment
     * provider/server rather than manually by
     * a staff member.
     */
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

    await query("COMMIT")

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
      ).catch(() => ({ rows: [] }))

    const caseRow = caseInfo.rows[0]

    await notifyUser(caseRow?.client_user_id, {
      caseId: current.case_id,
      type: "payment_confirmed",
      title: "Payment confirmed",
      message: "Your payment has been confirmed and your investigation is now active.",
      metadata: {
        request_id: current.request_id,
        case_id: current.case_id,
        payment_id: current.id,
        target_page: "case",
        action: "open_case",
      },
    })

    await notifySuperAdmins({
      type: "case_ready_for_assignment",
      title: "Case ready for assignment",
      message: `${caseRow?.case_number || "A case"} is paid and ready for investigator assignment.`,
      metadata: {
        request_id: current.request_id,
        case_id: current.case_id,
        payment_id: current.id,
        target_page: "case_assignment",
        action: "assign_investigator",
      },
    })

    return {
      success: true,
      payment_id: current.id,
      request_id:
        current.request_id || undefined,
      case_id: current.case_id,
      status: "paid",
      message:
        "Payment confirmed and investigation activated",
    }
  } catch (error) {
    await query("ROLLBACK")
    throw error
  }
}
