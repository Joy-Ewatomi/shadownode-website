"use client"

import { ExternalLink } from "lucide-react"

type Source = {
  id: string
  source_type: string | null
  source_name: string | null
  url: string | null
  description: string | null
  reliability_score: number | null
  created_by_username?: string | null
}

export default function SourcePanel({ source }: { source: Source }) {
  return (
    <article className="rounded-md border border-[#143b28] bg-black/25 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{source.source_name || "Unnamed source"}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#20dc73]">{source.source_type || "OSINT"}</p>
        </div>
        <span className="rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-[#20dc73]">
          {source.reliability_score ?? 0}% reliable
        </span>
      </div>

      {source.url ? (
        <a href={source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex max-w-full items-center gap-2 break-all text-xs text-[#20dc73] hover:text-[#7dffa9]">
          <ExternalLink className="h-4 w-4 shrink-0" />
          {source.url}
        </a>
      ) : null}

      <p className="mt-3 text-sm text-white/60">{source.description || "No source description recorded."}</p>
      <p className="mt-3 text-xs text-white/35">Added by {source.created_by_username || "operator"}</p>
    </article>
  )
}
