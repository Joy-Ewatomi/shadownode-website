"use client"

import { CheckCircle2, RefreshCcw, Send, XCircle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import QuoteSummary from "@/components/quote/QuoteSummary"

type AdminRequest = {
  id: string
  case_number: string | null
  title: string | null
  category: string | null
  service_type: string | null
  description: string | null
  urgency: string | null
  preferred_deadline: string | null
  status: string
  quote_notes: string | null
  ai_price_estimate: string | null
  ai_complexity: string | null
  ai_estimated_hours: string | null
  ai_suggested_service: string | null
  ai_suggested_priority: string | null
  ai_confidence: string | null
  ai_reasoning: string | null
  approved_quote_amount: string | null
  approved_quote_currency: string | null
  approved_quote_notes: string | null
  approved_estimated_completion: string | null
  client_email: string | null
  account_email: string | null
  client_username: string | null
  converted_case_id: string | null
  created_at: string
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<AdminRequest[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [quote, setQuote] = useState({ approved_quote_amount: "", approved_quote_currency: "NGN", quote_notes: "", approved_estimated_completion: "" })
  const [loading, setLoading] = useState(true)

  const selected = useMemo(() => requests.find((request) => request.id === selectedId) || requests[0], [requests, selectedId])

  async function load() {
    const res = await fetch("/api/admin/requests", { credentials: "include" })
    if (res.ok) {
      const data = await res.json()
      setRequests(data)
      setSelectedId((current) => current || data[0]?.id || "")
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function update(action: string, body: Record<string, unknown>) {
    if (!selected) return
    const res = await fetch(`/api/admin/requests/${selected.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    })
    if (res.ok) await load()
  }

  return (
    <main className="min-h-screen bg-[#000604] p-6 text-white">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#143b28] pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">Admin Review</p>
          <h1 className="mt-2 text-3xl font-bold">Client Investigation Requests</h1>
        </div>
        <button onClick={load} className="inline-flex h-10 items-center gap-2 rounded border border-[#20dc73]/40 px-3 text-sm text-[#20dc73]"><RefreshCcw className="h-4 w-4" />Refresh</button>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="rounded-md border border-[#143b28] bg-[#06110f]">
          <div className="border-b border-[#143b28] px-5 py-4">
            <h2 className="font-semibold">Incoming Requests</h2>
          </div>
          <div className="divide-y divide-[#143b28]">
            {loading ? <p className="p-5 text-sm text-white/45">Loading requests...</p> : null}
            {!loading && !requests.length ? <p className="p-5 text-sm text-white/45">No incoming requests.</p> : null}
            {requests.map((request) => (
              <button key={request.id} onClick={() => setSelectedId(request.id)} className={`block w-full px-5 py-4 text-left hover:bg-white/5 ${selected?.id === request.id ? "bg-[#20dc73]/10" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{request.title || `${request.service_type} request`}</p>
                    <p className="mt-1 text-xs text-white/40">{request.case_number} · {request.account_email || request.client_email || "unknown client"}</p>
                  </div>
                  <span className="rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-[#20dc73]">{request.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <aside className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
          {selected ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">{selected.title || "Selected request"}</h2>
                <p className="mt-2 text-sm text-white/60">{selected.description}</p>
                <p className="mt-3 text-xs text-white/40">Urgency: {selected.urgency || "normal"} · Deadline: {selected.preferred_deadline || "not set"}</p>
              </div>

              <QuoteSummary
                aiEstimate={selected.ai_price_estimate}
                aiReasoning={selected.ai_reasoning}
                quoteAmount={selected.approved_quote_amount}
                currency={selected.approved_quote_currency || "NGN"}
                notes={selected.approved_quote_notes || selected.quote_notes}
                estimatedCompletion={selected.approved_estimated_completion}
              />

              <div className="rounded-md border border-[#143b28] bg-black/30 p-4 text-sm text-white/60">
                <p className="font-semibold text-white">AI analysis</p>
                <p className="mt-2">Complexity: {selected.ai_complexity || "pending"} · Hours: {selected.ai_estimated_hours || "pending"}</p>
                <p className="mt-1">Service: {selected.ai_suggested_service || selected.service_type || "pending"} · Priority: {selected.ai_suggested_priority || selected.urgency || "normal"}</p>
                <p className="mt-1">Confidence: {selected.ai_confidence || "pending"}</p>
              </div>

              <div className="grid gap-2">
                <button onClick={() => update("approve", { status: "approved" })} className="inline-flex h-10 items-center justify-center gap-2 rounded border border-[#20dc73]/40 text-sm text-[#20dc73]"><CheckCircle2 className="h-4 w-4" />Approve</button>
                <button onClick={() => update("reject", { status: "rejected" })} className="inline-flex h-10 items-center justify-center gap-2 rounded border border-red-400/40 text-sm text-red-200"><XCircle className="h-4 w-4" />Reject</button>
              </div>

              <div className="space-y-3 border-t border-[#143b28] pt-5">
                <h3 className="font-semibold">Send Quote</h3>
                <input value={quote.approved_quote_amount} onChange={(event) => setQuote({ ...quote, approved_quote_amount: event.target.value })} placeholder="Amount" className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm outline-none" />
                <input value={quote.approved_quote_currency} onChange={(event) => setQuote({ ...quote, approved_quote_currency: event.target.value })} placeholder="Currency" className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm outline-none" />
                <input type="date" value={quote.approved_estimated_completion} onChange={(event) => setQuote({ ...quote, approved_estimated_completion: event.target.value })} className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm outline-none" />
                <textarea value={quote.quote_notes} onChange={(event) => setQuote({ ...quote, quote_notes: event.target.value })} placeholder="Quote notes" className="min-h-24 w-full rounded border border-[#143b28] bg-black px-3 py-2 text-sm outline-none" />
                <button onClick={() => update("send_quote", { ...quote, status: "quote_sent" })} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-[#20dc73] font-bold text-black"><Send className="h-4 w-4" />Send Quote</button>
              </div>
            </div>
          ) : <p className="text-sm text-white/45">Select a request for review.</p>}
        </aside>
      </section>
    </main>
  )
}
