"use client"

import { useEffect, useState } from "react"
import {
  useRouter,
  useSearchParams,
} from "next/navigation"

type RequestData = {
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
  approved_estimated_completion: string | null

  admin_quote_action: string | null
  admin_quote_notes: string | null
  admin_reviewed_by: string | null
  admin_reviewed_at: string | null

  training_preferred_start_date: string | null
  training_preferred_completion_date: string | null
  training_timeline_flexible: boolean | null
}

type FormState = {
  amount: string
  currency: string
  start_date: string
  completion_date: string
  action: "accept" | "adjust"
  reason: string
}

type RequestWorkflow =
  | "professional_training"
  | "cybersecurity_training"
  | "security_assessment"
  | "investigation"

const ADMIN_ACTION_STATUSES = [
  "pending_admin_review",
  "negotiation_requested",
  "negotiating",
  "under_negotiation",
] as const

function resolveWorkflow(
  serviceType: string | null,
): RequestWorkflow {
  const service =
    (serviceType || "")
      .trim()
      .toLowerCase()

  if (service === "professional_training") {
    return "professional_training"
  }

  if (
    service === "cybersecurity_training" ||
    service === "custom_training" ||
    service === "security_awareness" ||
    service.includes("cybersecurity") ||
    service.includes("cyber security") ||
    service.includes("security awareness")
  ) {
    return "cybersecurity_training"
  }

  if (
    service === "security_assessment" ||
    service.includes("penetration testing") ||
    service.includes("penetration test") ||
    service.includes("vulnerability assessment")
  ) {
    return "security_assessment"
  }

  if (
    service === "investigation" ||
    service.includes("osint") ||
    service.includes("open source intelligence") ||
    service.includes("digital investigation") ||
    service.includes("digital intelligence")
  ) {
    return "investigation"
  }

  return "investigation"
}

function toDateInputValue(
  value: string | null | undefined,
): string {
  if (!value) {
    return ""
  }

  const raw = String(value).trim()

  if (!raw) {
    return ""
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  const isoMatch =
    raw.match(/^(\d{4}-\d{2}-\d{2})/)

  if (isoMatch) {
    return isoMatch[1]
  }

  const date = new Date(raw)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return date.toISOString().slice(0, 10)
}

function isValidDateValue(
  value: string,
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] =
    value.split("-").map(Number)

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  )

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

type AdminQuote = {
  id: string
  price: number | null
  currency: string | null
  estimated_completion: string | null
  reasoning: string | null
  notes: string | null
  status: string | null
}

export default function AdminRequestReviewCard({
  request,
  adminQuote,
}: {
  request: RequestData
  adminQuote?: AdminQuote | null
}) {
  const router = useRouter()

  const searchParams = useSearchParams()

  const isHistoryView =
    searchParams.get("history") === "true"

  /*
   * ==========================================================
   * WORKFLOW
   * ==========================================================
   */

  const workflow =
    resolveWorkflow(
      request.service_type,
    )

  const isProfessionalTraining =
    workflow === "professional_training"

  const isCyberSecurity =
    workflow === "cybersecurity_training"

  const isSecurityAssessment =
    workflow === "security_assessment"

  const isInvestigation =
    workflow === "investigation"

  const hasTrainingDates =
    isProfessionalTraining ||
    isCyberSecurity

  /*
   * ==========================================================
   * CURRENT ACTION STATE
   * ==========================================================
   *
   * THIS controls whether the form opens.
   *
   * It does NOT control history.
   */

  const normalizedStatus =
    request.status
      ?.trim()
      .toLowerCase() || ""

  const adminCanAct =
    ADMIN_ACTION_STATUSES.includes(
      normalizedStatus as
        (typeof ADMIN_ACTION_STATUSES)[number],
    )

  /*
   * ==========================================================
   * PREVIOUS ADMIN HISTORY EXISTS
   * ==========================================================
   *
   * This does NOT hide the form.
   *
   * It simply means there is something historical to display.
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
   * ==========================================================
   * STATE
   * ==========================================================
   */

  const [loading, setLoading] =
    useState(false)

  const [message, setMessage] =
    useState("")

  const [form, setForm] =
    useState<FormState>({
      amount:
        request.approved_quote_amount !=
        null
          ? String(
              request.approved_quote_amount,
            )
          : "",

      currency: "USD",

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
              request.osint_completion_date ||
              request.preferred_deadline ||
              request.approved_estimated_completion,
            ),

      action: "accept",

      reason: "",
    })

  /*
   * ==========================================================
   * SYNC FORM WITH CURRENT REQUEST
   * ==========================================================
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
            request.osint_completion_date ||
              request.preferred_deadline ||
              request.approved_estimated_completion,
          )

    setForm((previous) => ({
      ...previous,

      amount:
        request.approved_quote_amount !=
        null
          ? String(
              request.approved_quote_amount,
            )
          : previous.amount,

     currency: "USD",

      start_date:
        startDate,

      completion_date:
        completionDate,

      /*
       * IMPORTANT:
       *
       * Do not preload the previous administrator
       * reason into a new cycle.
       *
       * Every new administrator action gets a fresh reason.
       */
      reason: previous.reason,
    }))
  }, [
    hasTrainingDates,
    request.approved_quote_amount,
    request.approved_quote_currency,
    request.training_preferred_start_date,
    request.training_preferred_completion_date,
    request.osint_completion_date,
    request.preferred_deadline,
    request.approved_estimated_completion,
  ])

  /*
   * ==========================================================
   * FIELD UPDATE
   * ==========================================================
   */

  function updateForm<
    K extends keyof FormState
  >(
    field: K,
    value: FormState[K],
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  /*
   * ==========================================================
   * SUBMIT
   * ==========================================================
   */

  async function submit() {
    try {
      setLoading(true)
      setMessage("")

      /*
       * Protect against stale UI.
       *
       * The page may have been opened from history while
       * another workflow cycle is not currently active.
       */

      if (!adminCanAct) {
        throw new Error(
          "This request is not currently awaiting Administrator action.",
        )
      }

      /*
       * ------------------------------------------------------
       * AMOUNT
       * ------------------------------------------------------
       */

      const amount =
        Number(form.amount)

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        throw new Error(
          "Enter a valid administrator quote amount.",
        )
      }

      /*
       * ------------------------------------------------------
       * REASON
       * ------------------------------------------------------
       */

      const reason =
        form.reason.trim()

      if (!reason) {
        throw new Error(
          "A reason is required before submitting the quote.",
        )
      }

      /*
       * ------------------------------------------------------
       * COMPLETION DATE
       * ------------------------------------------------------
       */

      if (!form.completion_date) {
        throw new Error(
          "An estimated completion date is required.",
        )
      }

      if (
        !isValidDateValue(
          form.completion_date,
        )
      ) {
        throw new Error(
          "Estimated completion must be a valid date.",
        )
      }

      /*
       * ------------------------------------------------------
       * TRAINING START DATE
       * ------------------------------------------------------
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
       * ------------------------------------------------------
       * PAYLOAD
       * ------------------------------------------------------
       *
       * Keep the payload compatible with your current
       * Administrator PATCH route.
       */

const payload = {
  action: form.action,

  approved_quote_amount:
    amount,

  approved_quote_currency:
    "USD",

  admin_quote_notes:
    reason,

  reason,

  approved_estimated_start:
    hasTrainingDates
      ? form.start_date
      : undefined,

  approved_estimated_completion:
    form.completion_date,

  decision_source:
    form.action === "adjust"
      ? "adjusted"
      : "admin",
}

      /*
       * ------------------------------------------------------
       * API
       * ------------------------------------------------------
       */

      const response =
        await fetch(
          `/api/admin/requests/${request.id}`,
          {
            method: "PATCH",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
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
       * Return to active request list.
       *
       * The database now contains the newly created
       * history entry and the new workflow state.
       */

      router.push(
        "/dashboard/requests",
      )

      router.refresh()
    } catch (error) {
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
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="space-y-6">

      {/* ======================================================
          ERROR
      ====================================================== */}

      {message && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {message}
        </div>
      )}

      {/* ======================================================
          HEADER
      ====================================================== */}

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

      {/* ======================================================
          FULL CLIENT REQUEST
      ====================================================== */}

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
              Investigation Objective
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

      {/* ======================================================
          AI ASSESSMENT
      ====================================================== */}

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

      {/* ======================================================
          PREVIOUS ADMINISTRATOR SUBMISSION
      ====================================================== */}
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
  {adminQuote?.currency || "USD"}{" "}
  {adminQuote?.price != null
    ? Number(
        adminQuote.price,
      ).toLocaleString()
    : "Not specified"}
</p>

            </div>

            <div className="min-w-0">

              <p className="text-xs uppercase tracking-wider text-white/40">
                Estimated Completion
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

      {/* ======================================================
          CURRENT ADMINISTRATOR ACTION
      ====================================================== */}

   {adminCanAct && !isHistoryView && (
  <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">

          <div className="mb-6 border-b border-white/10 pb-5">

            <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              {normalizedStatus ===
              "pending_admin_review"
                ? "Administrator Submission"
                : "Negotiation Review"}

            </p>

            <h3 className="mt-2 text-lg font-semibold text-white">
              {normalizedStatus ===
              "pending_admin_review"
                ? "Submit Quote to Super Administrator"
                : "Respond to Current Negotiation"}

            </h3>

            <p className="mt-1 text-sm text-white/40">
              {normalizedStatus ===
              "pending_admin_review"
                ? "Prepare the Administrator quote for Super Administrator final review."
                : "Prepare the Administrator response for the current client negotiation cycle."}
            </p>

          </div>

          <div className="grid gap-5 md:grid-cols-2">

            {/* ==================================================
                QUOTE
            ================================================== */}

            <label className="text-sm text-white/60">

              <span className="mb-2 block">
                Proposed Quote
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                disabled={loading}
                value={form.amount}
                onChange={(event) =>
                  updateForm(
                    "amount",
                    event.target.value,
                  )
                }
                className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73] disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter proposed amount"
              />

            </label>

            {/* ==================================================
                CURRENCY
            ================================================== */}

            <label className="text-sm text-white/60">

              <span className="mb-2 block">
                Quote Currency
              </span>

              <input
                type="text"
                value={
                  form.currency ||
                  "USD"
                }
                disabled
                className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm font-semibold text-white"
              />

              <p className="mt-2 text-xs text-white/30">
                Administrator quotes are prepared in USD.
                The final quote is converted into the client's
                preferred currency by the final workflow stage.
              </p>

            </label>

            {/* ==================================================
                START DATE
            ================================================== */}

            {hasTrainingDates && (
              <label className="text-sm text-white/60">

                <span className="mb-2 block">
                  Training Start Date
                </span>

                <input
                  type="date"
                  disabled={loading}
                  value={form.start_date}
                  onChange={(event) =>
                    updateForm(
                      "start_date",
                      event.target.value,
                    )
                  }
                  className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73] disabled:cursor-not-allowed disabled:opacity-50"
                />

                <p className="mt-2 text-xs text-white/30">
                  Administrator estimated start date.
                  The client-requested training date is used
                  as the initial reference value.
                </p>

              </label>
            )}

            {/* ==================================================
                COMPLETION DATE
            ================================================== */}

            <label className="text-sm text-white/60">

              <span className="mb-2 block">
                Estimated Completion Date
              </span>

              <input
                type="date"
                disabled={loading}
                value={
                  form.completion_date
                }
                onChange={(event) =>
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
                  "Security assessment completion date."}

                {isInvestigation &&
                  "Investigation completion date."}

              </p>

            </label>

            {/* ==================================================
                WORKFLOW
            ================================================== */}

            <div className="md:col-span-2">

              <div className="rounded border border-[#143b28] bg-black/30 px-4 py-3">

                <p className="text-[10px] uppercase tracking-widest text-white/30">
                  Current Workflow Cycle
                </p>

                <p className="mt-1 text-sm text-white/70">

                  {normalizedStatus ===
                    "pending_admin_review" &&
                    "New client request — Administrator prepares the first quote."}

                  {normalizedStatus ===
                    "negotiation_requested" &&
                    "Negotiation cycle — Administrator reviews the client's requested quote change."}

                  {normalizedStatus ===
                    "negotiating" &&
                    "Active negotiation — Administrator response required."}

                  {normalizedStatus ===
                    "under_negotiation" &&
                    "Active negotiation — Administrator response required."}

                </p>

              </div>

            </div>

            {/* ==================================================
                ADMIN ACTION
            ================================================== */}

            <div className="md:col-span-2">

              <p className="mb-2 text-sm text-white/60">
                Quote Decision
              </p>

              <div className="grid gap-3 sm:grid-cols-2">

                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    updateForm(
                      "action",
                      "accept",
                    )
                  }
                  className={[
                    "rounded-md border px-4 py-3 text-left transition",
                    form.action === "accept"
                      ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                      : "border-[#143b28] bg-black text-white/60 hover:border-[#20dc73]/50",
                  ].join(" ")}
                >

                  <span className="block text-sm font-semibold">
                    Accept Current Recommendation
                  </span>

                  <span className="mt-1 block text-xs opacity-60">
                    Submit the current Administrator-reviewed quote
                    without marking it as an adjustment.
                  </span>

                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    updateForm(
                      "action",
                      "adjust",
                    )
                  }
                  className={[
                    "rounded-md border px-4 py-3 text-left transition",
                    form.action === "adjust"
                      ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                      : "border-[#143b28] bg-black text-white/60 hover:border-[#20dc73]/50",
                  ].join(" ")}
                >

                  <span className="block text-sm font-semibold">
                    Adjust Current Recommendation
                  </span>

                  <span className="mt-1 block text-xs opacity-60">
                    Submit a quote different from the current
                    recommendation.
                  </span>

                </button>

              </div>

            </div>

            {/* ==================================================
                REASON
            ================================================== */}

            <label className="text-sm text-white/60 md:col-span-2">

              <span className="mb-2 block">
                Administrator Reason
              </span>

              <textarea
                disabled={loading}
                value={form.reason}
                onChange={(event) =>
                  updateForm(
                    "reason",
                    event.target.value,
                  )
                }
                rows={6}
                placeholder={
                  form.action === "adjust"
                    ? "Explain the adjustment, pricing, complexity, scope, timeline, or risk considerations..."
                    : "Explain why the proposed quote and timeline are appropriate..."
                }
                className="w-full rounded border border-[#143b28] bg-black px-3 py-3 text-sm text-white outline-none focus:border-[#20dc73] disabled:cursor-not-allowed disabled:opacity-50"
              />

              <p className="mt-2 text-xs text-white/30">
                This submission creates a new workflow record.
                Previous Administrator submissions remain historical.
              </p>

            </label>

          </div>

          {/* ==================================================
              SUBMIT
          ================================================== */}

          <div className="mt-6 border-t border-white/10 pt-6">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-sm font-semibold text-white">
                  Ready for submission?
                </p>

                <p className="mt-1 text-xs text-white/40">
                  {normalizedStatus ===
                  "pending_admin_review"
                    ? "The quote will move this request to Super Administrator final review."
                    : "The current negotiation response will be recorded as a new Administrator action and sent to Super Administrator review."}
                </p>

              </div>

              <button
                type="button"
                disabled={
                  loading ||
                  !adminCanAct
                }
                onClick={() =>
                  void submit()
                }
                className={[
                  "rounded-md px-6 py-3 font-semibold transition",
                  loading ||
                  !adminCanAct
                    ? "cursor-not-allowed bg-white/10 text-white/30"
                    : "bg-[#20dc73] text-black hover:bg-[#32ef82]",
                ].join(" ")}
              >
                {loading
                  ? "Submitting..."
                  : normalizedStatus ===
                    "pending_admin_review"
                  ? "Submit to Super Administrator"
                  : "Submit Negotiation Response"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          NO ACTION STATE
      ====================================================== */}

     {!adminCanAct && !isHistoryView && (
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