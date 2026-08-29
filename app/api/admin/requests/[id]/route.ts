import { NextRequest, NextResponse } from "next/server"

import {
  auditLog,
  isAdminRole,
  requireUser,
} from "@/lib/auth"

import { query } from "@/lib/db"

import {
  reviewQuoteAsAdmin,
  declineRequest,
  recordRequestAudit,
} from "@/lib/services/quote-workflow-service"

import {
  administratorReviewNegotiation,
} from "@/lib/services/quote-workflow-service"
import { normalizeCurrency } from "@/lib/config/currencies"

/*
 * =====================================================
 * ALLOWED CURRENCIES
 * =====================================================
 */

const allowedCurrencies = new Set([
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "CNY",
  "CAD",
  "AUD",
  "JPY",
  "INR",
  "SGD",
  "KES",
  "GHS",
])

/*
 * =====================================================
 * REQUEST TYPES
 * =====================================================
 */

type RequestWorkflow =
  | "professional_training"
  | "cybersecurity_training"
  | "custom_training"
  | "security_assessment"
  | "investigation"

type QuoteBody = {
  action?: string

  decision_source?:
    | "admin"
    | "adjusted"
    | "ai"
    | null

  approved_quote_amount?: number | string
  approved_quote_currency?: string

  approved_estimated_start?: string
  approved_estimated_completion?: string
  approved_completion_date?: string

  negotiation_id?: string

  quote?: {
    amount?: number | string
    currency?: string
    estimated_completion?: string
  }

  justification?: {
    reason?: string
    notes?: string
  }

  reason?: string
  admin_quote_notes?: string
  quote_notes?: string
}

type RequestRow = {
  id: string
  user_id: string | null

  title: string | null
  description: string | null
  priority: string | null
  timeline: string | null
  service_type: string | null

  case_number: string | null
  converted_case_id: string | null

  preferred_currency: string | null
  preferred_deadline: string | null
  osint_completion_date: string | null

  training_preferred_start_date: string | null
  training_preferred_completion_date: string | null
  training_timeline_flexible: boolean | null

  status: string | null

  approved_quote_amount: number | null
  approved_quote_currency: string | null
  approved_quote_notes: string | null

  approved_estimated_completion: string | null
  approved_estimated_start: string | null

  admin_quote_action: string | null
}

/*
 * =====================================================
 * HELPERS
 * =====================================================
 */

function clean(value: unknown): string {
  if (typeof value === "string") {
    return value.trim()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return ""
}

function normalizeDate(
  value: unknown,
): string | null {
  const result = clean(value)

  if (!result) {
    return null
  }

  /*
   * YYYY-MM-DD or ISO datetime
   */
  if (/^\d{4}-\d{2}-\d{2}/.test(result)) {
    const date = result.slice(0, 10)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return null
    }

    const [
      year,
      month,
      day,
    ] = date
      .split("-")
      .map(Number)

    const check = new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    )

    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day
    ) {
      return null
    }

    return date
  }

  /*
   * DD/MM/YYYY
   */
  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(
      result,
    )
  ) {
    const [
      day,
      month,
      year,
    ] = result
      .split("/")
      .map(Number)

    const check = new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    )

    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day
    ) {
      return null
    }

    return [
      String(year),
      String(month).padStart(
        2,
        "0",
      ),
      String(day).padStart(
        2,
        "0",
      ),
    ].join("-")
  }

  /*
   * DD-MM-YYYY
   */
  if (
    /^\d{2}-\d{2}-\d{4}$/.test(
      result,
    )
  ) {
    const [
      day,
      month,
      year,
    ] = result
      .split("-")
      .map(Number)

    const check = new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    )

    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day
    ) {
      return null
    }

    return [
      String(year),
      String(month).padStart(
        2,
        "0",
      ),
      String(day).padStart(
        2,
        "0",
      ),
    ].join("-")
  }

  return null
}

function validateOptionalDate(
  value: unknown,
  fieldName: string,
): string | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null
  }

  const normalized =
    normalizeDate(value)

  if (!normalized) {
    throw new Error(
      `${fieldName} must be a valid date (YYYY-MM-DD).`,
    )
  }

  return normalized
}

function normalizeServiceType(
  serviceType: unknown,
): string {
  return clean(serviceType)
    .toLowerCase()
    .replace(
      /[\s-]+/g,
      "_",
    )
}

function getRequestWorkflow(
  serviceType: unknown,
): RequestWorkflow {
  const value =
    normalizeServiceType(
      serviceType,
    )

  if (
    value ===
    "professional_training"
  ) {
    return "professional_training"
  }

  if (
    value ===
      "cybersecurity_training" ||
    value ===
      "cyber_security_training" ||
    value ===
      "cybersecurity_training_request" ||
    value.includes(
      "cybersecurity_training",
    ) ||
    value.includes(
      "cyber_security_training",
    )
  ) {
    return "cybersecurity_training"
  }

  if (
    value ===
    "custom_training"
  ) {
    return "custom_training"
  }

  if (
    value ===
      "security_assessment" ||
    value ===
      "cybersecurity_assessment" ||
    value ===
      "cyber_security_assessment"
  ) {
    return "security_assessment"
  }

  return "investigation"
}

function isTrainingRequest(
  workflow: RequestWorkflow,
): boolean {
  return (
    workflow ===
      "professional_training" ||
    workflow ===
      "cybersecurity_training" ||
    workflow ===
      "custom_training"
  )
}

/*
 * =====================================================
 * PATCH
 * =====================================================
 */

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
): Promise<NextResponse> {
  try {
    /*
     * =================================================
     * AUTHENTICATION
     * =================================================
     */

    const auth =
      await requireUser()

    if (!auth.user) {
      return auth.response
    }

    if (
      !isAdminRole(
        auth.user.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Forbidden",
        },
        {
          status: 403,
        },
      )
    }

    /*
     * =================================================
     * REQUEST ID
     * =================================================
     */

    const { id } =
      await params

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Request id is required.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * =================================================
     * BODY
     * =================================================
     */

    let body: QuoteBody

    try {
      body =
        await req.json()
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid JSON request body.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * =================================================
     * ACTION
     * =================================================
     */

    const rawAction =
      clean(body.action)
        .toLowerCase()

    const action =
      rawAction ===
      "submit"
        ? "submit_for_super_admin_review"
        : rawAction ===
            "adjust"
          ? "adjust_quote"
          : rawAction

    /*
     * =================================================
     * LOAD REQUEST
     * =================================================
     */

    const current =
      await query<RequestRow>(
        `
          SELECT
            id,
            user_id,
            title,
            description,
            priority,
            timeline,
            service_type,
            case_number,
            converted_case_id,
            preferred_currency,
            preferred_deadline,
            osint_completion_date,
            training_preferred_start_date,
            training_preferred_completion_date,
            training_timeline_flexible,
            status,
            approved_quote_amount,
            approved_quote_currency,
            approved_quote_notes,
            approved_estimated_start,
            approved_estimated_completion,
            admin_quote_action
          FROM requests
          WHERE id = $1
          LIMIT 1
        `,
        [id],
      )

    const item =
      current.rows[0]

    if (!item) {
      return NextResponse.json(
        {
          error:
            "Request not found.",
        },
        {
          status: 404,
        },
      )
    }

    /*
     * =================================================
     * WORKFLOW
     * =================================================
     */

    const workflow =
      getRequestWorkflow(
        item.service_type,
      )

    const trainingRequest =
      isTrainingRequest(
        workflow,
      )

    /*
     * =================================================
     * CLIENT TRAINING DATES
     * =================================================
     */

    let clientTrainingStart:
      | string
      | null = null

    let clientTrainingCompletion:
      | string
      | null = null

    if (trainingRequest) {
      clientTrainingStart =
        normalizeDate(
          item.training_preferred_start_date,
        )

      clientTrainingCompletion =
        normalizeDate(
          item.training_preferred_completion_date,
        )
    }

    /*
     * =================================================
     * WORKFLOW LOCK
     * =================================================
     */

    const lockedStatuses =
      new Set([
        "super_admin_approved",
        "quote_sent",
        "revised_quote_sent",
        "quote_final",
        "final_quote_approved",
        "client_decision_pending",
        "accepted",
        "rejected",
        "completed",
        "closed",
      ])

    if (
      lockedStatuses.has(
        String(
          item.status ||
            "",
        ).trim(),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This request cannot be modified in its current workflow state.",
        },
        {
          status: 409,
        },
      )
    }

    /*
     * =================================================
     * NEGOTIATION ID
     * =================================================
     *
     * The frontend may send it.
     *
     * If it does not, we automatically locate the
     * active negotiation for this request.
     */

    let negotiationId =
      clean(
        body.negotiation_id,
      ) || null

    if (
      !negotiationId &&
      [
        "negotiation_requested",
        "negotiating",
        "under_negotiation",
      ].includes(
        String(
          item.status ||
            "",
        ).trim(),
      )
    ) {
      const activeNegotiation =
        await query<{
          id: string
        }>(
          `
            SELECT
              id
            FROM quote_negotiations
            WHERE request_id = $1
              AND status IN (
                'requested',
                'reviewing'
              )
            ORDER BY
              created_at DESC
            LIMIT 1
          `,
          [id],
        )

      negotiationId =
        activeNegotiation
          .rows[0]
          ?.id || null
    }

    /*
     * =================================================
     * CURRENCY
     * =================================================
     */

   const currency =
  negotiationId
    ? normalizeCurrency(
        item.preferred_currency,
      )
    : "USD"

    if (
      !allowedCurrencies.has(
        currency,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Unsupported currency.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * =================================================
     * CASE PROTECTION
     * =================================================
     */

    if (
      action ===
      "convert_to_case"
    ) {
      return NextResponse.json(
        {
          error:
            "Cases are created only after final client quote acceptance.",
        },
        {
          status: 409,
        },
      )
    }

    /*
     * =================================================
     * DIRECT QUOTE PROTECTION
     * =================================================
     */

    if (
      action ===
      "send_quote"
    ) {
      return NextResponse.json(
        {
          error:
            "Administrators cannot send quotes directly to clients.",
        },
        {
          status: 409,
        },
      )
    }

    /*
     * =================================================
     * REJECT
     * =================================================
     */

    if (
      action ===
      "reject"
    ) {
      const reason =
        clean(
          body.reason ||
            body.admin_quote_notes ||
            body.quote_notes ||
            body.justification
              ?.reason,
        )

      if (!reason) {
        return NextResponse.json(
          {
            error:
              "A rejection reason is required.",
          },
          {
            status: 400,
          },
        )
      }

      const updated =
        await declineRequest(
          id,
          auth.user.id,
          reason,
        )

      await auditLog(
        auth.user.id,
        "request_rejected",
        req,
        {
          request_id:
            id,
          reason,
          workflow,
        },
      )

      return NextResponse.json({
        success:
          true,
        request:
          updated,
      })
    }

    /*
     * =================================================
     * NEGOTIATION WORKFLOW
     * =================================================
     *
     * IMPORTANT:
     *
     * Client V4
     *     ↓
     * Administrator
     *     ↓
     * V5
     *     ↓
     * Super Administrator
     *
     * We MUST NOT call reviewQuoteAsAdmin()
     * here because that is the normal quote workflow.
     */

    if (
      negotiationId &&
      [
        "negotiation_requested",
        "negotiating",
        "under_negotiation",
      ].includes(
        String(
          item.status ||
            "",
        ).trim(),
      )
    ) {
      /*
       * -------------------------------------------------
       * AMOUNT
       * -------------------------------------------------
       */

      const amount =
        Number(
          body.quote?.amount ??
            body.approved_quote_amount,
        )

      if (
        !Number.isFinite(
          amount,
        ) ||
        amount <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "A valid administrator quote amount is required.",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * -------------------------------------------------
       * REASON
       * -------------------------------------------------
       */

      const reason =
        clean(
          body.justification
            ?.reason ||
            body.reason ||
            body.admin_quote_notes ||
            body.quote_notes,
        )

      if (!reason) {
        return NextResponse.json(
          {
            error:
              "A reason is required for the Administrator negotiation response.",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * -------------------------------------------------
       * NOTES
       * -------------------------------------------------
       */

      const notes =
        clean(
          body.justification
            ?.notes ||
            body.quote_notes,
        ) || null

      /*
       * -------------------------------------------------
       * COMPLETION DATE
       * -------------------------------------------------
       */

      let estimatedCompletion:
        | string
        | null = null

      try {
        const suppliedCompletion =
          validateOptionalDate(
            body.approved_estimated_completion ??
              body.approved_completion_date,
            "Estimated completion",
          )

        if (
          trainingRequest
        ) {
          estimatedCompletion =
            suppliedCompletion ??
            clientTrainingCompletion
        } else {
          estimatedCompletion =
            suppliedCompletion ??
            normalizeDate(
              item.osint_completion_date,
            ) ??
            normalizeDate(
              item.preferred_deadline,
            )
        }
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Invalid completion date.",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * -------------------------------------------------
       * VERIFY NEGOTIATION
       * -------------------------------------------------
       */

      const negotiationCheck =
        await query<{
          id: string
          status: string
          request_id: string
        }>(
          `
            SELECT
              id,
              status,
              request_id
            FROM quote_negotiations
            WHERE id = $1
              AND request_id = $2
            LIMIT 1
          `,
          [
            negotiationId,
            id,
          ],
        )

      const negotiation =
        negotiationCheck
          .rows[0]

      if (!negotiation) {
        return NextResponse.json(
          {
            error:
              "Active negotiation not found for this request.",
          },
          {
            status: 400,
          },
        )
      }

      if (
        ![
          "requested",
          "reviewing",
        ].includes(
          negotiation.status,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "This negotiation is no longer available for Administrator response.",
          },
          {
            status: 409,
          },
        )
      }

      /*
       * -------------------------------------------------
       * CENTRAL NEGOTIATION SERVICE
       * -------------------------------------------------
       */

      const reviewed =
        await administratorReviewNegotiation({
          negotiationId,

          administratorId:
            auth.user.id,

          recommendation:
            reason,

          revisedQuoteAmount:
            amount,

          notes,
        })

      /*
       * -------------------------------------------------
       * AUDIT
       * -------------------------------------------------
       */

      await auditLog(
        auth.user.id,
        "administrator_responded_to_negotiation",
        req,
        {
          request_id:
            id,

          negotiation_id:
            negotiationId,

          quote_version_id:
            reviewed
              .quote_version_id ??
            null,

          approved_quote_amount:
            amount,

          approved_quote_currency:
            currency,

          estimated_completion:
            estimatedCompletion,

          workflow,
        },
      )

      await recordRequestAudit(
        id,
        auth.user.id,
        "administrator_responded_to_negotiation",
        {
          negotiation_id:
            negotiationId,

          quote_version_id:
            reviewed
              .quote_version_id ??
            null,

          revised_quote_amount:
            amount,

          currency,

          recommendation:
            reason,

          estimated_completion:
            estimatedCompletion,

          workflow,
        },
      )

      return NextResponse.json({
        success:
          true,

        read_only:
          true,

        status:
          "pending_super_admin_review",

        workflow,

        negotiation: reviewed,

        request: {
          id:
            id,

          status:
            "pending_super_admin_review",
        },
      })
    }

    /*
     * =================================================
     * NORMAL ADMIN QUOTE
     * =================================================
     */

    if (
      action ===
      "adjust_quote" ||
      action ===
      "submit_for_super_admin_review"
    ) {
      const amount =
        Number(
          body.quote?.amount ??
            body.approved_quote_amount,
        )

      if (
        !Number.isFinite(
          amount,
        ) ||
        amount <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "A valid quote amount is required.",
          },
          {
            status: 400,
          },
        )
      }

      const reason =
        clean(
          body.justification
            ?.reason ||
            body.reason ||
            body.admin_quote_notes ||
            body.quote_notes,
        )

      if (!reason) {
        return NextResponse.json(
          {
            error:
              "A review note is required.",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * -------------------------------------------------
       * DATES
       * -------------------------------------------------
       */

      let estimatedStart:
        | string
        | null = null

      let estimatedCompletion:
        | string
        | null = null

      try {
        const suppliedStart =
          validateOptionalDate(
            body.approved_estimated_start,
            "Estimated start",
          )

        const suppliedCompletion =
          validateOptionalDate(
            body.approved_estimated_completion ??
              body.approved_completion_date,
            "Estimated completion",
          )

        if (
          trainingRequest
        ) {
          estimatedStart =
            suppliedStart ??
            clientTrainingStart

          estimatedCompletion =
            suppliedCompletion ??
            clientTrainingCompletion
        } else {
          estimatedStart =
            null

          estimatedCompletion =
            suppliedCompletion ??
            normalizeDate(
              item.osint_completion_date,
            ) ??
            normalizeDate(
              item.preferred_deadline,
            )
        }
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Invalid date.",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * -------------------------------------------------
       * NORMAL ADMIN QUOTE SERVICE
       * -------------------------------------------------
       */

      const reviewed =
        await reviewQuoteAsAdmin({
          requestId:
            id,

          actorUserId:
            auth.user.id,

          actorRole:
            auth.user.role,

          action:
            action ===
            "adjust_quote"
              ? "adjust"
              : "submit",

          decision_source:
            body.decision_source ===
            "ai"
              ? "ai"
              : action ===
                  "adjust_quote"
                ? "adjust"
                : "admin",

          amount,

          currency,

          notes:
            clean(
              body.justification
                ?.notes ||
                body.quote_notes,
            ) ||
            null,

          reason,

          estimated_start:
            estimatedStart,

          estimated_completion:
            estimatedCompletion,
        })

      /*
       * -------------------------------------------------
       * AUDIT
       * -------------------------------------------------
       */

      await auditLog(
        auth.user.id,
        "request_submitted_for_super_admin_review",
        req,
        {
          request_id:
            id,

          approved_quote_amount:
            amount,

          approved_quote_currency:
            currency,

          estimated_start:
            estimatedStart,

          estimated_completion:
            estimatedCompletion,

          workflow,

          training_request:
            trainingRequest,
        },
      )

      await recordRequestAudit(
        id,
        auth.user.id,
        "request_submitted_for_super_admin_review",
        {
          approved_quote_amount:
            amount,

          approved_quote_currency:
            currency,

          estimated_start:
            estimatedStart,

          estimated_completion:
            estimatedCompletion,

          workflow,

          training_request:
            trainingRequest,

          reason,
        },
      )

      return NextResponse.json({
        success:
          true,

        read_only:
          true,

        status:
          "pending_super_admin_review",

        workflow,

        request: reviewed,
      })
    }

    /*
     * =================================================
     * UNKNOWN ACTION
     * =================================================
     */

    return NextResponse.json(
      {
        error:
          action
            ? `Unsupported action: ${action}`
            : "No action was supplied.",
      },
      {
        status: 400,
      },
    )
  } catch (error) {
    console.error(
      "ADMIN REQUEST PATCH ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to update request.",

        details:
          process.env.NODE_ENV ===
          "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      {
        status: 500,
      },
    )
  }
}