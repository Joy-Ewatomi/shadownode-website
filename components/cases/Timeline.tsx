"use client"

import { useEffect, useState } from "react"

type TimelineUpdate = {
  id: string
  title: string | null
  content: string | null
  update_type: string
  created_at: string
  username: string | null
}

export default function Timeline({ caseId, caseNumber }: { caseId: string; caseNumber?: string }) {
  const [updates, setUpdates] = useState<TimelineUpdate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/cases/${caseId}/updates`, { credentials: "include" })
      if (res.ok) setUpdates(await res.json())
      setLoading(false)
    }

    if (caseId) load()
  }, [caseId])

  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f]">
      <div className="border-b border-[#143b28] px-5 py-4">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">Case Timeline</p>
        <h2 className="mt-1 font-semibold text-white">{caseNumber ? `CASE ${caseNumber}` : "Operational Activity"}</h2>
      </div>
      <div className="space-y-0 p-5">
        {loading ? <p className="text-sm text-white/45">Loading timeline...</p> : null}
        {!loading && !updates.length ? <p className="text-sm text-white/45">No timeline events recorded yet.</p> : null}
        {updates.map((update) => (
          <div key={update.id} className="grid grid-cols-[4.5rem_1fr] gap-4 border-l border-[#20dc73]/30 pb-5 pl-4 last:pb-0">
            <time className="-ml-4 border-l-2 border-[#20dc73] pl-3 font-mono text-xs text-[#20dc73]">
              {new Date(update.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </time>
            <div>
              <p className="font-medium text-white">{update.title || update.update_type}</p>
              {update.content ? <p className="mt-1 text-sm text-white/55">{update.content}</p> : null}
              <p className="mt-1 text-xs text-white/35">{update.username || "System"} · {new Date(update.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
