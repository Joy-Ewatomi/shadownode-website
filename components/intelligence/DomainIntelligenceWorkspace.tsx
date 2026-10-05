"use client"

import Link from "next/link"
import { useState, type FormEvent } from "react"
import { ArrowLeft, Globe2, Loader2, LockKeyhole, Search } from "lucide-react"

type CaseOption = { id: string; case_number: string | null; title: string | null; status: string | null }
type Json = Record<string, unknown>

function analysisResponseError(status: number, data: Json | null) {
  if (typeof data?.error === "string" && data.error) return data.error
  if (status === 504) return "Domain analysis exceeded the available processing time. Please try again after the analyzer has warmed up."
  if (status === 502 || status === 503) return "Domain analysis service is temporarily unavailable. Please try again later."
  return "Domain analysis could not be completed. Please try again."
}

const sections: Array<[string, string[]]> = [
  ["Overview", ["overview", "summary"]], ["Domain / RDAP", ["rdap", "domain", "registration"]],
  ["DNS", ["dns", "dns_records"]], ["IP / ASN", ["ip", "ips", "network", "asn"]],
  ["HTTP", ["http", "web"]], ["TLS", ["tls", "certificate"]],
  ["Certificate Transparency", ["certificate_transparency", "ct"]],
  ["Infrastructure Correlation", ["correlations", "relationships"]],
  ["Findings", ["findings"]], ["Evidence", ["evidence", "artifacts"]],
]

function asObject(value: unknown): Json | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Json : null }
function pick(data: Json, keys: string[]) { for (const key of keys) if (data[key] !== undefined && data[key] !== null) return data[key]; return null }
function count(value: unknown) { return Array.isArray(value) ? value.length : asObject(value) ? Object.keys(value as Json).length : value == null ? 0 : 1 }
function display(value: unknown) { if (value === null || value === undefined || value === "") return "Unavailable"; return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value) }
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

function DataSection({ title, value }: { title: string; value: unknown }) {
  if (value == null || (Array.isArray(value) && !value.length)) return null
  const record = asObject(value)
  return <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
    <h2 className="font-semibold text-white">{title}</h2>
    {record ? <dl className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(record).map(([key, val]) => <div key={key} className="min-w-0 rounded border border-[#143b28] bg-black/20 p-3"><dt className="text-xs uppercase text-white/40">{key.replaceAll("_", " ")}</dt><dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/70">{display(val)}</dd></div>)}</dl> : Array.isArray(value) ? <div className="mt-4 space-y-3">{value.map((item, index) => <pre key={index} className="overflow-x-auto whitespace-pre-wrap break-words rounded border border-[#143b28] bg-black/25 p-3 text-xs leading-6 text-white/70">{display(item)}</pre>)}</div> : <p className="mt-3 break-words text-sm text-white/70">{display(value)}</p>}
  </section>
}

export default function DomainIntelligenceWorkspace({ cases, initialCaseId, lockedCase }: { cases: CaseOption[]; initialCaseId: string; lockedCase?: CaseOption }) {
  const [caseId, setCaseId] = useState(initialCaseId)
  const [domain, setDomain] = useState("")
  const [status, setStatus] = useState<"ready" | "queued" | "processing" | "completed" | "failed">("ready")
  const [error, setError] = useState("")
  const [result, setResult] = useState<Json | null>(null)

  async function analyze(event: FormEvent) {
    event.preventDefault()
    if (!caseId) { setError("Select an authorized case before analysis."); return }
    setStatus("queued"); setError(""); setResult(null)
    try {
      const queuedResponse = await fetch("/api/intelligence/domains/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ case_id: caseId, domain }) })
      const queuedData = asObject(await queuedResponse.json().catch(() => null))
      if (!queuedResponse.ok) throw new Error(analysisResponseError(queuedResponse.status, queuedData))
      if (typeof queuedData?.job_id !== "string") throw new Error("Domain analysis could not be queued. Please try again later.")

      for (let poll = 0; poll < 300; poll += 1) {
        if (poll > 0) await wait(3_000)
        const search = new URLSearchParams({ case_id: caseId, job_id: queuedData.job_id })
        const response = await fetch(`/api/intelligence/domains/analyze?${search}`, { cache: "no-store" })
        const data = asObject(await response.json().catch(() => null))
        if (!response.ok) throw new Error(analysisResponseError(response.status, data))
        if (data?.status === "queued" || data?.status === "processing") { setStatus(data.status); continue }
        if (data?.status === "failed") throw new Error(typeof data.error === "string" ? data.error : "Domain analysis service could not complete the request.")
        const analysis = asObject(data?.analysis)
        if (data?.status !== "completed" || !analysis || typeof data.domain !== "string") throw new Error("Domain analysis returned an unavailable response. Please try again later.")
        setResult(analysis); setDomain(data.domain); setStatus("completed"); return
      }
      throw new Error("Domain analysis is still processing. You may safely return to this page and try again shortly.")
    } catch (reason) {
      const message = reason instanceof TypeError
        ? "Domain analysis service did not respond within the available processing time. Please try again later."
        : reason instanceof Error ? reason.message : "Domain analysis could not be completed. Please try again."
      setError(message); setStatus("failed")
    }
  }

  const selected = lockedCase || cases.find((item) => item.id === caseId)
  const entities = result ? pick(result, ["entities"]) : null
  const relationships = result ? pick(result, ["relationships", "correlations"]) : null
  const findings = result ? pick(result, ["findings"]) : null
  const evidence = result ? pick(result, ["evidence", "artifacts"]) : null

  return <div className="space-y-6">
    <header className="border-b border-[#143b28] pb-6">
      <Link href={lockedCase ? `/dashboard/cases/${lockedCase.id}` : "/dashboard/intelligence"} className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-[#20dc73]"><ArrowLeft className="h-4 w-4" />{lockedCase ? "Case Workspace" : "Intelligence Workspace"}</Link>
      <div className="mt-5 flex items-center gap-3"><Globe2 className="h-7 w-7 text-[#20dc73]" /><div><p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">{lockedCase ? "Case Intelligence" : "Domain intelligence"}</p><h1 className="text-3xl font-bold">Domain & DNS Intelligence</h1></div></div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">Analyze lawful domain infrastructure through SDIA. Correlations are investigative leads, not proof of ownership or wrongdoing.</p>
    </header>
    <form onSubmit={analyze} className="grid gap-4 rounded-md border border-[#143b28] bg-[#06110f] p-5 lg:grid-cols-[1fr_1fr_auto]">
      {lockedCase ? <div className="rounded border border-[#24563d] bg-black/30 px-3 py-2"><span className="flex items-center gap-2 text-xs text-[#20dc73]"><LockKeyhole className="h-3.5 w-3.5" />Authorized case locked</span><p className="mt-1 break-words text-sm text-white">{lockedCase.case_number || "Case"} - {lockedCase.title || "Untitled"}</p></div> : <label className="text-sm text-white/65">Authorized case<select value={caseId} onChange={(event) => setCaseId(event.target.value)} required className="mt-2 h-11 w-full rounded border border-[#24563d] bg-black/30 px-3 text-white"><option value="">Select case</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.case_number || "Case"} - {item.title || "Untitled"}</option>)}</select></label>}
      <label className="text-sm text-white/65">Domain<input value={domain} onChange={(event) => setDomain(event.target.value)} required placeholder="example.com" autoComplete="off" className="mt-2 h-11 w-full rounded border border-[#24563d] bg-black/30 px-3 text-white outline-none focus:border-[#20dc73]" /></label>
      <button disabled={status === "queued" || status === "processing" || !caseId} className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded bg-[#20dc73] px-5 font-semibold text-black disabled:opacity-50">{status === "queued" || status === "processing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{status === "queued" ? "Queueing..." : status === "processing" ? "Analyzing..." : "Analyze Domain"}</button>
    </form>
    <div className="flex flex-wrap items-center gap-3 text-sm"><span className="rounded border border-[#24563d] px-3 py-1.5 capitalize text-[#20dc73]">{status}</span>{selected && <span className="text-white/50">Associated with {selected.case_number || selected.title}</span>}<span className="text-amber-200/70">Results are stored with this authorized case.</span></div>
    {!cases.length && !lockedCase ? <div className="rounded border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">No active case with an investigative assignment is available.</div> : null}
    {error ? <div role="alert" className="rounded border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</div> : null}
    {result ? <><section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Entities", count(entities)], ["Relationships", count(relationships)], ["Findings", count(findings)], ["Evidence artifacts", count(evidence)]].map(([label, value]) => <div key={String(label)} className="rounded-md border border-[#143b28] bg-[#06110f] p-4"><p className="text-xs uppercase text-white/40">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>)}</section>{sections.map(([title, keys]) => <DataSection key={title} title={title} value={pick(result, keys)} />)}<details className="rounded-md border border-[#143b28] bg-[#06110f] p-5"><summary className="cursor-pointer font-semibold text-white">Raw Intelligence</summary><pre className="mt-4 max-h-[36rem] overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-4 text-xs leading-6 text-white/65">{JSON.stringify(result, null, 2)}</pre></details><p className="text-xs leading-5 text-white/45">Certificate Transparency hostnames may be historical or inactive. Shared IP addresses and ASNs do not by themselves establish common ownership.</p></> : null}
  </div>
}
