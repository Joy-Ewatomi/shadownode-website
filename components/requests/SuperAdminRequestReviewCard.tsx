"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type RequestData = {
  id: string
  case_number: string | null
  title: string | null
  service_type: string | null
  description: string | null
  investigation_objective: string | null
  status: string

  ai_price_estimate: number | null
  ai_complexity: string | null
  ai_confidence: number | null
  ai_reasoning: string | null
  ai_analysis: string | null

  client_email: string | null

  approved_quote_amount: number | null
  approved_quote_currency: string | null
  approved_quote_notes: string | null
  approved_estimated_completion: string | null

  admin_quote_action: string | null
  admin_quote_notes: string | null
  admin_reviewed_by: string | null
  admin_reviewed_at: string | null

  super_admin_quote_action: string | null
  super_admin_quote_notes: string | null
  super_admin_reviewed_by: string | null
  super_admin_reviewed_at: string | null
}


type QuoteVersion = {
  id: string
  request_id: string
  version_number: number
  created_by: string | null
  creator_role: string | null
  source: string
  price: number | null
  currency: string | null
  estimated_completion: string | null
  notes: string | null
  reasoning: string | null
  status: string | null
  created_at: string | null
}

type AuditEvent = {
  id: string
  actor_user_id: string | null
  action: string
  details: unknown
  created_at: string | null
}

type NegotiationHistory = {
  id: string
  request_id: string
  client_id: string | null
  assigned_reviewer_id: string | null
  round_number: number | null
  status: string | null

  original_ai_estimate: number | null
  original_quote_amount: number | null
  quote_currency: string | null

  requested_budget: number | null
  client_reason: string | null
  client_notes: string | null

  administrator_recommendation: string | null
  revised_quote_amount: number | null

  owner_approver_id: string | null
  owner_decision: string | null
  owner_decision_notes: string | null

  decided_at: string | null
  created_at: string | null
  updated_at: string | null
}



export default function SuperAdminRequestReviewCard({
  request,
  aiQuote,
  adminQuote,
  quoteHistory = [],
  auditHistory = [],
  negotiationHistory = [],
}: {
  request: RequestData
  aiQuote: QuoteVersion | null
  adminQuote: QuoteVersion | null
  quoteHistory?: QuoteVersion[]
  auditHistory?: AuditEvent[]
  negotiationHistory?: NegotiationHistory[]
}) {

 const finalDecisionMade =
  Boolean(request.super_admin_reviewed_at) ||
  Boolean(request.super_admin_reviewed_by) ||
  [
    "approve",
    "approved",
    "accept",
    "accepted",
    "adjust",
    "adjusted",
    "reject",
    "rejected",
  ].includes(
    request.super_admin_quote_action?.toLowerCase() || ""
  )
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const [form, setForm] = useState({
    amount:
      adminQuote?.price?.toString() ??
      request.approved_quote_amount?.toString() ??
      "",

    currency:
      adminQuote?.currency ??
      request.approved_quote_currency ??
      "USD",

    notes:
      adminQuote?.notes ??
      request.super_admin_quote_notes ??
      request.admin_quote_notes ??
      "",

    reason:
      adminQuote?.reasoning ??
      adminQuote?.notes ??
      request.super_admin_quote_notes ??
      request.admin_quote_notes ??
      "",

    estimated_completion:
      adminQuote?.estimated_completion ??
      request.approved_estimated_completion ??
      "",
  })

  async function submit(
    action: "accept" | "adjust" | "reject",
  ) {
    try {
      setLoading(true)
      setMessage("")

      const payload = {
        action,
        amount: form.amount,
        currency: form.currency,
        notes: form.notes,
        reason: form.reason,
        estimated_completion:
          form.estimated_completion,
      }

      const res = await fetch(
        `/api/admin/requests/${request.id}/super-admin-review`,
        {
          method: "POST",
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
            "Super administrator review failed",
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
          ERROR / STATUS MESSAGE
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

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              Super Administrator Review
            </p>

            <h2 className="mt-3 text-2xl font-bold text-white">
              {request.title ||
                "Untitled request"}
            </h2>

            <p className="mt-2 text-sm text-white/50">
              {request.case_number ||
                "No case number assigned"}
            </p>
          </div>

          <div className="rounded border border-[#143b28] bg-black px-4 py-2">
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              Status
            </p>

            <p className="mt-1 text-sm font-semibold uppercase text-[#20dc73]">
              {request.status}
            </p>
          </div>

        </div>
      </div>

      {/* =====================================================
          FULL REQUEST DETAILS
      ===================================================== */}

      <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">

        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
            Request Information
          </p>

          <h3 className="mt-2 text-lg font-semibold text-white">
            Full Client Request
          </h3>
        </div>

        <div className="grid gap-5 md:grid-cols-2">

          <div>
            <p className="text-xs uppercase tracking-wider text-white/40">
              Client
            </p>

            <p className="mt-1 text-sm text-white">
              {request.client_email ||
                "Not available"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-white/40">
              Service Type
            </p>

            <p className="mt-1 text-sm text-white">
              {request.service_type ||
                "Not specified"}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-wider text-white/40">
              Investigation Objective
            </p>

            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/80">
              {request.investigation_objective ||
                "No objective provided."}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-wider text-white/40">
              Client Description
            </p>

            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/80">
              {request.description ||
                "No description provided."}
            </p>
          </div>

        </div>
      </div>
{/* =====================================================
    AI ANALYSIS
===================================================== */}

<div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
  <div className="mb-5">
    <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
      Intelligence Assessment
    </p>

    <h3 className="mt-2 text-lg font-semibold text-white">
      AI Analysis
    </h3>
  </div>

  <div className="grid gap-5 md:grid-cols-3">

    {/* AI ESTIMATE */}
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wider text-white/40">
        AI Estimate
      </p>

      <p className="mt-1 break-words text-lg font-semibold text-white">
        {request.ai_price_estimate != null
          ? request.ai_price_estimate.toLocaleString()
          : "Pending"}
      </p>
    </div>

    {/* COMPLEXITY */}
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wider text-white/40">
        Complexity
      </p>

      <p className="mt-1 break-words text-sm text-white">
        {request.ai_complexity || "Pending"}
      </p>
    </div>

    {/* CONFIDENCE */}
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wider text-white/40">
        Confidence
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-[#20dc73]">
        {request.ai_confidence != null
  ? `${(request.ai_confidence * 100).toFixed(0)}%`
  : "Pending"}
      </p>
    </div>

    {/* AI REASONING */}
    <div className="min-w-0 md:col-span-3">
      <p className="text-xs uppercase tracking-wider text-white/40">
        AI Reasoning
      </p>

      <div className="mt-2 w-full min-w-0 overflow-hidden rounded-md border border-[#143b28] bg-black/40 p-4">
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/70">
          {request.ai_reasoning || "No AI reasoning available."}
        </p>
      </div>
    </div>

    {/* AI ANALYSIS */}
    {request.ai_analysis && (
      <div className="min-w-0 md:col-span-3">
        <p className="text-xs uppercase tracking-wider text-white/40">
          AI Analysis
        </p>

        <div className="mt-2 w-full min-w-0 overflow-hidden rounded-md border border-[#143b28] bg-black/40 p-4">
          <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-white/60">
            {request.ai_analysis}
          </pre>
        </div>
      </div>
    )}

  </div>
</div>

      {/* =====================================================
          ADMINISTRATOR PROPOSAL
      ===================================================== */}

      <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">

        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
            Administrator Submission
          </p>

          <h3 className="mt-2 text-lg font-semibold text-white">
            Administrator Proposal
          </h3>
        </div>

        <div className="grid gap-5 md:grid-cols-3">

          <div>
            <p className="text-xs uppercase tracking-wider text-white/40">
              Proposed Amount
            </p>

            <p className="mt-1 text-lg font-semibold text-white">
              {adminQuote?.currency ||
                request.approved_quote_currency ||
                "USD"}{" "}

              {Number(
                adminQuote?.price ??
                  request.approved_quote_amount ??
                  0,
              ).toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-white/40">
              Quote Version
            </p>

            <p className="mt-1 text-sm text-white">
              {adminQuote
                ? `Version ${adminQuote.version_number}`
                : "Not available"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-white/40">
              Status
            </p>

            <p className="mt-1 text-sm text-[#20dc73]">
              {adminQuote?.status ||
                request.admin_quote_action ||
                "Pending"}
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="text-xs uppercase tracking-wider text-white/40">
              Administrator Reasoning
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/70">
              {adminQuote?.reasoning ||
                request.admin_quote_notes ||
                "No administrator reasoning provided."}
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="text-xs uppercase tracking-wider text-white/40">
              Estimated Completion
            </p>

            <p className="mt-1 text-sm text-white">
              {adminQuote?.estimated_completion ||
                request.approved_estimated_completion ||
                "Not specified"}
            </p>
          </div>

        </div>
      </div>

      {/* =====================================================
          QUOTE VERSION HISTORY
      ===================================================== */}

      <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">

        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
            Governance Record
          </p>

          <h3 className="mt-2 text-lg font-semibold text-white">
            Complete Quote History
          </h3>

          <p className="mt-1 text-sm text-white/40">
            Visible to Super Administrators only.
          </p>
        </div>

        {quoteHistory.length === 0 ? (
          <p className="text-sm text-white/40">
            No quote versions recorded.
          </p>
        ) : (
          <div className="space-y-3">

            {quoteHistory.map((quote) => (
              <div
                key={quote.id}
                className="rounded-md border border-[#143b28] bg-black/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Version {quote.version_number}
                    </p>

                    <p className="mt-1 text-xs uppercase tracking-wider text-white/40">
                      {quote.source} •{" "}
                      {quote.creator_role ||
                        "unknown role"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-white">
                      {quote.currency ||
                        "USD"}{" "}
                      {Number(
                        quote.price || 0,
                      ).toLocaleString()}
                    </p>

                    <p className="mt-1 text-xs text-white/40">
                      {quote.status ||
                        "unknown"}
                    </p>
                  </div>

                </div>

                {quote.reasoning && (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wider text-white/40">
                      Reasoning
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-sm text-white/70">
                      {quote.reasoning}
                    </p>
                  </div>
                )}

                {quote.notes && (
                  <div className="mt-3">
                    <p className="text-xs uppercase tracking-wider text-white/40">
                      Notes
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-sm text-white/70">
                      {quote.notes}
                    </p>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/30">
                  {quote.estimated_completion && (
                    <span>
                      Completion:{" "}
                      {quote.estimated_completion}
                    </span>
                  )}

                  {quote.created_at && (
                    <span>
                      Created:{" "}
                      {new Date(
                        quote.created_at,
                      ).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}

          </div>
        )}
      </div>

      {/* =====================================================
          NEGOTIATION HISTORY
      ===================================================== */}

      <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">

        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
            Client Negotiation
          </p>

          <h3 className="mt-2 text-lg font-semibold text-white">
            Negotiation History
          </h3>
        </div>

        {negotiationHistory.length === 0 ? (
          <p className="text-sm text-white/40">
            No negotiation rounds recorded.
          </p>
        ) : (
          <div className="space-y-4">

            {negotiationHistory.map(
              (negotiation) => (
                <div
                  key={negotiation.id}
                  className="rounded-md border border-[#143b28] bg-black/40 p-4"
                >

                  <div className="flex flex-wrap justify-between gap-3">

                    <div>
                      <p className="font-semibold text-white">
                        Round{" "}
                        {negotiation.round_number ??
                          "—"}
                      </p>

                      <p className="mt-1 text-xs uppercase tracking-wider text-white/40">
                        {negotiation.status ||
                          "unknown"}
                      </p>
                    </div>

                    <div className="text-right text-sm text-white/70">
                      {negotiation.quote_currency ||
                        "USD"}{" "}

                      {Number(
                        negotiation.revised_quote_amount ??
                          negotiation.original_quote_amount ??
                          0,
                      ).toLocaleString()}
                    </div>

                  </div>

                  {negotiation.requested_budget !=
                    null && (
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-wider text-white/40">
                        Client Requested Budget
                      </p>

                      <p className="mt-1 text-sm text-white">
                        {negotiation.quote_currency ||
                          "USD"}{" "}

                        {Number(
                          negotiation.requested_budget,
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {negotiation.client_reason && (
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-wider text-white/40">
                        Client Reason
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm text-white/70">
                        {negotiation.client_reason}
                      </p>
                    </div>
                  )}

                  {negotiation.client_notes && (
                    <div className="mt-3">
                      <p className="text-xs uppercase tracking-wider text-white/40">
                        Client Notes
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm text-white/70">
                        {negotiation.client_notes}
                      </p>
                    </div>
                  )}

                  {negotiation.administrator_recommendation && (
                    <div className="mt-4 border-t border-[#143b28] pt-4">
                      <p className="text-xs uppercase tracking-wider text-white/40">
                        Administrator Recommendation
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm text-white/70">
                        {
                          negotiation.administrator_recommendation
                        }
                      </p>
                    </div>
                  )}

                  {negotiation.owner_decision && (
                    <div className="mt-4 border-t border-[#143b28] pt-4">
                      <p className="text-xs uppercase tracking-wider text-white/40">
                        Super Administrator Decision
                      </p>

                      <p className="mt-1 text-sm font-semibold uppercase text-[#20dc73]">
                        {negotiation.owner_decision}
                      </p>

                      {negotiation.owner_decision_notes && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">
                          {
                            negotiation.owner_decision_notes
                          }
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 text-xs text-white/30">
                    {negotiation.created_at
                      ? new Date(
                          negotiation.created_at,
                        ).toLocaleString()
                      : "Unknown date"}
                  </div>

                </div>
              ),
            )}

          </div>
        )}
      </div>

      {/* =====================================================
          AUDIT HISTORY
      ===================================================== */}

      <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">

        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
            Security & Audit
          </p>

          <h3 className="mt-2 text-lg font-semibold text-white">
            Request Audit History
          </h3>

          <p className="mt-1 text-sm text-white/40">
            Administrative actions recorded against this request.
          </p>
        </div>

        
       
          <div className="space-y-3">

            {auditHistory.map((event) => (
              <div
                key={event.id}
                className="rounded-md border border-[#143b28] bg-black/40 p-4"
              >

                <div className="flex flex-wrap justify-between gap-3">

                  <div>
                    <p className="text-sm font-semibold text-white">
                      {event.action}
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      Actor:{" "}
                      {event.actor_user_id ||
                        "System"}
                    </p>
                  </div>

                  <p className="text-xs text-white/30">
                    {event.created_at
                      ? new Date(
                          event.created_at,
                        ).toLocaleString()
                      : ""}
                  </p>

                </div>

                {event.details != null && (
                  <pre className="mt-3 overflow-x-auto rounded bg-black p-3 text-xs leading-5 text-white/50">
                    {typeof event.details ===
                    "string"
                      ? event.details
                      : JSON.stringify(
                          event.details,
                          null,
                          2,
                        )}
                  </pre>
                )}

              </div>
            ))}

          </div>
      </div>

      {/* =====================================================
          FINAL SUPER ADMINISTRATOR DECISION
      ===================================================== */}

      <div className="rounded-md border border-[#20dc73]/30 bg-[#06110f] p-5">

        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">
            Final Authority
          </p>

          <h3 className="mt-2 text-lg font-semibold text-white">
            Super Administrator Decision
          </h3>

          <p className="mt-1 text-sm text-white/40">
            This decision controls the final quote workflow.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">

          {/* AMOUNT */}

          <label className="text-sm text-white/60">
            <span className="mb-2 block">
              Approved Quote Amount
            </span>

            <input
              type="number"
              value={form.amount}
              onChange={(event) =>
                setForm({
                  ...form,
                  amount:
                    event.target.value,
                })
              }
              className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]"
            />
          </label>

          {/* CURRENCY */}

          <label className="text-sm text-white/60">
            <span className="mb-2 block">
              Currency
            </span>

            <select
              value={form.currency}
              onChange={(event) =>
                setForm({
                  ...form,
                  currency:
                    event.target.value,
                })
              }
              className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]"
            >
              {[
                "USD",
                "EUR",
                "GBP",
                "NGN",
                "CAD",
                "AUD",
                "JPY",
                "INR",
                "SGD",
                "CNY",
                "KES",
                "GHS",
              ].map((currency) => (
                <option
                  key={currency}
                  value={currency}
                >
                  {currency}
                </option>
              ))}
            </select>
          </label>

          {/* COMPLETION DATE */}

          <label className="text-sm text-white/60 md:col-span-2">
            <span className="mb-2 block">
              Estimated Completion
            </span>

            <input
              type="date"
              value={
                form.estimated_completion
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  estimated_completion:
                    event.target.value,
                })
              }
              className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]"
            />
          </label>

          {/* REASON */}

          <label className="text-sm text-white/60 md:col-span-2">
            <span className="mb-2 block">
              Decision Reason
            </span>

            <textarea
              value={form.reason}
              onChange={(event) =>
                setForm({
                  ...form,
                  reason:
                    event.target.value,
                })
              }
              rows={5}
              placeholder="Explain the decision..."
              className="w-full rounded border border-[#143b28] bg-black px-3 py-3 text-sm text-white outline-none focus:border-[#20dc73]"
            />
          </label>

          {/* NOTES */}

          <label className="text-sm text-white/60 md:col-span-2">
            <span className="mb-2 block">
              Internal Notes
            </span>

            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm({
                  ...form,
                  notes:
                    event.target.value,
                })
              }
              rows={4}
              placeholder="Additional internal review notes..."
              className="w-full rounded border border-[#143b28] bg-black px-3 py-3 text-sm text-white outline-none focus:border-[#20dc73]"
            />
          </label>

        </div>

{/* ACTIONS */}

<div className="mt-6 flex flex-wrap gap-3">

  <button
    type="button"
    disabled={finalDecisionMade || loading}
    onClick={() => void submit("accept")}
    className={`rounded-md px-5 py-3 font-semibold transition ${
      finalDecisionMade || loading
        ? "cursor-not-allowed bg-white/10 text-white/30"
        : "bg-[#20dc73] text-black hover:bg-[#32ef82]"
    }`}
  >
    {finalDecisionMade
      ? "Decision Made"
      : loading
      ? "Processing..."
      : "Approve Quote"}
  </button>


  <button
    type="button"
    disabled={finalDecisionMade || loading}
    onClick={() => void submit("adjust")}
    className={`rounded-md border px-5 py-3 font-semibold transition ${
      finalDecisionMade || loading
        ? "cursor-not-allowed border-white/10 text-white/30"
        : "border-[#20dc73]/40 text-[#20dc73] hover:bg-[#20dc73]/10"
    }`}
  >
    {finalDecisionMade
      ? "Decision Made"
      : loading
      ? "Processing..."
      : "Adjust Quote"}
  </button>


  <button
    type="button"
    disabled={finalDecisionMade || loading}
    onClick={() => void submit("reject")}
    className={`rounded-md border px-5 py-3 font-semibold transition ${
      finalDecisionMade || loading
        ? "cursor-not-allowed border-white/10 text-white/30"
        : "border-red-500/40 text-red-300 hover:bg-red-500/10"
    }`}
  >
    {finalDecisionMade
      ? "Decision Made"
      : loading
      ? "Processing..."
      : "Reject Quote"}
  </button>

</div>
      </div>
    </div>
  )
}