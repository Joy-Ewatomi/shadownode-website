"use client"

import { RefreshCcw, Search } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import InvestigationForm from "@/components/client/InvestigationForm"
import type { InvestigationFormData } from "@/components/client/InvestigationForm"
import QuoteCard from "@/components/quote/QuoteCard"
import RequestSubmitted from "@/components/client/RequestSubmitted"

type ClientRequest = {
  id: string
  case_number: string | null
  title: string | null
  category: string | null
  service_type: string | null
  description: string | null
  urgency: string | null
  preferred_deadline: string | null
  status: string
  quote_notes?: string | null
  ai_price_estimate?: string | null
  ai_reasoning?: string | null
  approved_quote_amount?: string | null
  approved_quote_currency?: string | null
  approved_quote_notes?: string | null
  approved_estimated_completion?: string | null
  created_at: string
  investigation_objective?: string | null
  investigation_depth?: string | null
  confidentiality_level?: string | null
  communication_channel?: string | null
}

export default function ClientRequestsPage() {
  const [requests, setRequests] = useState<ClientRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submittedRef, setSubmittedRef] = useState<string | null>(null)

  async function load() {
    const res = await fetch("/api/client/requests", { credentials: "include" })
    if (res.ok) setRequests(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSubmit(data: InvestigationFormData) {
    setSubmitting(true)
    const res = await fetch("/api/client/requests", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    setSubmitting(false)
    if (res.ok) {
      const created = await res.json()
      setSubmittedRef(created.case_number || created.id)
      await load()
    } else {
      const err = await res.json()
      alert(err.error || "Failed to submit request")
    }
  }

  async function decide(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/client/requests/${id}/decision`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) await load()
  }

  // Show success screen after submission
  if (submittedRef) {
    return (
      <main className="space-y-6">
        <header className="border-b border-[#143b28] pb-6">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">Client Requests</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Investigation Request Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/55">Submit new investigation requests and track bureau review, quote, and activation status.</p>
        </header>
        <RequestSubmitted referenceId={submittedRef} />
      </main>
    )
  }

  return (
    <main className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">Client Requests</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Investigation Request Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/55">Submit new investigation requests and track bureau review, quote, and activation status.</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_28rem]">
        {/* Main: Request list or empty state */}
        <section className="rounded-md border border-[#143b28] bg-[#06110f]">
          <div className="flex items-center justify-between border-b border-[#143b28] px-5 py-4">
            <h2 className="font-semibold text-white">Requests</h2>
            <button onClick={load} className="inline-flex items-center gap-2 rounded border border-[#20dc73]/40 px-3 py-2 text-sm text-[#20dc73]"><RefreshCcw className="h-4 w-4" />Refresh</button>
          </div>
          <div className="divide-y divide-[#143b28]">
            {loading ? <p className="p-5 text-sm text-white/45">Loading requests...</p> : null}
            {!loading && !requests.length ? (
              <div className="flex flex-col items-center px-5 py-12 text-center">
                <Search className="mb-4 h-12 w-12 text-white/20" />
                <p className="text-lg font-semibold text-white/70">No active investigations yet</p>
                <p className="mt-2 max-w-md text-sm text-white/45">
                  Start an investigation request and ShadowNode analysts will review your requirements.
                </p>
                <Link
                  href="#new-request"
                  onClick={() => document.getElementById("new-request")?.scrollIntoView({ behavior: "smooth" })}
                  className="mt-6 inline-flex h-10 items-center gap-2 rounded bg-[#20dc73] px-5 text-sm font-bold text-black hover:bg-[#20dc73]/80"
                >
                  Start Investigation
                </Link>
              </div>
            ) : null}
            {requests.map((request) => (
              <QuoteCard
                key={request.id}
                request={request}
                onAccept={() => decide(request.id, { action: "accept" })}
                onReview={(payload) => decide(request.id, { action: "review", ...payload })}
                onDecline={() => decide(request.id, { action: "decline" })}
              />
            ))}
          </div>
        </section>

        {/* Sidebar: New investigation form */}
        <aside id="new-request">
          <InvestigationForm onSubmit={handleSubmit} submitting={submitting} />
        </aside>
      </section>
    </main>
  )
}
