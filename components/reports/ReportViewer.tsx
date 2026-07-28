"use client"

import { BadgeCheck, FileText, Link2, Network } from "lucide-react"

export type ReportSection = {
  id: string
  section_type: string | null
  title: string | null
  content: string | null
  order_index: number
}

export type ReportLinkEvidence = {
  id: string
  file_name: string | null
  status: string | null
  sha256_hash: string | null
}

export type ReportLinkEntity = {
  id: string
  name: string | null
  entity_type: string | null
  confidence_score: number | null
}

export type CaseReport = {
  id: string
  title: string | null
  report_type: string | null
  status: string
  classification: string | null
  executive_summary: string | null
  created_by_username?: string | null
  approved_by_username?: string | null
  created_at: string
  updated_at: string
  sections: ReportSection[]
  evidence: ReportLinkEvidence[]
  entities: ReportLinkEntity[]
}

const statusClass: Record<string, string> = {
  draft: "border-white/20 bg-white/10 text-white/60",
  review: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  approved: "border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]",
  published: "border-cyan-300/30 bg-cyan-300/10 text-cyan-200",
}

export default function ReportViewer({ report }: { report: CaseReport }) {
  const sections = [...(report.sections || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

  return (
    <article className="rounded-md border border-[#143b28] bg-black/25 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#20dc73]">{report.report_type || "intelligence"} report</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{report.title || "Untitled report"}</h3>
          <p className="mt-1 text-xs text-white/40">
            {report.classification || "internal"} · created by {report.created_by_username || "operator"}
          </p>
        </div>
        <span className={`rounded border px-2 py-1 text-xs ${statusClass[report.status] || statusClass.draft}`}>{report.status}</span>
      </div>

      <div className="mt-4 rounded border border-[#143b28] bg-[#06110f] p-3">
        <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-white/45">
          <BadgeCheck className="h-4 w-4 text-[#20dc73]" />
          Executive Summary
        </p>
        <p className="whitespace-pre-wrap text-sm text-white/65">{report.executive_summary || "No executive summary drafted."}</p>
      </div>

      <div className="mt-4 space-y-3">
        {sections.length ? sections.map((section) => (
          <section key={section.id} className="rounded border border-[#143b28] bg-[#06110f] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[#20dc73]">{section.section_type || "section"}</p>
            <h4 className="mt-1 font-semibold text-white">{section.title || "Untitled section"}</h4>
            <p className="mt-2 whitespace-pre-wrap text-sm text-white/65">{section.content}</p>
          </section>
        )) : <p className="text-sm text-white/45">No report sections yet.</p>}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <LinkBlock icon={FileText} label="Attached Evidence">
          {report.evidence?.length ? report.evidence.map((item) => (
            <p key={item.id} className="break-all text-xs text-white/55">{item.file_name || "Evidence"} · {item.status || "submitted"}</p>
          )) : <p className="text-xs text-white/40">No evidence attached.</p>}
        </LinkBlock>

        <LinkBlock icon={Network} label="Attached Entities">
          {report.entities?.length ? report.entities.map((entity) => (
            <p key={entity.id} className="text-xs text-white/55">{entity.name || "Entity"} · {entity.entity_type || "unknown"} · {entity.confidence_score ?? 0}%</p>
          )) : <p className="text-xs text-white/40">No entities attached.</p>}
        </LinkBlock>
      </div>
    </article>
  )
}

function LinkBlock({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Link2
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded border border-[#143b28] bg-[#06110f] p-3">
      <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-white/45">
        <Icon className="h-4 w-4 text-[#20dc73]" />
        {label}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}
