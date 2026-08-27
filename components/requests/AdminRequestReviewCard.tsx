"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

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

/* ============================================================
   WORKFLOW RESOLUTION
   ============================================================ */

function resolveWorkflow(
  serviceType: string | null,
): RequestWorkflow {
  const service =
    (serviceType || "")
      .trim()
      .toLowerCase()

  /*
   * PROFESSIONAL TRAINING
   */
  if (
    service === "professional_training"
  ) {
    return "professional_training"
  }

  /*
   * CYBERSECURITY TRAINING
   *
   * custom_training is included because older requests
   * may already exist in the database using that value.
   */
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

  /*
   * SECURITY ASSESSMENT
   */
  if (
    service === "security_assessment" ||
    service.includes("penetration testing") ||
    service.includes("penetration test") ||
    service.includes("vulnerability assessment")
  ) {
    return "security_assessment"
  }

  /*
   * INVESTIGATION
   */
  if (
    service === "investigation" ||
    service.includes("osint") ||
    service.includes("open source intelligence") ||
    service.includes("digital investigation") ||
    service.includes("digital intelligence")
  ) {
    return "investigation"
  }

  /*
   * SAFETY FALLBACK
   */
  return "investigation"
}

/* ============================================================
   DATE HELPER
   ============================================================ */

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

  /*
   * Already a valid HTML date value.
   */
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  /*
   * Handle ISO timestamps such as:
   * 2026-08-25T00:00:00.000Z
   */
  const isoMatch =
    raw.match(
      /^(\d{4}-\d{2}-\d{2})/,
    )

  if (isoMatch) {
    return isoMatch[1]
  }

  /*
   * Last attempt for other valid date strings.
   */
  const date = new Date(raw)

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

/* ============================================================
   COMPONENT
   ============================================================ */

export default function AdminRequestReviewCard({
  request,
}: {
  request: RequestData
}) {
  const router = useRouter()

  /* ==========================================================
     WORKFLOW
     ========================================================== */

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

  /*
   * Both professional training and cybersecurity training
   * use a client-requested START DATE + COMPLETION DATE.
   */
  const hasTrainingDates =
    isProfessionalTraining ||
    isCyberSecurity

  /*
   * Investigation and security assessment only need
   * completion date.
   */
  const isCompletionOnly =
    isSecurityAssessment ||
    isInvestigation

  /* ==========================================================
     PREVIOUS SUBMISSION
     ========================================================== */

  const alreadySubmitted =
    request.status ===
      "pending_super_admin_review" ||
    request.status === "approved" ||
    request.status === "completed"

  /* ==========================================================
     STATE
     ========================================================== */

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

      reason:
        request.admin_quote_notes ||
        "",
    })

  /* ==========================================================
     SYNC DATES WHEN REQUEST CHANGES
     ========================================================== */

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
      start_date:
        startDate,
      completion_date:
        completionDate,
    }))
  }, [
    hasTrainingDates,
    request.training_preferred_start_date,
    request.training_preferred_completion_date,
    request.osint_completion_date,
    request.preferred_deadline,
    request.approved_estimated_completion,
  ])

  /* ==========================================================
     FIELD UPDATE
     ========================================================== */

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

  /* ==========================================================
     SUBMIT
     ========================================================== */

  async function submit() {
    try {
      setLoading(true)
      setMessage("")

      /* ------------------------------------------------------
         AMOUNT
         ------------------------------------------------------ */

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

      /* ------------------------------------------------------
         REASON
         ------------------------------------------------------ */

      if (!form.reason.trim()) {
        throw new Error(
          "A reason is required before submitting the quote.",
        )
      }

      /* ------------------------------------------------------
         COMPLETION DATE
         ------------------------------------------------------ */

      if (!form.completion_date) {
        throw new Error(
          "An estimated completion date is required.",
        )
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          form.completion_date,
        )
      ) {
        throw new Error(
          "Estimated completion must be a valid date.",
        )
      }

      /* ------------------------------------------------------
         TRAINING START DATE
         ------------------------------------------------------ */

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
        !/^\d{4}-\d{2}-\d{2}$/.test(
          form.start_date,
        )
      ) {
        throw new Error(
          "Training start date must be a valid date.",
        )
      }

      /* ------------------------------------------------------
         PAYLOAD
         ------------------------------------------------------ */

      const payload = {
        action:
          form.action === "accept"
            ? "submit"
            : "adjust",

        approved_quote_amount:
          amount,

        approved_quote_currency:
          form.currency,

        admin_quote_notes:
          form.reason.trim(),

        reason:
          form.reason.trim(),

        approved_estimated_completion:
          form.completion_date,
      }

      /* ------------------------------------------------------
         API
         ------------------------------------------------------ */

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

      /* ------------------------------------------------------
         SUCCESS
         ------------------------------------------------------ */

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

  /* ==========================================================
     RENDER
     ========================================================== */

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
          REQUEST HEADER
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
                      ? request.ai_confidence *
                        100
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

      {alreadySubmitted && (
        <div className="w-full min-w-0 overflow-hidden rounded-md border border-[#20dc73]/20 bg-[#20dc73]/[0.03] p-5">

          <div className="mb-5 min-w-0 border-b border-white/10 pb-5">

            <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              Administrator Record
            </p>

            <h3 className="mt-2 break-words text-lg font-semibold text-white">
              Previous Submission
            </h3>

            <p className="mt-1 break-words text-sm text-white/40">
              This request has already been submitted to the Super Administrator.
            </p>

          </div>

          <div className="grid min-w-0 max-w-full gap-5 md:grid-cols-3">

            <div className="min-w-0">

              <p className="text-xs uppercase tracking-wider text-white/40">
                Submitted Quote
              </p>

              <p className="mt-1 break-words text-lg font-semibold text-white">
                {request.approved_quote_currency ||
                  "USD"}{" "}
                {request.approved_quote_amount !=
                null
                  ? Number(
                      request.approved_quote_amount,
                    ).toLocaleString()
                  : "Not specified"}
              </p>

            </div>

            <div className="min-w-0">

              <p className="text-xs uppercase tracking-wider text-white/40">
                Estimated Completion
              </p>

              <p className="mt-1 break-words text-sm text-white">
                {request.approved_estimated_completion ||
                  "Not specified"}
              </p>

            </div>

            <div className="min-w-0">

              <p className="text-xs uppercase tracking-wider text-white/40">
                Submission Status
              </p>

              <p className="mt-1 break-words text-sm font-semibold uppercase text-[#20dc73]">
                Submitted
              </p>

            </div>

            <div className="min-w-0 md:col-span-3">

              <p className="text-xs uppercase tracking-wider text-white/40">
                Administrator Notes
              </p>

              <div className="mt-2 w-full overflow-hidden rounded-md border border-[#143b28] bg-black/40 p-4">

                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/70 [overflow-wrap:anywhere]">
                  {request.admin_quote_notes ||
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
          ADMINISTRATOR SUBMISSION
      ====================================================== */}

      {!alreadySubmitted && (
        <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">

          <div className="mb-6 border-b border-white/10 pb-5">

            <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              Administrator Submission
            </p>

            <h3 className="mt-2 text-lg font-semibold text-white">
              Submit Quote to Super Administrator
            </h3>

            <p className="mt-1 text-sm text-white/40">
              Prepare your quote based on the complete request and AI assessment.
              The Super Administrator will make the final decision.
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
  value="USD"
  disabled
  className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm font-semibold text-white"
/>

              <p className="mt-2 text-xs text-white/30">
                Administrator quotes are prepared in USD.
                The final quote will be converted to the
                client's preferred currency before payment.
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
    If a valid client-requested date exists,
    it is pre-filled for review.
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
                  Workflow
                </p>

                <p className="mt-1 text-sm text-white/70">

                  {workflow ===
                    "professional_training" &&
                    "Professional training workflow — Start Date + Completion Date"}

                  {workflow ===
                    "cybersecurity_training" &&
                    "Cybersecurity training workflow — Start Date + Completion Date"}

                  {workflow ===
                    "security_assessment" &&
                    "Security assessment workflow — Completion Date only"}

                  {workflow ===
                    "investigation" &&
                    "Investigation workflow — Completion Date only"}

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
                    form.action ===
                    "accept"
                      ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                      : "border-[#143b28] bg-black text-white/60 hover:border-[#20dc73]/50",
                  ].join(" ")}
                >

                  <span className="block text-sm font-semibold">
                    Accept AI Recommendation
                  </span>

                  <span className="mt-1 block text-xs opacity-60">
                    Submit the administrator-reviewed quote
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
                    form.action ===
                    "adjust"
                      ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                      : "border-[#143b28] bg-black text-white/60 hover:border-[#20dc73]/50",
                  ].join(" ")}
                >

                  <span className="block text-sm font-semibold">
                    Adjust AI Recommendation
                  </span>

                  <span className="mt-1 block text-xs opacity-60">
                    Submit a quote different from the AI
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
                  form.action ===
                  "adjust"
                    ? "Explain why you are adjusting the AI recommendation, including pricing, complexity, timeline, scope, or risk considerations..."
                    : "Explain why you are accepting the AI recommendation and why the proposed quote and timeline are appropriate..."
                }
                className="w-full rounded border border-[#143b28] bg-black px-3 py-3 text-sm text-white outline-none focus:border-[#20dc73] disabled:cursor-not-allowed disabled:opacity-50"
              />

              <p className="mt-2 text-xs text-white/30">
                A reason is required and will be recorded in
                the administrator quote version and audit log.
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
                  Your administrator quote will be sent to
                  the Super Administrator for final approval.
                  It will not be presented to the client yet.
                </p>

              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  void submit()
                }
                className={[
                  "rounded-md px-6 py-3 font-semibold transition",
                  loading
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

    </div>
  )
}