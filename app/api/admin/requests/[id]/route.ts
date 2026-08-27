import { NextRequest, NextResponse } from "next/server"

import {
  auditLog,
  isAdminRole,
  requireUser,
} from "@/lib/auth"

import { query } from "@/lib/db"

import {
  recordRequestAudit,
  reviewQuoteAsAdmin,
  declineRequest,
} from "@/lib/services/quote-workflow-service"

/*
 * =====================================================
 * ALLOWED CLIENT CURRENCIES
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

  /*
   * Training-specific client dates.
   */
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

/**
 * Normalize an arbitrary value to a trimmed string.
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

function normalizeDate(value: unknown): string | null {
  const result = clean(value)

  if (!result) {
    return null
  }

  /*
   * =====================================================
   * ISO DATE / ISO DATETIME
   * =====================================================
   *
   * Examples:
   * 2026-09-19
   * 2026-09-19T00:00:00.000Z
   */
  if (/^\d{4}-\d{2}-\d{2}/.test(result)) {
    const date = result.slice(0, 10)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return null
    }

    const [year, month, day] =
      date.split("-").map(Number)

    const check = new Date(
      Date.UTC(year, month - 1, day),
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
   * =====================================================
   * DD/MM/YYYY
   * =====================================================
   *
   * Example:
   * 19/09/2026
   */
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(result)) {
    const [day, month, year] =
      result.split("/").map(Number)

    const check = new Date(
      Date.UTC(year, month - 1, day),
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
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-")
  }

  /*
   * =====================================================
   * DD-MM-YYYY
   * =====================================================
   *
   * Example:
   * 19-09-2026
   */
  if (/^\d{2}-\d{2}-\d{4}$/.test(result)) {
    const [day, month, year] =
      result.split("-").map(Number)

    const check = new Date(
      Date.UTC(year, month - 1, day),
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
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-")
  }

  return null
}

/**
 * Validate a supplied optional date.
 *
 * undefined/null/empty means the field was not supplied.
 * A supplied invalid value throws an error.
 */
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

/**
 * Normalize service_type.
 */
function normalizeServiceType(
  serviceType: unknown,
): string {
  return clean(serviceType)
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
}

/**
 * Determine the exact workflow for the request.
 *
 * professional_training and cybersecurity_training
 * are training workflows and may use:
 *
 * - training_preferred_start_date
 * - training_preferred_completion_date
 * - training_timeline_flexible
 *
 * security_assessment is NOT a training workflow.
 *
 * OSINT/investigation requests must NEVER inherit
 * training dates.
 */
function getRequestWorkflow(
  serviceType: unknown,
): RequestWorkflow {
  const value =
    normalizeServiceType(
      serviceType,
    )

  /*
   * =================================================
   * PROFESSIONAL TRAINING
   * =================================================
   */

if (
  value === "cybersecurity_training" ||
  value === "cyber_security_training" ||
  value === "cybersecurity_training_request" ||
  value === "custom_training" ||
  value.includes("cybersecurity_training") ||
  value.includes("cyber_security_training")
) {
  return "cybersecurity_training"
}

  /*
   * =================================================
   * CYBERSECURITY TRAINING
   * =================================================
   */

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
  value === "custom_training"
) {
  return "custom_training"
}

  /*
   * =================================================
   * SECURITY ASSESSMENT
   * =================================================
   *
   * A security assessment is cybersecurity-related,
   * but it is NOT a training workflow.
   */

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

  /*
   * =================================================
   * DEFAULT
   * =================================================
   *
   * Everything else is treated as investigation/OSINT
   * for date propagation purposes.
   */

  return "investigation"
}

/**
 * Determine whether this request is a training request.
 */
function isTrainingRequest(
  workflow: RequestWorkflow,
): boolean {
  return (
    workflow === "professional_training" ||
    workflow === "cybersecurity_training" ||
    workflow === "custom_training"
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
 params
 }: {
 params: Promise<{id:string}>
}
): Promise<NextResponse>{
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
          error: "Forbidden",
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
     * ACTION NORMALIZATION
     * =================================================
     *
     * The AdminRequestReviewCard sends:
     *
     *   "submit"
     *   "adjust"
     *
     * while the backend workflow historically uses:
     *
     *   "submit_for_super_admin_review"
     *   "adjust_quote"
     *
     * Normalize them here so the frontend and backend
     * can use their respective workflow terminology.
     */

    const rawAction =
      clean(body.action)
        .toLowerCase()

  const action =
  rawAction === "submit"
    ? "submit_for_super_admin_review"
    : rawAction === "adjust"
    ? "adjust_quote"
    : rawAction === "reject"
    ? "reject"
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
     * DETERMINE REQUEST WORKFLOW
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
     * CLIENT REQUESTED DATES
     * =================================================
     *
     * Only training workflows may use these fields.
     *
     * OSINT/investigation and security assessment
     * requests receive null here.
     */

    let clientTrainingStart:
      string | null = null

    let clientTrainingCompletion:
      string | null = null

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
/*
 * =====================================================
 * CLIENT TRAINING DATE HANDLING
 * =====================================================
 *
 * These dates belong to the client request.
 *
 * They are reference values for the Administrator.
 * They must NOT block Administrator quote submission.
 *
 * If an old/legacy request contains an invalid date,
 * treat that value as unavailable rather than rejecting
 * the entire Administrator workflow.
 */

if (
  trainingRequest &&
  item.training_preferred_start_date &&
  !clientTrainingStart
) {
  console.warn(
    "[ADMIN REVIEW] Invalid client training start date:",
    {
      requestId: id,
      value: item.training_preferred_start_date,
    },
  )

  clientTrainingStart = null
}

if (
  trainingRequest &&
  item.training_preferred_completion_date &&
  !clientTrainingCompletion
) {
  console.warn(
    "[ADMIN REVIEW] Invalid client training completion date:",
    {
      requestId: id,
      value: item.training_preferred_completion_date,
    },
  )

  clientTrainingCompletion = null
}

    /*
     * =================================================
     * ADMINISTRATOR WORKFLOW LOCK
     * =================================================
     *
     * Once a request enters Super Administrator review
     * or a final client-facing state, this endpoint must
     * not modify it.
     */

    const lockedStatuses =
      new Set([
        "super_admin_approved",
        "quote_sent",
        "revised_quote_sent",
        "quote_final",
        "final_quote_approved",
        "client_decision_pending",
        "rejected",
      ])

    if (
      lockedStatuses.has(
        String(
          item.status || "",
        ),
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
     */

    const negotiationId =
      body.negotiation_id
        ? clean(
            body.negotiation_id,
          )
        : null

    /*
     * =================================================
     * CURRENCY
     * =================================================
     */

  const currency =
  clean(
    body.quote?.currency ||
    body.approved_quote_currency ||
    item.preferred_currency ||
    "USD",
  ).toUpperCase()

    /*
     * =================================================
     * CURRENCY VALIDATION
     * =================================================
     */

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
     * CASE CREATION PROTECTION
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
     * DIRECT CLIENT QUOTE PROTECTION
     * =================================================
     */

    if (
      action ===
      "send_quote"
    ) {
      return NextResponse.json(
        {
          error:
            "Administrators cannot send quotes directly to clients. Submit the quote for Super Administrator review.",
        },
        {
          status: 409,
        },
      )
    }

    /*
     * =================================================
     * ADJUST QUOTE
     * =================================================
     */

    if (
      action ===
      "adjust_quote"
    ) {
    const amount =
 Number(
   body.quote?.amount ??
   body.approved_quote_amount
 )

   const reason =
 clean(
   body.justification?.reason ||
   body.reason ||
   body.admin_quote_notes ||
   body.quote_notes ||
   ""
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
              "Valid quote amount is required.",
          },
          {
            status: 400,
          },
        )
      }

      if (!reason) {
        return NextResponse.json(
          {
            error:
              "A reason is required for a quote adjustment.",
          },
          {
            status: 400,
          },
        )
      }
/*
 * =================================================
 * ESTIMATED DATES
 * =================================================
 *
 * Training:
 *   estimated start defaults to client start
 *   estimated completion defaults to client completion
 *
 * OSINT / non-training:
 *   estimated start is always null
 *   administrator-supplied completion takes priority
 *   OSINT client completion date is the primary
 *   automatic completion date
 *   preferred_deadline remains as a backward-compatible
 *   fallback for older requests
 */

let estimatedStart: string | null = null

let estimatedCompletion: string | null = null

try {
  if (trainingRequest) {
    /*
     * =================================================
     * TRAINING REQUEST
     * =================================================
     */

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

    estimatedStart =
      suppliedStart ??
      clientTrainingStart

    estimatedCompletion =
      suppliedCompletion ??
      clientTrainingCompletion
  } else {
    /*
     * =================================================
     * NON-TRAINING / OSINT REQUEST
     * =================================================
     */

    const suppliedCompletion =
      validateOptionalDate(
        body.approved_estimated_completion ??
          body.approved_completion_date,
        "Estimated completion",
      )

    /*
     * Client-requested OSINT completion date.
     *
     * This is the primary automatic completion date
     * for OSINT requests.
     */
    const clientOsintCompletionDate =
      normalizeDate(
        item.osint_completion_date,
      )

    /*
     * Legacy fallback.
     *
     * Older requests may still use preferred_deadline.
     */
    const clientPreferredDeadline =
      normalizeDate(
        item.preferred_deadline,
      )

    /*
     * Non-training investigations do not
     * have an estimated start date.
     */
    estimatedStart = null

    /*
     * Completion priority:
     *
     * 1. Administrator-supplied completion date
     * 2. Client's OSINT completion date
     * 3. Legacy preferred deadline
     */
    estimatedCompletion =
      suppliedCompletion ??
      clientOsintCompletionDate ??
      clientPreferredDeadline
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
       * =================================================
       * CENTRAL QUOTE WORKFLOW
       * =================================================
       */

      const reviewed =
        await reviewQuoteAsAdmin({
          requestId: id,

          actorUserId:
            auth.user.id,

          actorRole:
            auth.user.role,

          action: "adjust",

          amount,

          currency,

          notes: reason,

          reason,

          estimated_start:
            estimatedStart,

          estimated_completion:
            estimatedCompletion,
        })

      /*
       * =================================================
       * AUDIT
       * =================================================
       */

      await auditLog(
        auth.user.id,
        "request_quote_adjusted_for_super_admin_review",
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

          negotiation_id:
            negotiationId,
        },
      )

      return NextResponse.json({
        success: true,

        read_only: true,

        status:
          "pending_super_admin_review",

        workflow,

        request: reviewed,
      })
    }

    /*
     * =================================================
     * REJECT REQUEST
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
            "",
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
        success: true,

        request: updated,
      })
    }

    /*
     * =================================================
     * SUBMIT FOR SUPER ADMIN REVIEW
     * =================================================
     */

    if (
      action ===
      "submit_for_super_admin_review"
    ) {
      const amount =
        Number(
          body.approved_quote_amount,
        )

      const reason =
        clean(
          body.reason ||
            body.admin_quote_notes ||
            body.quote_notes ||
            "",
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
       * =================================================
       * ESTIMATED DATES
       * =================================================
       */

      let estimatedStart:
        string | null = null

      let estimatedCompletion:
        string | null = null

      try {
        if (trainingRequest) {
          /*
           * =================================================
           * TRAINING WORKFLOW
           * =================================================
           *
           * Both professional_training and
           * cybersecurity_training use the client's
           * persisted training dates.
           */

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

          estimatedStart =
            suppliedStart ??
            clientTrainingStart

          estimatedCompletion =
            suppliedCompletion ??
            clientTrainingCompletion
        } else {
          /*
           * =================================================
           * NON-TRAINING WORKFLOW
           * =================================================
           *
           * This includes:
           *
           * - OSINT
           * - investigations
           * - security assessments
           *
           * Training dates are NEVER used here.
           */
const suppliedCompletion =
  validateOptionalDate(
    body.approved_estimated_completion ??
      body.approved_completion_date,
    "Estimated completion",
  )

const osintCompletionDate =
  normalizeDate(
    item.osint_completion_date,
  )

const clientPreferredDeadline =
  normalizeDate(
    item.preferred_deadline,
  )

estimatedStart = null

estimatedCompletion =
  suppliedCompletion ??
  osintCompletionDate ??
  clientPreferredDeadline

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
       * =================================================
       * NEGOTIATION VALIDATION
       * =================================================
       */

      if (negotiationId) {
        const negotiationCheck =
          await query<{
            id: string
            status: string
          }>(
            `
              SELECT
                id,
                status

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
                "Negotiation not found for this request.",
            },
            {
              status: 400,
            },
          )
        }

        /*
         * Only active negotiation states may be
         * responded to by the Administrator.
         */

       const validNegotiationStatuses = new Set([
  "requested",
  "reviewing",
])

        if (
          !validNegotiationStatuses.has(
            negotiation.status,
          )
        ) {
          return NextResponse.json(
            {
              error:
                "This negotiation is no longer available for administrator response.",
            },
            {
              status: 409,
            },
          )
        }
      }

      /*
       * =================================================
       * CENTRAL QUOTE WORKFLOW
       * =================================================
       */

      const reviewed =
        await reviewQuoteAsAdmin({
          requestId: id,

          actorUserId:
            auth.user.id,

          actorRole:
            auth.user.role,

          action: "submit",

          amount,

          currency,

          notes: reason,

          reason,

          estimated_start:
            estimatedStart,

          estimated_completion:
            estimatedCompletion,
        })

      /*
       * =================================================
       * UPDATE NEGOTIATION
       * =================================================
       */

      if (
        negotiationId
      ) {
        await query(
          `
            UPDATE quote_negotiations

            SET
              administrator_recommendation = $3,

              revised_quote_amount = $4,

              status =
                'pending_super_admin_review',

              updated_at = NOW()

            WHERE id = $1

              AND request_id = $2
          `,
          [
            negotiationId,

            id,

            reason,

            amount,
          ],
        )

        await recordRequestAudit(
          id,

          auth.user.id,

          "administrator_responded_to_negotiation",

          {
            negotiation_id:
              negotiationId,

            revised_quote_amount:
              amount,

            currency,

            recommendation:
              reason,

            workflow,
          },
        )
      }

      /*
       * =================================================
       * AUDIT
       * =================================================
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

          negotiation_id:
            negotiationId,
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

          negotiation_id:
            negotiationId,

          reason,
        },
      )

      /*
       * =================================================
       * SAFE RESPONSE
       * =================================================
       */

      return NextResponse.json({
        success: true,

        read_only: true,

        status:
          "pending_super_admin_review",

        workflow,

        request: {
          id:
            reviewed.id,

          title:
            reviewed.title,

          status:
            reviewed.status,

          approved_quote_amount:
            reviewed.approved_quote_amount,

          approved_quote_currency:
            reviewed.approved_quote_currency,

          approved_quote_notes:
            reviewed.approved_quote_notes,

          approved_estimated_start:
            reviewed.approved_estimated_start,

          approved_estimated_completion:
            reviewed.approved_estimated_completion,

          workflow,

          training_request:
            trainingRequest,
        },
      })
    }

    /*
     * =================================================
     * UNKNOWN ACTION
     * =================================================
     */

    return NextResponse.json(
      {
        error: action
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