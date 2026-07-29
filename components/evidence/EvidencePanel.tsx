"use client"

import { FileArchive, Fingerprint, ShieldCheck, UploadCloud } from "lucide-react"
import { useEffect, useState } from "react"
import EvidenceUpload from "./EvidenceUpload"

type CustodyEvent = {
  action?: string
  user_id?: string
  timestamp?: string
  notes?: string
}

type EvidenceFile = {
  id: string
  file_name: string
  file_type: string | null
  file_size: number | null
  file_hash: string | null
  uploaded_by: string | null
  evidence_type: string | null
  description: string | null
  chain_of_custody: CustodyEvent[] | Record<string, unknown> | null
  created_at: string
  updated_at: string | null
  uploader: string | null
}

function custodyEvents(value: EvidenceFile["chain_of_custody"]) {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") return [value as CustodyEvent]
  return []
}

export default function EvidencePanel({ caseId }: { caseId: string }) {
  const [evidence, setEvidence] = useState<EvidenceFile[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/cases/${caseId}/evidence`, { credentials: "include" })
    if (res.ok) setEvidence(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    if (caseId) load()
  }, [caseId])

  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">Evidence Viewer</p>
          <h2 className="mt-1 font-semibold text-white">Forensic Files</h2>
        </div>
        <span className="rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-[#20dc73]">{evidence.length} files</span>
      </div>

      <div className="mt-4">
        <EvidenceUpload caseId={caseId} onUploaded={load} />
      </div>

      <div className="mt-5 space-y-4">
        {loading ? <p className="text-sm text-white/45">Loading evidence...</p> : null}
        {!loading && !evidence.length ? <p className="text-sm text-white/45">No forensic files have been submitted for this case.</p> : null}
        {evidence.map((item) => {
          const events = custodyEvents(item.chain_of_custody)

          return (
            <article key={item.id} className="rounded-md border border-[#143b28] bg-black/25 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">{item.file_name}</h3>
                  <p className="mt-1 text-xs text-white/45">
                    {item.file_type || "unknown type"} · {item.file_size ?? 0} bytes · uploaded by {item.uploader || item.uploaded_by || "unknown"}
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-[#20dc73]">
                  <FileArchive className="h-3.5 w-3.5" />
                  {item.evidence_type || "evidence"}
                </span>
              </div>

              {item.description ? <p className="mt-3 text-sm text-white/65">{item.description}</p> : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InfoLine icon={Fingerprint} label="Hash" value={item.file_hash || "pending"} mono />
                <InfoLine icon={UploadCloud} label="Upload Time" value={new Date(item.created_at).toLocaleString()} />
              </div>

              <div className="mt-4 border-t border-[#143b28] pt-3">
                <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/45">
                  <ShieldCheck className="h-4 w-4 text-[#20dc73]" />
                  Chain of Custody
                </p>
                <div className="space-y-2">
                  {events.length ? events.map((event, index) => (
                    <div key={`${item.id}-${index}`} className="text-xs text-white/50">
                      <span className="text-[#20dc73]">{event.timestamp ? new Date(event.timestamp).toLocaleString() : "Unstamped"}</span>
                      {" · "}
                      {event.action || "custody event"}
                      {event.user_id ? ` by ${event.user_id}` : ""}
                      {event.notes ? ` · ${event.notes}` : ""}
                    </div>
                  )) : <p className="text-xs text-white/40">No chain of custody entries recorded.</p>}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function InfoLine({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: typeof Fingerprint
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded border border-[#143b28] bg-[#06110f] p-3">
      <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-white/40">
        <Icon className="h-4 w-4 text-[#20dc73]" />
        {label}
      </p>
      <p className={`break-all text-xs text-white/65 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  )
}
