"use client"

import { Archive, CheckCircle2, FileWarning, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"
import EvidenceUpload from "./EvidenceUpload"

type EvidenceActivity = {
  id: string
  action: string
  notes: string | null
  created_at: string
  username: string | null
}

type EvidenceFile = {
  id: string
  file_name: string
  file_type: string | null
  file_size: number | null
  sha256_hash: string | null
  description: string | null
  status: string
  created_at: string
  uploader: string | null
  activity: EvidenceActivity[]
}

const statusClass: Record<string, string> = {
  submitted: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  verified: "border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]",
  rejected: "border-red-400/30 bg-red-400/10 text-red-200",
  archived: "border-white/20 bg-white/10 text-white/55",
}

export default function EvidencePanel({ caseId }: { caseId: string }) {
  const [evidence, setEvidence] = useState<EvidenceFile[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch(`/api/cases/${caseId}/evidence`, { credentials: "include" })
    if (res.ok) setEvidence(await res.json())
    setLoading(false)
  }

  async function updateStatus(evidenceId: string, status: "verified" | "rejected" | "archived") {
    await fetch(`/api/cases/${caseId}/evidence`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidence_id: evidenceId, status, notes: `Evidence marked ${status}` }),
    })
    await load()
  }

  useEffect(() => {
    if (caseId) load()
  }, [caseId])

  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">Evidence Management</p>
          <h2 className="mt-1 font-semibold text-white">Chain of Custody</h2>
        </div>
        <span className="rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-[#20dc73]">{evidence.length} files</span>
      </div>

      <div className="mt-4">
        <EvidenceUpload caseId={caseId} onUploaded={load} />
      </div>

      <div className="mt-5 space-y-4">
        {loading ? <p className="text-sm text-white/45">Loading evidence...</p> : null}
        {!loading && !evidence.length ? <p className="text-sm text-white/45">No evidence has been submitted for this case.</p> : null}
        {evidence.map((item) => (
          <article key={item.id} className="rounded-md border border-[#143b28] bg-black/25 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">{item.file_name}</h3>
                <p className="mt-1 text-xs text-white/45">{item.file_type || "unknown"} · {item.file_size || 0} bytes · uploaded by {item.uploader || "unknown"}</p>
              </div>
              <span className={`rounded border px-2 py-1 text-xs ${statusClass[item.status] || statusClass.submitted}`}>{item.status}</span>
            </div>

            {item.description ? <p className="mt-3 text-sm text-white/65">{item.description}</p> : null}
            <p className="mt-3 break-all font-mono text-xs text-[#20dc73]/80">SHA256: {item.sha256_hash || "pending"}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => updateStatus(item.id, "verified")} className="inline-flex items-center gap-2 rounded border border-[#20dc73]/40 px-3 py-2 text-sm text-[#20dc73] hover:bg-[#20dc73]/10"><CheckCircle2 className="h-4 w-4" />Verify</button>
              <button onClick={() => updateStatus(item.id, "rejected")} className="inline-flex items-center gap-2 rounded border border-red-400/40 px-3 py-2 text-sm text-red-200 hover:bg-red-400/10"><FileWarning className="h-4 w-4" />Reject</button>
              <button onClick={() => updateStatus(item.id, "archived")} className="inline-flex items-center gap-2 rounded border border-white/20 px-3 py-2 text-sm text-white/70 hover:bg-white/10"><Archive className="h-4 w-4" />Archive</button>
            </div>

            <div className="mt-4 border-t border-[#143b28] pt-3">
              <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/45"><ShieldCheck className="h-4 w-4 text-[#20dc73]" />Activity Timeline</p>
              <div className="space-y-2">
                {item.activity.map((event) => (
                  <div key={event.id} className="text-xs text-white/50">
                    <span className="text-[#20dc73]">{new Date(event.created_at).toLocaleString()}</span> · {event.action} by {event.username || "system"} {event.notes ? `· ${event.notes}` : ""}
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
