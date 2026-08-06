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


export default function SuperAdminRequestReviewCard({
  request,
  aiQuote,
  adminQuote,
}: {
  request: RequestData
  aiQuote: QuoteVersion | null
  adminQuote: QuoteVersion | null
}) {
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
  async function submit(action: "accept" | "adjust" | "reject") {
    try {
      setLoading(true)
      setMessage("")
      const payload = {
  action,
  amount: form.amount,
  currency: form.currency,
  notes: form.notes,
  reason: form.reason,
  estimated_completion: form.estimated_completion,
}

      const res = await fetch(`/api/admin/requests/${request.id}/super-admin-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Super administrator review failed")
      }

    router.push("/dashboard/requests")
router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-md border border-[#20dc73]/30 bg-[#20dc73]/10 px-4 py-3 text-sm text-[#20dc73]">{message}</div>
      ) : null}

      <div className="rounded-md border border-[#143b28] bg-[#06110f] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#20dc73]">Admin Quote Review</p>
        <h2 className="mt-3 text-2xl font-bold text-white">{request.title}</h2>
        <p className="mt-2 text-sm text-white/50">{request.case_number}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
          <h3 className="font-semibold text-white">Request Details</h3>
          <div className="mt-4 space-y-3 text-sm text-white/60">
            <p>Service Type: <span className="ml-2 text-white">{request.service_type || "Pending"}</span></p>
            <p>Investigation Objective: <span className="ml-2 text-white">{request.investigation_objective || "No objective provided yet."}</span></p>
            <p>Summary: <span className="ml-2 text-white">{request.description || "No summary provided yet."}</span></p>
          </div>
        </div>

        <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
          <h3 className="font-semibold text-white">Administrator Proposal</h3>
          <div className="mt-4 space-y-3 text-sm text-white/60">
          <p>
  Administrator Quote:
  <span className="ml-2 text-[#20dc73]">
    {adminQuote?.currency}{" "}
    {Number(adminQuote?.price || 0).toLocaleString()}
  </span>
</p>
<p>
  AI Original Estimate:
  <span className="ml-2 text-white">
    {aiQuote?.currency}{" "}
    {Number(aiQuote?.price || 0).toLocaleString()}
  </span>
</p>

<p>
  Timeline:
  <span className="ml-2 text-white">
    {adminQuote?.  estimated_completion ??
 request.approved_estimated_completion ??
 "Pending"}
  </span>
</p>

<p>
  Adjustment Reason:
  <span className="ml-2 text-white">
    {adminQuote?.reasoning || adminQuote?.notes || "None"}
  </span>
</p>
        </div>
      </div>
</div>
      <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
  <h3 className="font-semibold text-white">AI Analysis</h3>

  <div className="mt-4 space-y-2 text-sm text-white/60">
    <p>
      Complexity:
      <span className="ml-2 text-[#20dc73]">
        {request.ai_complexity || "Pending"}
      </span>
    </p>

    <p>
      Confidence:
      <span className="ml-2 text-[#20dc73]">
        {request.ai_confidence
          ? `${request.ai_confidence}%`
          : "Pending"}
      </span>
    </p>

    <p>
      AI Reasoning:
      <span className="ml-2 text-white">
        {aiQuote?.reasoning || request.ai_reasoning || "No reasoning provided yet."}
      </span>
    </p>
  </div>
</div>

      <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
        <h3 className="font-semibold text-white">Final Review</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-white/60">
            <span className="mb-2 block">Approved quote amount</span>
            <input
              type="number"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none"
            />
          </label>
          <label className="text-sm text-white/60">
            <span className="mb-2 block">Currency</span>
            <select
              value={form.currency}
              onChange={(event) => setForm({ ...form, currency: event.target.value })}
              className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none"
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
  <option key={currency} value={currency}>
    {currency}
  </option>
))}
            </select>
          </label>
          <label className="text-sm text-white/60 md:col-span-2">
            <span className="mb-2 block">Estimated completion</span>
            <input
              type="date"
              value={form.estimated_completion}
              onChange={(event) => setForm({ ...form, estimated_completion: event.target.value })}
              className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none"
            />
          </label>
          <label className="text-sm text-white/60 md:col-span-2">
            <span className="mb-2 block">Reason / note</span>
            <textarea
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
              className="min-h-24 w-full rounded border border-[#143b28] bg-black px-3 py-2 text-sm text-white outline-none"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => void submit("accept")} disabled={loading} className="rounded-md bg-[#20dc73] px-5 py-3 font-semibold text-black disabled:opacity-50">
            {loading ? "Processing..." : "Approve quote"}
          </button>
          <button onClick={() => void submit("adjust")} disabled={loading} className="rounded-md border border-[#20dc73]/40 px-5 py-3 text-[#20dc73] disabled:opacity-50">
            {loading ? "Processing..." : "Adjust quote"}
          </button>
          <button onClick={() => void submit("reject")} disabled={loading} className="rounded-md border border-red-500/40 px-5 py-3 text-red-300 disabled:opacity-50">
            {loading ? "Processing..." : "Reject quote"}
          </button>
        </div>
      </div>
    </div>
  )
}
