"use client"

import { useState } from "react"
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

export default function AdminRequestReviewCard({
  request,
}: {
  request: RequestData
}) {
  const router = useRouter()

  const alreadySubmitted =
    Boolean(request.admin_reviewed_at) ||
    Boolean(request.admin_reviewed_by) ||
    Boolean(request.admin_quote_action)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

const [form, setForm] = useState({
  amount:
    request.approved_quote_amount?.toString() ?? "",

  // Administrator works in USD.
  currency:
    request.approved_quote_currency ?? "USD",

  // Autofill from the client's submitted dates.
  start_date:
    request.training_preferred_start_date ?? "",

  completion_date:
    request.training_preferred_completion_date ??
    request.approved_estimated_completion ??
    "",

  notes:
    request.admin_quote_notes ?? "",
})

  async function submit() {
    try {
      setLoading(true)
      setMessage("")

 const payload = {
  action: "submit_for_super_admin_review",

  approved_quote_amount: form.amount,

  approved_quote_currency: form.currency,

  approved_estimated_start:
    request.service_type === "security_assessment"
      ? form.start_date
      : null,

  approved_estimated_completion:
    form.completion_date,

  admin_quote_notes: form.notes,
}

      const res = await fetch(
  `/api/admin/requests/${request.id}`,
  {
    method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Administrator submission failed",
        )
      }

      router.push("/dashboard/requests")
      router.refresh()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* =====================================================
          ERROR / STATUS
      ===================================================== */}

      {message && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {message}
        </div>
      )}

      {/* =====================================================
          REQUEST HEADER
      ===================================================== */}

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

      {/* =====================================================
          FULL CLIENT REQUEST
      ===================================================== */}

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

          {/* CLIENT */}

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

          {/* SERVICE */}

          <div>
            <p className="text-xs uppercase tracking-wider text-white/40">
              Service Type
            </p>

          <p className="mt-1 min-w-0 max-w-full break-words text-sm text-white">
  {request.service_type || "Not specified"}
</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-white/40">
              Category
            </p>

           <p className="mt-1 min-w-0 max-w-full break-words text-sm text-white">
  {request.category || "Not specified"}
</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-white/40">
              Priority
            </p>

           <p className="mt-1 min-w-0 max-w-full break-words text-sm text-white">
  {request.priority || "Not specified"}
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

          {/* OBJECTIVE */}

          <div className="min-w-0 md:col-span-2">

            <p className="text-xs uppercase tracking-wider text-white/40">
              Investigation Objective
            </p>

            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/80">
              {request.investigation_objective ||
                "No objective provided."}
            </p>

          </div>

          {/* DESCRIPTION */}

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

      {/* =====================================================
          AI ASSESSMENT
      ===================================================== */}

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

          {/* AI STATUS */}

          <div>
            <p className="text-xs uppercase tracking-wider text-white/40">
              AI Status
            </p>

            <p className="mt-1 text-sm text-white">
              {request.ai_status ||
                "Pending"}
            </p>
          </div>

          {/* AI ESTIMATE */}

          <div>
            <p className="text-xs uppercase tracking-wider text-white/40">
              AI Estimate
            </p>

            <p className="mt-1 text-lg font-semibold text-white">
              {request.ai_price_estimate != null
                ? request.ai_price_estimate.toLocaleString()
                : "Pending"}{" "}
              USD
            </p>
          </div>

          {/* COMPLEXITY */}

          <div>
            <p className="text-xs uppercase tracking-wider text-white/40">
              Complexity
            </p>

            <p className="mt-1 text-sm text-white">
              {request.ai_complexity ||
                "Pending"}
            </p>
          </div>

          {/* HOURS */}

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

          {/* CONFIDENCE */}

          <div>
            <p className="text-xs uppercase tracking-wider text-white/40">
              Confidence
            </p>

            <p className="mt-1 text-sm font-semibold text-[#20dc73]">
              {request.ai_confidence != null
                ? `${(
                    request.ai_confidence * 100
                  ).toFixed(0)}%`
                : "Pending"}
            </p>
          </div>

          {/* SUGGESTED PRIORITY */}

          <div>
            <p className="text-xs uppercase tracking-wider text-white/40">
              Suggested Priority
            </p>

            <p className="mt-1 text-sm text-white">
              {request.ai_suggested_priority ||
                "Pending"}
            </p>
          </div>

          {/* SUGGESTED SERVICE */}

          <div className="md:col-span-3">

            <p className="text-xs uppercase tracking-wider text-white/40">
              Suggested Service
            </p>

            <p className="mt-1 text-sm text-white">
              {request.ai_suggested_service ||
                "Pending"}
            </p>

          </div>

          {/* AI REASONING */}

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

          {/* AI ANALYSIS */}

          <div className="min-w-0 md:col-span-3">

            <p className="text-xs uppercase tracking-wider text-white/40">
              AI Analysis
            </p>
<div className="mt-2 w-full min-w-0 max-w-full overflow-hidden rounded-md border border-[#143b28] bg-black/40 p-4">
  <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-white/60">
    {request.ai_analysis || "No AI analysis available."}
  </pre>
</div>

          </div>

        </div>
      </div>

      {/* =====================================================
          PREVIOUS ADMINISTRATOR SUBMISSION
      ===================================================== */}

      {alreadySubmitted && (
        <div className="rounded-md border border-[#20dc73]/20 bg-[#20dc73]/[0.03] p-5">

          <div className="mb-5 border-b border-white/10 pb-5">

            <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              Administrator Record
            </p>

            <h3 className="mt-2 text-lg font-semibold text-white">
              Your Previous Submission
            </h3>

            <p className="mt-1 text-sm text-white/40">
              This request has already been submitted to the Super Administrator.
            </p>

          </div>

          <div className="grid gap-5 md:grid-cols-3">

            <div>
              <p className="text-xs uppercase tracking-wider text-white/40">
                Submitted Quote
              </p>

              <p className="mt-1 text-lg font-semibold text-white">
                {request.approved_quote_currency ||
                  "USD"}{" "}
                {request.approved_quote_amount != null
                  ? Number(
                      request.approved_quote_amount,
                    ).toLocaleString()
                  : "Not specified"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-white/40">
                Estimated Completion
              </p>

              <p className="mt-1 text-sm text-white">
                {request.approved_estimated_completion ||
                  "Not specified"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-white/40">
                Submission Status
              </p>

              <p className="mt-1 text-sm font-semibold uppercase text-[#20dc73]">
                Submitted
              </p>
            </div>

            <div className="md:col-span-3">

              <p className="text-xs uppercase tracking-wider text-white/40">
                Your Notes
              </p>

              <div className="mt-2 rounded-md border border-[#143b28] bg-black/40 p-4">

                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/70">
                  {request.admin_quote_notes ||
                    "No administrator notes provided."}
                </p>

              </div>

            </div>

            {request.admin_reviewed_at && (
              <div className="md:col-span-3">

                <p className="text-xs uppercase tracking-wider text-white/40">
                  Submitted At
                </p>

                <p className="mt-1 text-sm text-white/60">
                  {new Date(
                    request.admin_reviewed_at,
                  ).toLocaleString()}
                </p>

              </div>
            )}

          </div>
        </div>
      )}

      {/* =====================================================
          ADMINISTRATOR SUBMISSION FORM
      ===================================================== */}

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

          {/* QUOTE AMOUNT */}

          <label className="text-sm text-white/60">

            <span className="mb-2 block">
              Proposed Quote
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              disabled={alreadySubmitted || loading}
              value={form.amount}
              onChange={(event) =>
                setForm({
                  ...form,
                  amount:
                    event.target.value,
                })
              }
              className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73] disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Enter proposed amount"
            />

          </label>

          {/* CURRENCY */}

      <label className="text-sm text-white/60">
  <span className="mb-2 block">
    Quote Currency
  </span>

  <input
    type="text"
    value="USD"
    disabled
    className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm font-semibold text-white/70 outline-none disabled:cursor-not-allowed"
  />

  <p className="mt-2 text-xs text-white/30">
    Administrator quotes are prepared in USD. The final quote
    will be converted to the client's preferred currency before
    it is presented for payment.
  </p>
</label>
{/* =====================================================
    TRAINING START DATE
===================================================== */}

<label className="text-sm text-white/60">
  <span className="mb-2 block">
    Training Start Date
  </span>

  <input
    type="date"
    disabled={alreadySubmitted || loading}
    value={form.start_date}
    onChange={(event) =>
      setForm({
        ...form,
        start_date: event.target.value,
      })
    }
    className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73] disabled:cursor-not-allowed disabled:opacity-50"
  />

  <p className="mt-2 text-xs text-white/30">
    Prefilled from the client's requested training start date.
    You may adjust it before submitting.
  </p>
</label>

{/* =====================================================
    COMPLETION DATE
===================================================== */}

<label className="text-sm text-white/60">
  <span className="mb-2 block">
    Training Completion Date
  </span>

  <input
    type="date"
    disabled={alreadySubmitted || loading}
    value={form.completion_date}
    onChange={(event) =>
      setForm({
        ...form,
        completion_date: event.target.value,
      })
    }
    className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73] disabled:cursor-not-allowed disabled:opacity-50"
  />

  <p className="mt-2 text-xs text-white/30">
    Prefilled from the client's requested completion date.
    You may adjust it before submitting.
  </p>
</label>

          {/* ADMIN NOTES */}

          <label className="text-sm text-white/60 md:col-span-2">

            <span className="mb-2 block">
              Administrator Notes
            </span>

            <textarea
              disabled={alreadySubmitted || loading}
              value={form.notes}
              onChange={(event) =>
                setForm({
                  ...form,
                  notes:
                    event.target.value,
                })
              }
              rows={6}
              placeholder="Provide your assessment, pricing rationale, timeline considerations, or other information for the Super Administrator..."
              className="w-full rounded border border-[#143b28] bg-black px-3 py-3 text-sm text-white outline-none focus:border-[#20dc73] disabled:cursor-not-allowed disabled:opacity-50"
            />

          </label>

        </div>

        {/* =====================================================
            SUBMIT
        ===================================================== */}

        <div className="mt-6 border-t border-white/10 pt-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              {alreadySubmitted ? (
                <>
                  <p className="text-sm font-semibold text-[#20dc73]">
                    Submission already sent
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    This request has already been forwarded to the Super Administrator.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-white">
                    Ready for submission?
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    Your submission will be forwarded to the Super Administrator for final review.
                  </p>
                </>
              )}

            </div>

            <button
              type="button"
              disabled={
                alreadySubmitted ||
                loading
              }
              onClick={() => void submit()}
              className={[
                "rounded-md px-6 py-3 font-semibold transition",
                alreadySubmitted ||
                loading
                  ? "cursor-not-allowed bg-white/10 text-white/30"
                  : "bg-[#20dc73] text-black hover:bg-[#32ef82]",
              ].join(" ")}
            >

              {alreadySubmitted
                ? "Submitted to Super Administrator"
                : loading
                ? "Submitting..."
                : "Submit to Super Administrator"}

            </button>

          </div>

        </div>

      </div>

    </div>
  )
}