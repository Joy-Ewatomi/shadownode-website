"use client"

import { FilePlus2, RefreshCcw } from "lucide-react"
import { useEffect, useState } from "react"

type ClientRequest = {
  id: string
  case_number: string | null
  title: string | null
  category: string | null
  description: string | null
  urgency: string | null
  preferred_deadline: string | null
  status: string
  quote_amount: string | null
  quote_currency: string | null
  created_at: string
}

const statuses = ["pending_review", "reviewing", "approved", "quote_sent", "payment_pending", "active", "rejected"]

export default function ClientRequestsPage() {
  const [requests, setRequests] = useState<ClientRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: "", category: "osint", description: "", urgency: "normal", preferred_deadline: "" })

  async function load() {
    const res = await fetch("/api/client/requests", { credentials: "include" })
    if (res.ok) setRequests(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function submit() {
    if (!form.title.trim() || !form.description.trim()) return
    const res = await fetch("/api/client/requests", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setForm({ title: "", category: "osint", description: "", urgency: "normal", preferred_deadline: "" })
      await load()
    }
  }

  return (
    <main className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">Client Requests</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Investigation Request Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/55">Submit new investigation requests and track bureau review, quote, payment, and activation status.</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[24rem_1fr]">
        <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
          <h2 className="flex items-center gap-2 font-semibold text-white"><FilePlus2 className="h-4 w-4 text-[#20dc73]" />Submit Request</h2>
          <div className="mt-4 space-y-3">
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Request title" className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none" />
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none">
              <option value="osint">OSINT Investigation</option>
              <option value="forensics">Digital Forensics</option>
              <option value="ethical-hacking">Ethical Hacking</option>
              <option value="threat-intelligence">Threat Intelligence</option>
            </select>
            <select value={form.urgency} onChange={(event) => setForm({ ...form, urgency: event.target.value })} className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <input type="date" value={form.preferred_deadline} onChange={(event) => setForm({ ...form, preferred_deadline: event.target.value })} className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none" />
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe the issue, objective, known facts, and desired outcome..." className="min-h-36 w-full rounded border border-[#143b28] bg-black px-3 py-2 text-sm text-white outline-none" />
            <button onClick={submit} className="h-10 w-full rounded bg-[#20dc73] font-bold text-black">Submit Request</button>
          </div>
        </div>

        <section className="rounded-md border border-[#143b28] bg-[#06110f]">
          <div className="flex items-center justify-between border-b border-[#143b28] px-5 py-4">
            <h2 className="font-semibold text-white">Previous Requests</h2>
            <button onClick={load} className="inline-flex items-center gap-2 rounded border border-[#20dc73]/40 px-3 py-2 text-sm text-[#20dc73]"><RefreshCcw className="h-4 w-4" />Refresh</button>
          </div>
          <div className="divide-y divide-[#143b28]">
            {loading ? <p className="p-5 text-sm text-white/45">Loading requests...</p> : null}
            {!loading && !requests.length ? <p className="p-5 text-sm text-white/45">No requests submitted yet.</p> : null}
            {requests.map((request) => (
              <article key={request.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{request.title}</p>
                    <p className="mt-1 text-xs text-white/40">{request.case_number} · {request.category} · {new Date(request.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-1 text-xs text-[#20dc73]">{statuses.includes(request.status) ? request.status : "pending_review"}</span>
                </div>
                <p className="mt-3 text-sm text-white/60">{request.description}</p>
                {request.quote_amount ? <p className="mt-2 text-sm text-[#20dc73]">Quote: {request.quote_currency || "NGN"} {request.quote_amount}</p> : null}
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
