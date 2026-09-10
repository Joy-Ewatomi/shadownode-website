"use client"

import {
  useEffect,
  useState,
} from "react"

import {
  useRouter,
  useSearchParams,
} from "next/navigation"

/*
 * ==========================================================
 * REQUEST DATA
 * ==========================================================
 */

type RequestData = {
  preferred_currency: string | null

  id: string
  case_number: string | null
  title: string | null
  service_type: string | null
  category: string | null
  description: string | null
  investigation_objective: string | null
  status: string
  priority: string | null
  preferred_deadline: string | null
  osint_completion_date: string | null

  client_email: string | null
  client_username: string | null

  ai_status: string | null
  ai_price_estimate: number | null
  ai_complexity: string | null
  ai_confidence: number | null
  ai_estimated_hours: number | null
  ai_suggested_service: string | null
  ai_suggested_priority: string | null
  ai_reasoning: string | null
  ai_analysis: string | null

  approved_quote_amount: number | null
  approved_quote_currency: string | null
  approved_quote_notes: string | null

  approved_estimated_start: string | null
  approved_estimated_completion: string | null

  admin_quote_action: string | null
  admin_quote_notes: string | null
  admin_reviewed_by: string | null
  admin_reviewed_at: string | null

  training_preferred_start_date: string | null
  training_preferred_completion_date: string | null
  training_timeline_flexible: boolean | null
}

/*
 * ==========================================================
 * FORM
 * ==========================================================
 */

type FormState = {
  amount: string
  currency: string
  start_date: string
  completion_date: string
  reason: string
}

/*
 * ==========================================================
 * WORKFLOW
 * ==========================================================
 */

type RequestWorkflow =
  | "professional_training"
  | "cybersecurity_training"
  | "security_assessment"
  | "investigation"

/*
 * ==========================================================
 * ADMIN ACTIVE STATUSES
 * ==========================================================
 */

const ADMIN_ACTION_STATUSES = [
  "pending_admin_review",
  "negotiation_requested",
  "negotiating",
  "under_negotiation",
] as const

/*
 * ==========================================================
 * ADMIN QUOTE HISTORY
 * ==========================================================
 */

type AdminQuote = {
  id: string
  price: number | null
  currency: string | null
  estimated_completion: string | null
  reasoning: string | null
  notes: string | null
  status: string | null
}

/*
 * ==========================================================
 * CURRENT CLIENT NEGOTIATION
 * ==========================================================
 */

type CurrentNegotiation = {
  id: string
  request_id: string
  client_id: string | null

  assigned_reviewer_id?: string | null

  round_number: number

  status: string

  original_ai_estimate?: number | null

  original_quote_amount?: number | null

  quote_currency: string | null

  requested_budget: number | null

  client_reason: string | null
  client_notes: string | null

  administrator_recommendation?: string | null
  revised_quote_amount?: number | null

  created_at: string | null
  updated_at: string | null
}

/*
 * ==========================================================
 * WORKFLOW RESOLVER
 * ==========================================================
 */

function resolveWorkflow(
  serviceType: string | null,
): RequestWorkflow {
  const service =
    (serviceType || "")
      .trim()
      .toLowerCase()

  if (
    service ===
    "professional_training"
  ) {
    return "professional_training"
  }

  if (
    service ===
      "cybersecurity_training" ||
    service ===
      "custom_training" ||
    service ===
      "security_awareness" ||
    service.includes(
      "cybersecurity",
    ) ||
    service.includes(
      "cyber security",
    ) ||
    service.includes(
      "security awareness",
    )
  ) {
    return "cybersecurity_training"
  }

  if (
    service ===
      "security_assessment" ||
    service.includes(
      "penetration testing",
    ) ||
    service.includes(
      "penetration test",
    ) ||
    service.includes(
      "vulnerability assessment",
    )
  ) {
    return "security_assessment"
  }

  if (
    service ===
      "investigation" ||
    service.includes("osint") ||
    service.includes(
      "open source intelligence",
    ) ||
    service.includes(
      "digital investigation",
    ) ||
    service.includes(
      "digital intelligence",
    )
  ) {
    return "investigation"
  }

  return "investigation"
}

/*
 * ==========================================================
 * DATE HELPERS
 * ==========================================================
 */

function toDateInputValue(
  value:
    | string
    | null
    | undefined,
): string {
  if (!value) {
    return ""
  }

  const raw =
    String(value).trim()

  if (!raw) {
    return ""
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      raw,
    )
  ) {
    return raw
  }

  const isoMatch =
    raw.match(
      /^(\d{4}-\d{2}-\d{2})/,
    )

  if (isoMatch) {
    return isoMatch[1]
  }

  const date =
    new Date(raw)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return ""
  }

  return date
    .toISOString()
    .slice(0, 10)
}

function isValidDateValue(
  value: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false
  }

  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(Number)

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    )

  return (
    date.getUTCFullYear() ===
      year &&
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() ===
      day
  )
}

/*
 * ==========================================================
 * COMPONENT
 * ==========================================================
 */

export default function AdminRequestReviewCard({
  request,
  adminQuote,
}: {
  request: RequestData
  adminQuote?: AdminQuote | null
}) {
  const router =
    useRouter()

  const searchParams =
    useSearchParams()

  const isHistoryView =
    searchParams.get(
      "history",
    ) === "true"

  /*
   * ========================================================
   * WORKFLOW
   * ========================================================
   */

  const workflow =
    resolveWorkflow(
      request.service_type,
    )

  const isProfessionalTraining =
    workflow ===
    "professional_training"

  const isCyberSecurity =
    workflow ===
    "cybersecurity_training"

  const isSecurityAssessment =
    workflow ===
    "security_assessment"

  const isInvestigation =
    workflow ===
    "investigation"

  const hasTrainingDates =
    isProfessionalTraining ||
    isCyberSecurity

  const objectiveLabel =
    hasTrainingDates
      ? "Training Objective"
      : isSecurityAssessment
        ? "Assessment Objective"
        : "Investigation Objective"

  /*
   * ========================================================
   * STATUS
   * ========================================================
   */

  const normalizedStatus =
    String(
      request.status ||
        "",
    )
      .trim()
      .toLowerCase()

  const isNegotiation =
    normalizedStatus ===
      "negotiation_requested" ||
    normalizedStatus ===
      "negotiating" ||
    normalizedStatus ===
      "under_negotiation"

  const adminCanAct =
    ADMIN_ACTION_STATUSES.includes(
      normalizedStatus as
        (typeof ADMIN_ACTION_STATUSES)[number],
    )

  /*
   * ========================================================
   * PREVIOUS ADMIN SUBMISSION
   * ========================================================
   */

  const previousAdminSubmissionExists =
    Boolean(
      request.admin_reviewed_by ||
        request.admin_reviewed_at ||
        request.admin_quote_action ||
        request.admin_quote_notes ||
        request.approved_quote_amount,
    )

  /*
   * ========================================================
   * STATE
   * ========================================================
   */

  const [
    currentNegotiation,
    setCurrentNegotiation,
  ] =
    useState<
      CurrentNegotiation | null
    >(null)

  const [
    negotiationLoading,
    setNegotiationLoading,
  ] =
    useState(false)

  const [
    loading,
    setLoading,
  ] =
    useState(false)

  const [
    message,
    setMessage,
  ] =
    useState("")

  /*
   * ========================================================
   * FORM
   * ========================================================
   *
   * The first render uses the request itself.
   *
   * Negotiation values are inserted after
   * currentNegotiation is fetched.
   */

  const [
    form,
    setForm,
  ] =
    useState<FormState>({
      amount:
        request.approved_quote_amount !=
        null
          ? String(
              request.approved_quote_amount,
            )
          : "",

      currency:
        request.approved_quote_currency ||
        "USD",

      start_date:
        hasTrainingDates
          ? toDateInputValue(
              request.training_preferred_start_date,
            )
          : "",

      completion_date:
        hasTrainingDates
          ? toDateInputValue(
              request
                .training_preferred_completion_date ||
                request.approved_estimated_completion,
            )
          : toDateInputValue(
              request
                .osint_completion_date ||
                request.preferred_deadline ||
                request.approved_estimated_completion,
            ),

      reason: "",
    })

  /*
   * ========================================================
   * LOAD CURRENT NEGOTIATION
   * ========================================================
   *
   * This is what retrieves:
   *
   *   requested_budget
   *   quote_currency
   *   client_reason
   *   client_notes
   *
   * for the current negotiation cycle.
   */

  useEffect(() => {
    if (!isNegotiation) {
      setCurrentNegotiation(
        null,
      )
      return
    }

    let cancelled =
      false

    async function loadCurrentNegotiation() {
      try {
        setNegotiationLoading(
          true,
        )

        const response =
          await fetch(
            "/api/admin/quote-negotiations",
            {
              method: "GET",

              credentials:
                "include",

              cache:
                "no-store",

              headers: {
                Accept:
                  "application/json",
              },
            },
          )

        if (!response.ok) {
          throw new Error(
            "Failed to load current negotiation.",
          )
        }

        const data =
          await response.json()

        const reviews =
          Array.isArray(
            data?.reviews,
          )
            ? data.reviews
            : []

        /*
         * The endpoint returns the newest
         * negotiation for each request.
         *
         * We still explicitly match the
         * request id.
         */

        const negotiation =
          reviews.find(
            (
              item: CurrentNegotiation,
            ) =>
              item.request_id ===
                request.id &&
              (
                item.status ===
                  "requested" ||
                item.status ===
                  "reviewing"
              ),
          ) || null

        if (!cancelled) {
          setCurrentNegotiation(
            negotiation,
          )
        }
      } catch (error) {
        console.error(
          "LOAD CURRENT NEGOTIATION ERROR",
          error,
        )

        if (!cancelled) {
          setCurrentNegotiation(
            null,
          )
        }
      } finally {
        if (!cancelled) {
          setNegotiationLoading(
            false,
          )
        }
      }
    }

    void loadCurrentNegotiation()

    return () => {
      cancelled = true
    }
  }, [
    isNegotiation,
    request.id,
  ])

  /*
   * ========================================================
   * SYNC FORM
   * ========================================================
   *
   * IMPORTANT:
   *
   * Negotiation:
   *   amount   = client requested budget
   *   currency = client currency
   *
   * Initial review:
   *   amount   = current request quote/estimate
   *   currency = USD
   */

  useEffect(() => {
    const startDate =
      hasTrainingDates
        ? toDateInputValue(
            request.training_preferred_start_date,
          )
        : ""

    const completionDate =
      hasTrainingDates
        ? toDateInputValue(
            request
              .training_preferred_completion_date ||
              request.approved_estimated_completion,
          )
        : toDateInputValue(
            request
              .osint_completion_date ||
              request.preferred_deadline ||
              request.approved_estimated_completion,
          )

    setForm(
      (previous) => {
        /*
         * --------------------------------------------------
         * NEGOTIATION
         * --------------------------------------------------
         */

        if (
          isNegotiation &&
          currentNegotiation
        ) {
          return {
            ...previous,

            amount:
              currentNegotiation.requested_budget !=
              null
                ? String(
                    currentNegotiation.requested_budget,
                  )
                : "",

            currency:
              currentNegotiation.quote_currency ||
              request.preferred_currency ||
              "NGN",

            start_date:
              startDate,

            completion_date:
              completionDate,
          }
        }

        /*
         * --------------------------------------------------
         * INITIAL ADMIN REVIEW
         * --------------------------------------------------
         */

        return {
          ...previous,

          amount:
            request.approved_quote_amount !=
            null
              ? String(
                  request.approved_quote_amount,
                )
              : "",

          currency:
            "USD",

          start_date:
            startDate,

          completion_date:
            completionDate,
        }
      },
    )
  }, [
    isNegotiation,
    currentNegotiation,

    hasTrainingDates,

    request.preferred_currency,

    request.approved_quote_amount,

    request.training_preferred_start_date,
    request.training_preferred_completion_date,

    request.osint_completion_date,
    request.preferred_deadline,
    request.approved_estimated_completion,
  ])

  /*
   * ========================================================
   * FIELD UPDATE
   * ========================================================
   */

  function updateForm<
    K extends keyof FormState
  >(
    field: K,
    value: FormState[K],
  ) {
    setForm(
      (previous) => ({
        ...previous,
        [field]:
          value,
      }),
    )
  }

  /*
   * ========================================================
   * SUBMIT
   * ========================================================
   */

  async function submit() {
    try {
      setLoading(true)
      setMessage("")

      /*
       * ----------------------------------------------------
       * CURRENT ADMIN STATE
       * ----------------------------------------------------
       */

      if (!adminCanAct) {
        throw new Error(
          "This request is not currently awaiting Administrator action.",
        )
      }

      /*
       * ----------------------------------------------------
       * NEGOTIATION MUST HAVE BEEN LOADED
       * ----------------------------------------------------
       */

      if (
        isNegotiation &&
        !currentNegotiation?.id
      ) {
        throw new Error(
          negotiationLoading
            ? "The current client negotiation is still loading. Please try again."
            : "The current client negotiation could not be loaded. Please refresh and try again.",
        )
      }

      /*
       * ----------------------------------------------------
       * AMOUNT
       * ----------------------------------------------------
       */

      const amount =
        Number(
          form.amount,
        )

      if (
        !Number.isFinite(
          amount,
        ) ||
        amount <= 0
      ) {
        throw new Error(
          "Enter a valid proposed quote amount.",
        )
      }

      /*
       * ----------------------------------------------------
       * REASON
       * ----------------------------------------------------
       */

      const reason =
        form.reason.trim()

      if (!reason) {
        throw new Error(
          "A reason is required before submitting the recommendation.",
        )
      }

      /*
       * ----------------------------------------------------
       * COMPLETION DATE
       * ----------------------------------------------------
       */

      if (
        !form.completion_date
      ) {
        throw new Error(
          hasTrainingDates
            ? "A training completion date is required."
            : "An estimated completion date is required.",
        )
      }

      if (
        !isValidDateValue(
          form.completion_date,
        )
      ) {
        throw new Error(
          hasTrainingDates
            ? "Training completion date must be a valid date."
            : "Estimated completion must be a valid date.",
        )
      }

      /*
       * ----------------------------------------------------
       * TRAINING START DATE
       * ----------------------------------------------------
       */

      if (
        hasTrainingDates &&
        !form.start_date
      ) {
        throw new Error(
          "A training start date is required.",
        )
      }

      if (
        hasTrainingDates &&
        !isValidDateValue(
          form.start_date,
        )
      ) {
        throw new Error(
          "Training start date must be a valid date.",
        )
      }

      /*
       * ----------------------------------------------------
       * PAYLOAD
       * ----------------------------------------------------
       *
       * INITIAL:
       *
       *   action = submit
       *   amount = USD
       *   currency = USD
       *
       * NEGOTIATION:
       *
       *   action = submit
       *   negotiation_id = current negotiation
       *   amount = client's negotiation currency
       *   currency = client currency
       */

      const payload = {
        action:
          "submit",

        negotiation_id:
          isNegotiation
            ? currentNegotiation?.id
            : undefined,

        approved_quote_amount:
          amount,

        approved_quote_currency:
          isNegotiation
            ? form.currency
            : "USD",

        approved_estimated_start:
          hasTrainingDates
            ? form.start_date
            : undefined,

        approved_estimated_completion:
          form.completion_date,

        admin_quote_notes:
          reason,

        reason,

        decision_source:
          isNegotiation
            ? "adjusted"
            : "admin",
      }

      /*
       * ----------------------------------------------------
       * API
       * ----------------------------------------------------
       */

      const response =
        await fetch(
          `/api/admin/requests/${encodeURIComponent(
            request.id,
          )}`,
          {
            method: "PATCH",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify(
                payload,
              ),
          },
        )

      let data: {
        error?: string
        message?: string
      } = {}

      try {
        data =
          await response.json()
      } catch {
        data = {}
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Administrator submission failed.",
        )
      }

      /*
       * ----------------------------------------------------
       * RETURN TO ACTIVE REQUEST LIST
       * ----------------------------------------------------
       */

      router.push(
        "/dashboard/requests",
      )

      router.refresh()
    } catch (error) {
      console.error(
        "ADMIN REQUEST SUBMISSION ERROR",
        error,
      )

      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong.",
      )
    } finally {
      setLoading(false)
    }
  }

  /*
   * ========================================================
   * RENDER
   * ========================================================
   */

  return (
    <div className="space-y-6">

      {/* ====================================================
          ERROR
      ==================================================== */}

      {message && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {message}
        </div>
      )}

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="rounded-md border border-[#143b28] bg-[#06110f] p-6">

        <div className="flex flex-wrap items-start justify-between gap-4">

          <div className="min-w-0">

            <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              Administrator Review
            </p>

            <h2 className="mt-3 break-words text-2xl font-bold text-white">
              {request.title ||
                "Untitled Request"}
            </h2>

            <p className="mt-2 text-sm text-white/50">
              {request.case_number ||
                "No case number assigned"}
            </p>

          </div>

          <div className="min-w-0 max-w-full rounded border border-[#143b28] bg-black px-4 py-2">

            <p className="text-[10px] uppercase tracking-widest text-white/40">
              Status
            </p>

            <p className="mt-1 max-w-full break-all text-sm font-semibold uppercase text-[#20dc73]">
              {request.status}
            </p>

          </div>

        </div>

        {adminCanAct && (
          <div className="mt-4 rounded border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-200">
            Administrator action required for the current workflow cycle.
          </div>
        )}

        {!adminCanAct &&
          previousAdminSubmissionExists && (
            <div className="mt-4 rounded border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-white/40">
              This request is not currently awaiting Administrator action.
              Previous submissions remain available in history.
            </div>
          )}

      </div>

      {/* ====================================================
          FULL CLIENT REQUEST
      ==================================================== */}

      <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">

        <div className="mb-5 border-b border-white/10 pb-5">

          <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
            Request Information
          </p>

          <h3 className="mt-2 text-lg font-semibold text-white">
            Full Client Request
          </h3>

          <p className="mt-1 text-sm text-white/40">
            Complete request information submitted by the client.
          </p>

        </div>

        <div className="grid min-w-0 max-w-full gap-5 md:grid-cols-2">

          <div>

            <p className="text-xs uppercase tracking-wider text-white/40">
              Client Username
            </p>

            <p className="mt-1 break-words text-sm text-white">
              {request.client_username ||
                "Not available"}
            </p>

          </div>

          <div>

            <p className="text-xs uppercase tracking-wider text-white/40">
              Client Email
            </p>

            <p className="mt-1 break-words text-sm text-white">
              {request.client_email ||
                "Not available"}
            </p>

          </div>

          <div>

            <p className="text-xs uppercase tracking-wider text-white/40">
              Service Type
            </p>

            <p className="mt-1 break-words text-sm text-white">
              {request.service_type ||
                "Not specified"}
            </p>

          </div>

          <div>

            <p className="text-xs uppercase tracking-wider text-white/40">
              Category
            </p>

            <p className="mt-1 break-words text-sm text-white">
              {request.category ||
                "Not specified"}
            </p>

          </div>

          <div>

            <p className="text-xs uppercase tracking-wider text-white/40">
              Priority
            </p>

            <p className="mt-1 break-words text-sm text-white">
              {request.priority ||
                "Not specified"}
            </p>

          </div>

          <div>

            <p className="text-xs uppercase tracking-wider text-white/40">
              Status
            </p>

            <p className="mt-1 text-sm uppercase text-[#20dc73]">
              {request.status}
            </p>

          </div>

          <div className="min-w-0 md:col-span-2">

            <p className="text-xs uppercase tracking-wider text-white/40">
              {objectiveLabel}
            </p>

            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/80">
              {request.investigation_objective ||
                "No objective provided."}
            </p>

          </div>

          <div className="min-w-0 md:col-span-2">

            <p className="text-xs uppercase tracking-wider text-white/40">
              Client Description
            </p>

            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/80">
              {request.description ||
                "No description provided."}
            </p>

          </div>

        </div>
      </div>

      {/* ====================================================
          AI ASSESSMENT
      ==================================================== */}

      <div className="rounded-md border border-[#20dc73]/20 bg-[#06110f] p-5">

        <div className="mb-6 border-b border-[#20dc73]/10 pb-5">

          <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
            Intelligence Assessment
          </p>

          <h3 className="mt-2 text-lg font-semibold text-white">
            AI Assessment
          </h3>

          <p className="mt-1 text-sm text-white/40">
            Review the complete AI assessment before preparing your submission.
          </p>

        </div>

        <div className="grid min-w-0 gap-5 md:grid-cols-3">

          <div>

            <p className="text-xs uppercase tracking-wider text-white/40">
              AI Status
            </p>

            <p className="mt-1 text-sm text-white">
              {request.ai_status ||
                "Pending"}
            </p>

          </div>

          <div>

            <p className="text-xs uppercase tracking-wider text-white/40">
              AI Estimate
            </p>

            <p className="mt-1 text-lg font-semibold text-white">
              {request.ai_price_estimate != null
                ? Number(
                    request.ai_price_estimate,
                  ).toLocaleString()
                : "Pending"}{" "}
              USD
            </p>

          </div>

          <div>

            <p className="text-xs uppercase tracking-wider text-white/40">
              Complexity
            </p>

            <p className="mt-1 text-sm text-white">
              {request.ai_complexity ||
                "Pending"}
            </p>

          </div>

          <div>

            <p className="text-xs uppercase tracking-wider text-white/40">
              Estimated Hours
            </p>

            <p className="mt-1 text-sm text-white">
              {request.ai_estimated_hours != null
                ? request.ai_estimated_hours
                : "Pending"}
            </p>

          </div>

          <div>

            <p className="text-xs uppercase tracking-wider text-white/40">
              Confidence
            </p>

            <p className="mt-1 text-sm font-semibold text-[#20dc73]">
              {request.ai_confidence != null
                ? `${(
                    request.ai_confidence <=
                    1
                      ? request.ai_confidence * 100
                      : request.ai_confidence
                  ).toFixed(0)}%`
                : "Pending"}
            </p>

          </div>

          <div>

            <p className="text-xs uppercase tracking-wider text-white/40">
              Suggested Priority
            </p>

            <p className="mt-1 text-sm text-white">
              {request.ai_suggested_priority ||
                "Pending"}
            </p>

          </div>

          <div className="md:col-span-3">

            <p className="text-xs uppercase tracking-wider text-white/40">
              Suggested Service
            </p>

            <p className="mt-1 text-sm text-white">
              {request.ai_suggested_service ||
                "Pending"}
            </p>

          </div>

          <div className="min-w-0 md:col-span-3">

            <p className="text-xs uppercase tracking-wider text-white/40">
              AI Reasoning
            </p>

            <div className="mt-2 w-full min-w-0 overflow-hidden rounded-md border border-[#143b28] bg-black/40 p-4">

              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/70">
                {request.ai_reasoning ||
                  "No AI reasoning available."}
              </p>

            </div>

          </div>

          <div className="min-w-0 md:col-span-3">

            <p className="text-xs uppercase tracking-wider text-white/40">
              AI Analysis
            </p>

            <div className="mt-2 w-full min-w-0 max-w-full overflow-hidden rounded-md border border-[#143b28] bg-black/40 p-4">

              <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-white/60">
                {request.ai_analysis ||
                  "No AI analysis available."}
              </pre>

            </div>

          </div>

        </div>
      </div>

      {/* ====================================================
          PREVIOUS ADMINISTRATOR SUBMISSION
      ==================================================== */}

      {previousAdminSubmissionExists && (
        <div className="w-full min-w-0 overflow-hidden rounded-md border border-[#20dc73]/20 bg-[#20dc73]/[0.03] p-5">

          <div className="mb-5 min-w-0 border-b border-white/10 pb-5">

            <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              Administrator Record
            </p>

            <h3 className="mt-2 break-words text-lg font-semibold text-white">
              Previous Submission
            </h3>

            <p className="mt-1 break-words text-sm text-white/40">
              The previous Administrator submission is retained
              as historical record. A new workflow cycle may
              still require another submission.
            </p>

          </div>

          <div className="grid min-w-0 max-w-full gap-5 md:grid-cols-3">

            <div className="min-w-0">

              <p className="text-xs uppercase tracking-wider text-white/40">
                Submitted Quote
              </p>

              <p className="mt-1 break-words text-lg font-semibold text-white">

                {adminQuote?.currency ||
                  "USD"}{" "}

                {adminQuote?.price != null
                  ? Number(
                      adminQuote.price,
                    ).toLocaleString()
                  : "Not specified"}

              </p>

            </div>

            <div className="min-w-0">

              <p className="text-xs uppercase tracking-wider text-white/40">
                {hasTrainingDates
                  ? "Training Completion Date"
                  : "Estimated Completion"}
              </p>

              <p className="mt-1 break-words text-sm text-white">
                {adminQuote?.estimated_completion ||
                  "Not specified"}
              </p>

            </div>

            <div className="min-w-0">

              <p className="text-xs uppercase tracking-wider text-white/40">
                Submission Status
              </p>

              <p className="mt-1 break-words text-sm font-semibold uppercase text-[#20dc73]">
                {adminCanAct
                  ? "Previous submission retained"
                  : "Historical record"}
              </p>

            </div>

            <div className="min-w-0 md:col-span-3">

              <p className="text-xs uppercase tracking-wider text-white/40">
                Administrator Notes
              </p>

              <div className="mt-2 w-full overflow-hidden rounded-md border border-[#143b28] bg-black/40 p-4">

                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/70 [overflow-wrap:anywhere]">
                  {adminQuote?.reasoning ||
                    adminQuote?.notes ||
                    "No administrator notes provided."}
                </p>

              </div>

            </div>

            {request.admin_reviewed_at && (
              <div className="min-w-0 md:col-span-3">

                <p className="text-xs uppercase tracking-wider text-white/40">
                  Submitted At
                </p>

                <p className="mt-1 break-words text-sm text-white/60">
                  {new Date(
                    request.admin_reviewed_at,
                  ).toLocaleString()}
                </p>

              </div>
            )}

          </div>

        </div>
      )}

      {/* ====================================================
          CURRENT CLIENT NEGOTIATION
      ==================================================== */}

      {isNegotiation && (
     <div className="w-full min-w-0 overflow-hidden rounded-md border border-[#20dc73]/20 bg-[#20dc73]/[0.03] p-5">

          <div className="mb-5 min-w-0 border-b border-white/10 pb-5">

            <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              Client Negotiation
            </p>

            <h3 className="mt-2 text-lg font-semibold text-white">
              Current Client Quote Request
            </h3>

            <p className="mt-1 text-sm leading-6 text-white/40">
              The client has requested a change to the current
              quote. Review the request below before submitting
              your recommendation to the Super Administrator.
            </p>

          </div>

          {negotiationLoading && (
            <div className="mb-5 rounded border border-yellow-500/20 bg-black/20 px-4 py-3 text-sm text-yellow-200">
              Loading current negotiation...
            </div>
          )}

          {!negotiationLoading &&
            !currentNegotiation && (
              <div className="rounded border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
                The current client negotiation could not be
                loaded. Refresh the page before submitting.
              </div>
            )}

          {currentNegotiation && (
            <div className="grid min-w-0 gap-4 md:grid-cols-3">

              {/* CLIENT REQUESTED AMOUNT */}
              <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4">

                <p className="text-xs uppercase tracking-wider text-white/40">
                  Client Proposed Amount
                </p>

                <p className="mt-2 break-words text-xl font-semibold text-white">

                  {currentNegotiation.quote_currency ||
                    request.preferred_currency ||
                    "NGN"}{" "}

                  {currentNegotiation.requested_budget !=
                  null
                    ? Number(
                        currentNegotiation.requested_budget,
                      ).toLocaleString()
                    : "Not specified"}

                </p>

              </div>

              {/* CURRENT ORIGINAL QUOTE */}
              <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4">

                <p className="text-xs uppercase tracking-wider text-white/40">
                  Original Quote
                </p>

                <p className="mt-2 break-words text-lg font-semibold text-white">

                  {currentNegotiation.quote_currency ||
                    request.preferred_currency ||
                    "NGN"}{" "}

                  {currentNegotiation.original_quote_amount !=
                  null
                    ? Number(
                        currentNegotiation.original_quote_amount,
                      ).toLocaleString()
                    : request.approved_quote_amount !=
                        null
                      ? Number(
                          request.approved_quote_amount,
                        ).toLocaleString()
                      : "Not specified"}

                </p>

              </div>

              {/* ROUND */}
              <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4">

                <p className="text-xs uppercase tracking-wider text-white/40">
                  Negotiation Round
                </p>

                <p className="mt-2 text-sm font-semibold text-white">
                  Round{" "}
                  {currentNegotiation.round_number}
                </p>

              </div>

              {/* STATUS */}
              <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4">

                <p className="text-xs uppercase tracking-wider text-white/40">
                  Negotiation Status
                </p>

                <p className="mt-2 break-words text-sm font-semibold uppercase text-white">
                  {currentNegotiation.status}
                </p>

              </div>

              {/* CURRENCY */}
              <div className="min-w-0 rounded border border-[#143b28] bg-black/30 p-4">

                <p className="text-xs uppercase tracking-wider text-white/40">
                  Negotiation Currency
                </p>

                <p className="mt-2 text-sm font-semibold text-white">
                  {currentNegotiation.quote_currency ||
                    request.preferred_currency ||
                    "NGN"}
                </p>

              </div>

              {/* CLIENT REASON */}
              {currentNegotiation.client_reason && (
                <div className="min-w-0 md:col-span-3">

                  <p className="text-xs uppercase tracking-wider text-white/40">
                    Client Reason
                  </p>

                  <div className="mt-2 rounded border border-[#143b28] bg-black/30 p-4">

                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-white/70">
                      {currentNegotiation.client_reason}
                    </p>

                  </div>

                </div>
              )}

              {/* CLIENT NOTES */}
              {currentNegotiation.client_notes && (
                <div className="min-w-0 md:col-span-3">

                  <p className="text-xs uppercase tracking-wider text-white/40">
                    Client Notes
                  </p>

                  <div className="mt-2 rounded border border-[#143b28] bg-black/30 p-4">

                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-white/70">
                      {currentNegotiation.client_notes}
                    </p>

                  </div>

                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ====================================================
          CURRENT ADMINISTRATOR ACTION
      ==================================================== */}

      {adminCanAct &&
        !isHistoryView && (
          <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">

            <div className="mb-6 border-b border-white/10 pb-5">

              <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
                {isNegotiation
                  ? "Negotiation Review"
                  : "Administrator Submission"}
              </p>

              <h3 className="mt-2 text-lg font-semibold text-white">
                {isNegotiation
                  ? "Respond to Current Negotiation"
                  : "Submit Quote to Super Administrator"}
              </h3>

              <p className="mt-1 text-sm text-white/40">
                {isNegotiation
                  ? "Review the client's requested amount and prepare your recommendation for Super Administrator final review."
                  : "Prepare the initial Administrator quote for Super Administrator final review."}
              </p>

            </div>

            <div className="grid gap-5 md:grid-cols-2">

              {/* =================================================
                  PROPOSED QUOTE
              ================================================= */}

              <label className="text-sm text-white/60">

                <span className="mb-2 block">
                  {isNegotiation
                    ? "Administrator Proposed Quote"
                    : "Proposed Quote"}
                </span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  disabled={
                    loading
                  }
                  value={
                    form.amount
                  }
                  onChange={(
                    event,
                  ) =>
                    updateForm(
                      "amount",
                      event.target.value,
                    )
                  }
                  className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73] disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={
                    isNegotiation
                      ? "Enter Administrator response amount"
                      : "Enter proposed amount"
                  }
                />

                {isNegotiation &&
                  currentNegotiation && (
                    <p className="mt-2 text-xs text-yellow-300/60">
                      Client requested:{" "}
                      {currentNegotiation.quote_currency ||
                        request.preferred_currency ||
                        "NGN"}{" "}
                      {currentNegotiation.requested_budget !=
                      null
                        ? Number(
                            currentNegotiation.requested_budget,
                          ).toLocaleString()
                        : "Not specified"}
                    </p>
                  )}

              </label>

              {/* =================================================
                  CURRENCY
              ================================================= */}

              <label className="text-sm text-white/60">

                <span className="mb-2 block">
                  Quote Currency
                </span>

                <input
                  type="text"
                  value={
                    form.currency
                  }
                  disabled
                  className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm font-semibold text-white"
                />

                <p className="mt-2 text-xs text-white/30">

                  {isNegotiation
                    ? `This negotiation continues in the client's preferred currency (${form.currency}). The Administrator responds using the same currency.`
                    : "The initial Administrator quote is prepared in USD. Currency conversion occurs during final Super Administrator approval."}

                </p>

              </label>

              {/* =================================================
                  TRAINING START
              ================================================= */}

              {hasTrainingDates && (
                <label className="text-sm text-white/60">

                  <span className="mb-2 block">
                    Training Start Date
                  </span>

                  <input
                    type="date"
                    disabled={
                      loading
                    }
                    value={
                      form.start_date
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "start_date",
                        event.target.value,
                      )
                    }
                    className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73] disabled:cursor-not-allowed disabled:opacity-50"
                  />

                  <p className="mt-2 text-xs text-white/30">
                    Administrator estimated training start date.
                  </p>

                </label>
              )}

              {/* =================================================
                  COMPLETION
              ================================================= */}

              <label className="text-sm text-white/60">

                <span className="mb-2 block">
                  Estimated Completion Date
                </span>

                <input
                  type="date"
                  disabled={
                    loading
                  }
                  value={
                    form.completion_date
                  }
                  onChange={(
                    event,
                  ) =>
                    updateForm(
                      "completion_date",
                      event.target.value,
                    )
                  }
                  className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73] disabled:cursor-not-allowed disabled:opacity-50"
                />

                <p className="mt-2 text-xs text-white/30">

                  {isProfessionalTraining &&
                    "Professional training completion date."}

                  {isCyberSecurity &&
                    "Cybersecurity training completion date."}

                  {isSecurityAssessment &&
                    "Security assessment estimated completion date."}

                  {isInvestigation &&
                    "Investigation estimated completion date."}

                </p>

              </label>

              {/* =================================================
                  WORKFLOW
              ================================================= */}

              <div className="md:col-span-2">

                <div className="rounded border border-[#143b28] bg-black/30 px-4 py-3">

                  <p className="text-[10px] uppercase tracking-widest text-white/30">
                    Current Workflow Cycle
                  </p>

                  <p className="mt-2 text-sm leading-6 text-white/70">

                    {normalizedStatus ===
                      "pending_admin_review" &&
                      "New client request — Administrator prepares the initial quote for Super Administrator review."}

                    {normalizedStatus ===
                      "negotiation_requested" &&
                      "Negotiation cycle — Administrator reviews the client's requested quote change."}

                    {normalizedStatus ===
                      "negotiating" &&
                      "Active negotiation — Administrator response is required."}

                    {normalizedStatus ===
                      "under_negotiation" &&
                      "Active negotiation — Administrator response is required."}

                  </p>

                </div>

              </div>

              {/* =================================================
                  ADMINISTRATOR AUTHORITY
              ================================================= */}

              <div className="md:col-span-2">

                <div className="rounded border border-[#143b28] bg-black/30 px-4 py-4">

                  <p className="text-[10px] uppercase tracking-widest text-white/30">
                    Administrator Authority
                  </p>

                  <p className="mt-2 text-sm leading-6 text-white/60">

                    {isNegotiation
                      ? "The Administrator reviews the client's negotiation request and submits a recommendation to the Super Administrator. The Administrator does not make the final client-facing decision."
                      : "The Administrator prepares the initial quote and submits it to the Super Administrator. The Administrator does not send the quote directly to the client."}

                  </p>

                </div>

              </div>

              {/* =================================================
                  REASON
              ================================================= */}

              <label className="text-sm text-white/60 md:col-span-2">

                <span className="mb-2 block">
                  Administrator Reason
                </span>

                <textarea
                  disabled={
                    loading
                  }
                  value={
                    form.reason
                  }
                  onChange={(
                    event,
                  ) =>
                    updateForm(
                      "reason",
                      event.target.value,
                    )
                  }
                  rows={6}
                  placeholder={
                    isNegotiation
                      ? "Explain your recommendation, pricing position, scope, complexity, timeline, or other considerations..."
                      : "Explain why the proposed quote and timeline are appropriate..."
                  }
                  className="w-full rounded border border-[#143b28] bg-black px-3 py-3 text-sm text-white outline-none focus:border-[#20dc73] disabled:cursor-not-allowed disabled:opacity-50"
                />

                <p className="mt-2 text-xs text-white/30">
                  {isNegotiation
                    ? "This response becomes a new Administrator negotiation record and is sent to Super Administrator review."
                    : "This submission becomes the Administrator quote proposal and is sent to Super Administrator review."}
                </p>

              </label>

            </div>

            {/* =================================================
                SUBMIT
            ================================================= */}

            <div className="mt-6 border-t border-white/10 pt-6">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="min-w-0">

                  <p className="text-sm font-semibold text-white">
                    Ready for submission?
                  </p>

                  <p className="mt-1 text-xs leading-5 text-white/40">

                    {isNegotiation
                      ? "The current client negotiation response will be recorded and sent to the Super Administrator for final review."
                      : "The initial Administrator quote will be recorded and sent to the Super Administrator for final review."}

                  </p>

                </div>

                <button
                  type="button"
                  disabled={
                    loading ||
                    !adminCanAct ||
                    (
                      isNegotiation &&
                      !currentNegotiation?.id
                    )
                  }
                  onClick={() =>
                    void submit()
                  }
                  className={[
                    "rounded-md px-6 py-3 font-semibold transition",

                    loading ||
                    !adminCanAct ||
                    (
                      isNegotiation &&
                      !currentNegotiation?.id
                    )
                      ? "cursor-not-allowed bg-white/10 text-white/30"
                      : "bg-[#20dc73] text-black hover:bg-[#32ef82]",
                  ].join(" ")}
                >

                  {loading
                    ? "Submitting..."
                    : "Submit to Super Administrator"}

                </button>

              </div>

            </div>

          </div>
        )}

      {/* ====================================================
          NO ACTION STATE
      ==================================================== */}

      {!adminCanAct &&
        !isHistoryView && (
          <div className="rounded-md border border-white/10 bg-black/20 px-5 py-6 text-center">

            <p className="text-sm font-medium text-white/60">
              No Administrator action is required right now.
            </p>

            <p className="mt-1 text-xs text-white/30">
              Historical Administrator submissions remain above,
              while the current request stays in its active workflow state.
            </p>

          </div>
        )}

    </div>
  )
}