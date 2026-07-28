"use client"

import { Gauge } from "lucide-react"

type Finding = {
  id: string
  title: string | null
  finding: string | null
  confidence_score: number | null
  created_at: string
  created_by_username?: string | null
}

export default function FindingPanel({ finding }: { finding: Finding }) {
  return (
    <article className="rounded-md border border-[#143b28] bg-black/25 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{finding.title || "Untitled finding"}</h3>
          <p className="mt-1 text-xs text-white/40">
            {finding.created_by_username || "analyst"} · {new Date(finding.created_at).toLocaleString()}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-[#20dc73]">
          <Gauge className="h-4 w-4" />
          {finding.confidence_score ?? 0}%
        </span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-white/65">{finding.finding || "No finding detail recorded."}</p>
    </article>
  )
}
