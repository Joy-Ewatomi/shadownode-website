"use client"

import { useState, type FormEvent } from "react"
import { CheckCircle2, GitBranch, Globe2, Loader2, Search } from "lucide-react"

type Json = Record<string, unknown>
type Status = "ready" | "queued" | "processing" | "completed" | "failed"

function asObject(value: unknown): Json | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : null
}

function itemCount(value: unknown) {
  if (Array.isArray(value)) return value.length
  if (value && typeof value === "object") return Object.keys(value).length
  return value == null ? 0 : 1
}

function resultValue(result: Json, keys: string[]) {
  for (const key of keys) if (result[key] != null) return result[key]
  return null
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export default function GraphDomainIntelligence({ caseId, onImported }: { caseId: string; onImported: () => Promise<void> | void }) {
  const [domain, setDomain] = useState("")
  const [status, setStatus] = useState<Status>("ready")
  const [jobId, setJobId] = useState("")
  const [result, setResult] = useState<Json | null>(null)
  const [error, setError] = useState("")
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState("")

  async function analyze(event: FormEvent) {
    event.preventDefault()
    setStatus("queued")
    setResult(null)
    setError("")
    setImportSummary("")

    try {
      const queuedResponse = await fetch("/api/intelligence/domains/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId, domain }),
      })
      const queued = asObject(await queuedResponse.json().catch(() => null))
      if (!queuedResponse.ok || typeof queued?.job_id !== "string") {
        throw new Error(typeof queued?.error === "string" ? queued.error : "Domain analysis could not be queued.")
      }
      setJobId(queued.job_id)

      for (let poll = 0; poll < 300; poll += 1) {
        if (poll) await wait(3000)
        const query = new URLSearchParams({ case_id: caseId, job_id: queued.job_id })
        const response = await fetch(`/api/intelligence/domains/analyze?${query}`, { cache: "no-store" })
        const data = asObject(await response.json().catch(() => null))
        if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Domain analysis could not be completed.")
        if (data?.status === "queued" || data?.status === "processing") {
          setStatus(data.status)
          continue
        }
        if (data?.status === "failed") throw new Error("Domain analysis could not be completed.")
        const analysis = asObject(data?.analysis)
        if (data?.status !== "completed" || !analysis) throw new Error("Domain analysis returned an unavailable response.")
        setResult(analysis)
        if (typeof data.domain === "string") setDomain(data.domain)
        setStatus("completed")
        return
      }
      throw new Error("Analysis is still processing. You can safely return later.")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Domain analysis could not be completed.")
      setStatus("failed")
    }
  }

  async function addToGraph() {
    if (!jobId || importing) return
    setImporting(true)
    setError("")
    try {
      const response = await fetch("/api/intelligence/domains/analyze/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId, job_id: jobId }),
      })
      const data = asObject(await response.json().catch(() => null))
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Intelligence could not be added.")
      const entities = Number(data?.entities_created || 0)
      const relationships = Number(data?.relationships_created || 0)
      const observations = Number(data?.observations_created || 0)
      setImportSummary(entities || relationships || observations
        ? `${entities} entities, ${relationships} relationships and ${observations} observations added for review.`
        : "This analysis is already in the case graph.")
      await onImported()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Intelligence could not be added.")
    } finally {
      setImporting(false)
    }
  }

  const metrics = result ? [
    ["Entities", itemCount(resultValue(result, ["entities"]))],
    ["Relationships", itemCount(resultValue(result, ["relationships", "correlations"]))],
    ["Findings", itemCount(resultValue(result, ["findings"]))],
    ["Evidence", itemCount(resultValue(result, ["evidence", "artifacts"]))],
  ] as const : []
  const busy = status === "queued" || status === "processing"

  return <section className="space-y-4">
    <div className="flex items-start gap-3">
      <Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-[#20dc73]" />
      <div><h2 className="text-sm font-semibold text-white">Domain & DNS intelligence</h2><p className="mt-1 text-xs leading-5 text-white/45">Analyze infrastructure, inspect the result, then add it to this case.</p></div>
    </div>
    <form onSubmit={analyze} className="space-y-2">
      <label className="block text-xs text-white/55">Domain
        <input value={domain} onChange={(event) => setDomain(event.target.value)} required placeholder="example.com" autoComplete="off" className="mt-2 h-11 w-full rounded-md border border-[#24563d] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]" />
      </label>
      <button disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#20dc73] px-4 text-sm font-bold text-black disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        {status === "queued" ? "Queued" : status === "processing" ? "Analyzing infrastructure" : "Analyze domain"}
      </button>
    </form>
    {busy ? <div className="space-y-2 rounded-md border border-[#143b28] bg-black/30 p-3 text-xs text-white/55"><p className="text-[#20dc73]">SDIA is collecting and correlating records.</p><div className="h-1 overflow-hidden rounded bg-white/10"><div className="h-full w-2/3 animate-pulse bg-[#20dc73]" /></div><p>You can keep this panel open while the background analysis runs.</p></div> : null}
    {error ? <p role="alert" className="rounded-md border border-red-400/30 bg-red-400/10 p-3 text-xs text-red-200">{error}</p> : null}
    {result ? <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">{metrics.map(([label, value]) => <div key={label} className="rounded-md border border-[#143b28] bg-black/30 p-3"><p className="text-[10px] uppercase text-white/35">{label}</p><p className="mt-1 text-xl font-semibold text-white">{value}</p></div>)}</div>
      <p className="text-xs leading-5 text-white/50">Results are staged first. Imported records remain confidential and unreviewed until an analyst verifies them.</p>
      <button type="button" onClick={addToGraph} disabled={importing} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#20dc73] text-sm font-semibold text-[#20dc73] disabled:opacity-50">
        {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}{importing ? "Adding to graph" : "Add intelligence to graph"}
      </button>
    </div> : null}
    {importSummary ? <p role="status" className="flex gap-2 rounded-md border border-[#20dc73]/30 bg-[#20dc73]/10 p-3 text-xs leading-5 text-[#8bf6b6]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{importSummary}</p> : null}
  </section>
}
