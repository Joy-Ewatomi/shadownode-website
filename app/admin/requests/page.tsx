"use client"

import { CheckCircle2, RefreshCcw, Send, XCircle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import QuoteSummary from "@/components/quote/QuoteSummary"

type AdminRequest = Record<string, any>

const DEPTH_LABELS: Record<string, string> = {
  basic: "Basic Review",
  standard: "Standard Investigation",
  deep: "Deep Investigation",
  comprehensive: "Comprehensive Intelligence Report",
}

const CONF_LABELS: Record<string, string> = {
  standard: "Standard",
  confidential: "Confidential",
  highly_confidential: "Highly Confidential",
}

function isTraining(s: AdminRequest) {
  return s.category === "cybersecurity" && (
    s.service_type === "Cybersecurity Training Programs" ||
    s.service_type === "Security Awareness Training" ||
    s.service_type === "Digital Safety Education"
  )
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<AdminRequest[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [quote, setQuote] = useState({ approved_quote_amount: "", approved_quote_currency: "NGN", quote_notes: "", approved_estimated_completion: "" })
  const [loading, setLoading] = useState(true)

  const selected = useMemo(() => requests.find((r) => r.id === selectedId) || requests[0], [requests, selectedId])

  async function load() {
    const res = await fetch("/api/admin/requests", { credentials: "include" })
    if (res.ok) {
      const data = await res.json()
      setRequests(data)
      setSelectedId((current) => current || data[0]?.id || "")
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function update(action: string, body: Record<string, unknown>) {
    if (!selected) return
    const res = await fetch(`/api/admin/requests/${selected.id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    })
    if (res.ok) await load()
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="rounded-md border border-[#143b28] bg-black/30 p-4 text-sm">
        <p className="mb-3 font-semibold text-white">{title}</p>
        {children}
      </div>
    )
  }

  function Field({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null
    return (
      <div>
        <p className="text-xs uppercase tracking-[0.1em] text-white/40">{label}</p>
        <p className="text-sm text-white/80">{value}</p>
      </div>
    )
  }

  function renderInvestigationFields() {
    if (!selected) return null
    const s = selected
    const items: { label: string; value: string }[] = []
    if (s.investigation_objective) items.push({ label: "Objective", value: s.investigation_objective })
    if (s.investigation_depth) items.push({ label: "Depth", value: DEPTH_LABELS[s.investigation_depth] || s.investigation_depth })
    if (s.confidentiality_level) items.push({ label: "Confidentiality", value: CONF_LABELS[s.confidentiality_level] || s.confidentiality_level })
    const training = isTraining(s)
    if (!training) {
      if (s.subject_type) items.push({ label: "Subject", value: s.subject_type.replace(/_/g, " ") })
      if (s.subject_full_name) items.push({ label: "Name", value: s.subject_full_name })
      if (s.subject_company_name) items.push({ label: "Company", value: s.subject_company_name })
      if (s.subject_domain) items.push({ label: "Domain", value: s.subject_domain })
    }
    if (items.length === 0 && !s.existing_information && !s.additional_notes) return null
    return (
      <Section title="Investigation Details">
        <div className="grid gap-2">{items.map((it) => <Field key={it.label} label={it.label} value={it.value} />)}
          {s.existing_information ? <Field label="Intelligence" value={s.existing_information} /> : null}
          {s.additional_notes ? <Field label="Notes" value={s.additional_notes} /> : null}
        </div>
      </Section>
    )
  }

  function renderCommunication() {
    if (!selected) return null
    const s = selected
    const items: { label: string; value: string }[] = []
    if (s.communication_method) items.push({ label: "Method", value: s.communication_method.replace(/_/g, " ") })
    if (s.communication_email) items.push({ label: "Email", value: s.communication_email })
    if (s.communication_phone) items.push({ label: "Phone", value: `${s.communication_country_code || ""} ${s.communication_phone}`.trim() })
    if (s.communication_whatsapp) items.push({ label: "WhatsApp", value: `${s.communication_country_code || ""} ${s.communication_whatsapp}`.trim() })
    if (s.communication_signal) items.push({ label: "Signal", value: `${s.communication_country_code || ""} ${s.communication_signal}`.trim() })
    if (s.client_country) items.push({ label: "Country", value: s.client_country })
    if (s.preferred_currency) items.push({ label: "Currency", value: s.preferred_currency })
    if (!items.length) return null
    return <Section title="Communication & Country">{items.map((it) => <Field key={it.label} label={it.label} value={it.value} />)}</Section>
  }

  function renderLinks() {
    if (!selected?.supporting_links) return null
    let links: { type: string; url: string }[] = []
    try { links = JSON.parse(selected.supporting_links) } catch { return null }
    if (!links.length) return null
    return (
      <Section title={`Supporting Links (${links.length})`}>
        <div className="space-y-1">
          {links.map((l, i) => (
            <div key={i} className="text-xs text-white/60">[{l.type}] {l.url}</div>
          ))}
        </div>
      </Section>
    )
  }

  function renderEvidence() {
    if (!selected?.evidence_uploads) return null
    let files: { name: string; size: number }[] = []
    try { files = JSON.parse(selected.evidence_uploads) } catch { return null }
    if (!files.length) return null
    return (
      <Section title={`Evidence Files (${files.length})`}>
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={i} className="text-xs text-white/60">{f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)</div>
          ))}
        </div>
      </Section>
    )
  }

  function renderExtraInfo() {
    if (!selected) return null
    const s = selected
    const fields: { label: string; value: string }[] = []
    if (s.subject_approximate_age) fields.push({ label: "Age", value: s.subject_approximate_age })
    if (s.subject_height) fields.push({ label: "Height", value: s.subject_height })
    if (s.subject_weight) fields.push({ label: "Weight", value: s.subject_weight })
    if (s.subject_hair_color) fields.push({ label: "Hair", value: s.subject_hair_color })
    if (s.subject_eye_color) fields.push({ label: "Eyes", value: s.subject_eye_color })
    if (s.subject_skin_tone) fields.push({ label: "Skin", value: s.subject_skin_tone })
    if (s.subject_distinguishing_marks) fields.push({ label: "Marks", value: s.subject_distinguishing_marks })
    if (s.subject_nationality) fields.push({ label: "Nationality", value: s.subject_nationality })
    if (s.subject_languages_spoken) fields.push({ label: "Languages", value: s.subject_languages_spoken })
    if (s.subject_last_known_address) fields.push({ label: "Last Address", value: s.subject_last_known_address })
    if (s.subject_last_known_occupation) fields.push({ label: "Occupation", value: s.subject_last_known_occupation })
    if (s.subject_additional_usernames) fields.push({ label: "Add. Usernames", value: s.subject_additional_usernames })
    if (s.subject_gaming_ids) fields.push({ label: "Gaming IDs", value: s.subject_gaming_ids })
    if (s.subject_cryptocurrency_wallets) fields.push({ label: "Crypto", value: s.subject_cryptocurrency_wallets })
    if (s.subject_domain_names) fields.push({ label: "Domains", value: s.subject_domain_names })
    if (s.subject_ip_addresses) fields.push({ label: "IPs", value: s.subject_ip_addresses })
    if (s.subject_vehicle_registration) fields.push({ label: "Vehicle", value: s.subject_vehicle_registration })
    if (!fields.length) return null
    return <Section title={`Additional Info (${fields.length} fields)`}>
      <div className="grid grid-cols-2 gap-2">{fields.map((f) => <Field key={f.label} label={f.label} value={f.value} />)}</div>
    </Section>
  }

  function renderTraining() {
    if (!selected || !isTraining(selected)) return null
    const s = selected
    const fields: { label: string; value: string }[] = []
    if (s.training_organization_name) fields.push({ label: "Org", value: s.training_organization_name })
    if (s.training_client_type) fields.push({ label: "Type", value: s.training_client_type })
    if (s.training_participant_count) fields.push({ label: "Participants", value: String(s.training_participant_count) })
    if (s.training_skill_level) fields.push({ label: "Level", value: s.training_skill_level })
    if (s.training_goal) fields.push({ label: "Goal", value: s.training_goal })
    if (s.training_topics) fields.push({ label: "Topics", value: s.training_topics })
    if (s.training_preferred_dates) fields.push({ label: "Dates", value: s.training_preferred_dates })
    if (s.training_additional_requirements) fields.push({ label: "Requirements", value: s.training_additional_requirements })
    return <Section title="Training Details">{fields.map((f) => <Field key={f.label} label={f.label} value={f.value} />)}</Section>
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
        {/* List */}
        <div className="rounded-md border border-[#143b28] bg-[#06110f]">
          <div className="border-b border-[#143b28] px-5 py-4"><h2 className="font-semibold">Incoming Requests</h2></div>
          <div className="divide-y divide-[#143b28]">
            {loading ? <p className="p-5 text-sm text-white/45">Loading requests...</p> : null}
            {!loading && !requests.length ? <p className="p-5 text-sm text-white/45">No incoming requests.</p> : null}
            {requests.map((req) => (
              <button key={req.id} onClick={() => setSelectedId(req.id)}
                className={`block w-full px-5 py-4 text-left hover:bg-white/5 ${selected?.id === req.id ? "bg-[#20dc73]/10" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{req.title || req.service_type || "Request"}</p>
                    <p className="mt-1 text-xs text-white/40">{req.case_number} · {req.account_email || req.client_email || "unknown"}</p>
                  </div>
                  <span className="rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-[#20dc73]">{req.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <aside className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
          {selected ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">{selected.title || "Selected request"}</h2>
                <p className="mt-2 text-sm text-white/60">{selected.description}</p>
                <p className="mt-3 text-xs text-white/40">Urgency: {selected.urgency || "normal"} · Deadline: {selected.preferred_deadline || "not set"}</p>
              </div>

              {renderInvestigationFields()}
              {renderCommunication()}
              {renderLinks()}
              {renderEvidence()}
              {renderExtraInfo()}
              {renderTraining()}

              <QuoteSummary
                quoteAmount={selected.approved_quote_amount}
                currency={selected.approved_quote_currency || "NGN"}
                notes={selected.approved_quote_notes || selected.quote_notes}
                estimatedCompletion={selected.approved_estimated_completion}
              />

              <div className="rounded-md border border-[#143b28] bg-black/30 p-4 text-sm text-white/60">
                <p className="font-semibold text-white">AI Analysis</p>
                <p>Complexity: {selected.ai_complexity || "pending"} · Hours: {selected.ai_estimated_hours || "pending"}</p>
                <p>Service: {selected.ai_suggested_service || selected.service_type || "pending"} · Priority: {selected.ai_suggested_priority || selected.urgency || "normal"}</p>
                <p>Confidence: {selected.ai_confidence || "pending"}</p>
                {selected.ai_reasoning ? <p className="mt-2 text-xs text-white/40">{selected.ai_reasoning}</p> : null}
              </div>

              <div className="grid gap-2">
                <button onClick={() => update("approve", { status: "approved" })} className="inline-flex h-10 items-center justify-center gap-2 rounded border border-[#20dc73]/40 text-sm text-[#20dc73]"><CheckCircle2 className="h-4 w-4" />Approve</button>
                <button onClick={() => update("reject", { status: "rejected" })} className="inline-flex h-10 items-center justify-center gap-2 rounded border border-red-400/40 text-sm text-red-200"><XCircle className="h-4 w-4" />Reject</button>
              </div>

              <div className="space-y-3 border-t border-[#143b28] pt-5">
                <h3 className="font-semibold">Send Quote</h3>
                <input value={quote.approved_quote_amount} onChange={(e) => setQuote({ ...quote, approved_quote_amount: e.target.value })} placeholder="Amount" className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm outline-none" />
                <input value={quote.approved_quote_currency} onChange={(e) => setQuote({ ...quote, approved_quote_currency: e.target.value })} placeholder="Currency" className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm outline-none" />
                <input type="date" value={quote.approved_estimated_completion} onChange={(e) => setQuote({ ...quote, approved_estimated_completion: e.target.value })} className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm outline-none" />
                <textarea value={quote.quote_notes} onChange={(e) => setQuote({ ...quote, quote_notes: e.target.value })} placeholder="Quote notes" className="min-h-24 w-full rounded border border-[#143b28] bg-black px-3 py-2 text-sm outline-none" />
                <button onClick={() => update("send_quote", { ...quote, status: "quote_sent" })} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-[#20dc73] font-bold text-black"><Send className="h-4 w-4" />Send Quote</button>
              </div>
            </div>
          ) : <p className="text-sm text-white/45">Select a request for review.</p>}
        </aside>
      </section>
    </main>
  )
}
