"use client"

import { Eye, FilePlus2, Link2, Plus, RefreshCcw } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import ReportViewer, { CaseReport } from "./ReportViewer"

type EvidenceOption = {
  id: string
  file_name: string | null
  status: string | null
  sha256_hash: string | null
}

type EntityOption = {
  id: string
  name: string | null
  entity_type: string | null
  confidence_score: number | null
}

type ReportPayload = {
  reports: CaseReport[]
  evidence: EvidenceOption[]
  entities: EntityOption[]
}

const reportStatuses = ["draft", "review", "approved", "published"]

export default function ReportBuilder({ caseId }: { caseId: string }) {
  const [payload, setPayload] = useState<ReportPayload>({ reports: [], evidence: [], entities: [] })
  const [selectedReportId, setSelectedReportId] = useState("")
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState({ title: "", report_type: "intelligence", classification: "internal", executive_summary: "" })
  const [section, setSection] = useState({ section_type: "analysis", title: "", content: "" })
  const [evidenceId, setEvidenceId] = useState("")
  const [entityId, setEntityId] = useState("")

  const selectedReport = useMemo(
    () => payload.reports.find((report) => report.id === selectedReportId) ?? payload.reports[0],
    [payload.reports, selectedReportId],
  )

  async function loadReports() {
    const res = await fetch(`/api/cases/${caseId}/reports`, { credentials: "include" })
    if (res.ok) {
      const data = await res.json()
      setPayload({
        reports: data.reports ?? [],
        evidence: data.evidence ?? [],
        entities: data.entities ?? [],
      })
      if (!selectedReportId && data.reports?.[0]?.id) setSelectedReportId(data.reports[0].id)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (caseId) loadReports()
  }, [caseId])

  async function createReport() {
    if (!draft.title.trim()) return

    const res = await fetch(`/api/cases/${caseId}/reports`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    })

    if (res.ok) {
      const report = await res.json()
      setSelectedReportId(report.id)
      setDraft({ title: "", report_type: "intelligence", classification: "internal", executive_summary: "" })
      await loadReports()
    }
  }

  async function patchReport(body: Record<string, unknown>) {
    if (!selectedReport?.id) return false

    const res = await fetch(`/api/cases/${caseId}/reports`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_id: selectedReport.id, ...body }),
    })

    if (res.ok) await loadReports()
    return res.ok
  }

  async function addSection() {
    if (!section.title.trim() || !section.content.trim()) return
    const saved = await patchReport({
      action: "add_section",
      ...section,
      order_index: selectedReport?.sections?.length ?? 0,
    })
    if (saved) setSection({ section_type: "analysis", title: "", content: "" })
  }

  async function attachEvidence() {
    if (!evidenceId) return
    const saved = await patchReport({ action: "attach_evidence", evidence_id: evidenceId })
    if (saved) setEvidenceId("")
  }

  async function attachEntity() {
    if (!entityId) return
    const saved = await patchReport({ action: "attach_entity", entity_id: entityId })
    if (saved) setEntityId("")
  }

  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">Intelligence Reports</p>
          <h2 className="mt-1 font-semibold text-white">Report Generation System</h2>
        </div>
        <button onClick={loadReports} className="inline-flex h-10 items-center gap-2 rounded border border-[#20dc73]/40 px-3 text-sm text-[#20dc73] hover:bg-[#20dc73]/10">
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[20rem_1fr]">
        <aside className="space-y-4">
          <div className="rounded-md border border-[#143b28] bg-black/20 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-white"><FilePlus2 className="h-4 w-4 text-[#20dc73]" />Create Report</h3>
            <div className="mt-4 space-y-3">
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Report title" className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none" />
              <input value={draft.report_type} onChange={(event) => setDraft({ ...draft, report_type: event.target.value })} placeholder="Report type" className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none" />
              <input value={draft.classification} onChange={(event) => setDraft({ ...draft, classification: event.target.value })} placeholder="Classification" className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none" />
              <textarea value={draft.executive_summary} onChange={(event) => setDraft({ ...draft, executive_summary: event.target.value })} placeholder="Executive summary" className="min-h-28 w-full rounded border border-[#143b28] bg-black px-3 py-2 text-sm text-white outline-none" />
              <button onClick={createReport} className="h-10 w-full rounded bg-[#20dc73] font-bold text-black">Create Draft</button>
            </div>
          </div>

          <div className="rounded-md border border-[#143b28] bg-black/20 p-4">
            <h3 className="font-semibold text-white">Report Queue</h3>
            <div className="mt-3 space-y-2">
              {loading ? <p className="text-sm text-white/45">Loading reports...</p> : null}
              {!loading && !payload.reports.length ? <p className="text-sm text-white/45">No reports drafted yet.</p> : null}
              {payload.reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReportId(report.id)}
                  className={`w-full rounded border px-3 py-2 text-left text-sm ${selectedReport?.id === report.id ? "border-[#20dc73]/50 bg-[#20dc73]/10 text-[#20dc73]" : "border-[#143b28] bg-[#06110f] text-white/65"}`}
                >
                  <span className="block font-semibold">{report.title || "Untitled report"}</span>
                  <span className="text-xs text-white/35">{report.status}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          {selectedReport ? (
            <>
              <div className="rounded-md border border-[#143b28] bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 font-semibold text-white"><Eye className="h-4 w-4 text-[#20dc73]" />Preview Report</h3>
                  <select value={selectedReport.status} onChange={(event) => patchReport({ action: "update_report", status: event.target.value })} className="h-10 rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none">
                    {reportStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-md border border-[#143b28] bg-black/20 p-4">
                  <h3 className="flex items-center gap-2 font-semibold text-white"><Plus className="h-4 w-4 text-[#20dc73]" />Add Section</h3>
                  <div className="mt-4 space-y-3">
                    <input value={section.section_type} onChange={(event) => setSection({ ...section, section_type: event.target.value })} placeholder="Section type" className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none" />
                    <input value={section.title} onChange={(event) => setSection({ ...section, title: event.target.value })} placeholder="Section title" className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none" />
                    <textarea value={section.content} onChange={(event) => setSection({ ...section, content: event.target.value })} placeholder="Section content" className="min-h-28 w-full rounded border border-[#143b28] bg-black px-3 py-2 text-sm text-white outline-none" />
                    <button onClick={addSection} className="h-10 w-full rounded border border-[#20dc73]/40 text-sm font-semibold text-[#20dc73] hover:bg-[#20dc73]/10">Add Section</button>
                  </div>
                </div>

                <div className="rounded-md border border-[#143b28] bg-black/20 p-4">
                  <h3 className="flex items-center gap-2 font-semibold text-white"><Link2 className="h-4 w-4 text-[#20dc73]" />Attach Evidence & Entities</h3>
                  <div className="mt-4 space-y-3">
                    <select value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)} className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none">
                      <option value="">Select evidence</option>
                      {payload.evidence.map((item) => <option key={item.id} value={item.id}>{item.file_name || item.id}</option>)}
                    </select>
                    <button onClick={attachEvidence} className="h-10 w-full rounded border border-[#20dc73]/40 text-sm font-semibold text-[#20dc73] hover:bg-[#20dc73]/10">Attach Evidence</button>
                    <select value={entityId} onChange={(event) => setEntityId(event.target.value)} className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none">
                      <option value="">Select entity</option>
                      {payload.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name || entity.id}</option>)}
                    </select>
                    <button onClick={attachEntity} className="h-10 w-full rounded border border-[#20dc73]/40 text-sm font-semibold text-[#20dc73] hover:bg-[#20dc73]/10">Attach Entity</button>
                  </div>
                </div>
              </div>

              <ReportViewer report={selectedReport} />
            </>
          ) : (
            <div className="rounded-md border border-[#143b28] bg-black/20 p-6 text-sm text-white/45">Create or select a report to start building the intelligence package.</div>
          )}
        </div>
      </div>
    </section>
  )
}
