"use client"

import { FileArchive, Fingerprint, Image as ImageIcon, Loader2, ShieldCheck, Trash2, UploadCloud, X } from "lucide-react"
import { useEffect, useState } from "react"
import EvidenceAssociationList, { type EvidenceAssociation } from "./EvidenceAssociationList"
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [removingAssociationId, setRemovingAssociationId] = useState<string | null>(null)
  const [associations, setAssociations] = useState<Record<string, EvidenceAssociation[]>>({})
  const [error, setError] = useState("")
  const [previewItem, setPreviewItem] = useState<EvidenceFile | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/cases/${caseId}/evidence`, { credentials: "include" })
    if (res.ok) {
      const files = (await res.json()) as EvidenceFile[]
      setEvidence(files)

      const linked = await Promise.all(
        files.map(async (file) => {
          const response = await fetch(
            `/api/cases/${encodeURIComponent(caseId)}/graph/provenance?evidence_id=${encodeURIComponent(file.id)}`,
            { credentials: "include" },
          )
          const payload = await response.json().catch(() => ({}))
          return [file.id, response.ok && Array.isArray(payload.associations) ? payload.associations : []] as const
        }),
      )
      setAssociations(Object.fromEntries(linked))
    }
    setLoading(false)
  }

  useEffect(() => {
    if (caseId) load()
  }, [caseId])

  async function deleteEvidence(item: EvidenceFile) {
    if (!window.confirm(`Remove ${item.file_name} from this case? This also removes its stored file.`)) return

    try {
      setDeletingId(item.id)
      setError("")
      const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/evidence`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || "Failed to remove evidence.")
      setEvidence((current) => current.filter((entry) => entry.id !== item.id))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to remove evidence.")
    } finally {
      setDeletingId(null)
    }
  }

  async function removeAssociation(association: EvidenceAssociation) {
    if (!window.confirm("Remove this link? Removing this link does not delete the evidence file.")) return

    try {
      setRemovingAssociationId(association.association_id)
      setError("")
      const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/graph/provenance`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: association.target_type,
          target_id: association.target_id,
          evidence_id: association.evidence_id,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || "Failed to remove evidence association.")
      setAssociations((current) => ({
        ...current,
        [association.evidence_id]: (current[association.evidence_id] || []).filter(
          (item) => item.association_id !== association.association_id,
        ),
      }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to remove evidence association.")
    } finally {
      setRemovingAssociationId(null)
    }
  }

  function canPreviewImage(item: EvidenceFile) {
    return ["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"].includes((item.file_type || "").toLowerCase())
  }

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

      {error ? <p className="mt-4 rounded border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

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
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-[#20dc73]">
                    <FileArchive className="h-3.5 w-3.5" />
                    {item.evidence_type || "evidence"}
                  </span>
                  {canPreviewImage(item) ? <button type="button" onClick={() => setPreviewItem(item)} title="View authorized evidence image" className="grid h-8 w-8 place-items-center rounded border border-[#20dc73]/30 text-[#20dc73] transition hover:bg-[#20dc73]/10" aria-label={`View ${item.file_name}`}><ImageIcon className="h-4 w-4" /></button> : null}
                  <button
                    type="button"
                    onClick={() => void deleteEvidence(item)}
                    disabled={deletingId === item.id}
                    title="Remove evidence from this case"
                    aria-label={`Remove ${item.file_name}`}
                    className="grid h-8 w-8 place-items-center rounded border border-red-400/30 text-red-300 transition hover:bg-red-400/10 disabled:opacity-40"
                  >
                    {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
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

              <div className="mt-4 border-t border-[#143b28] pt-3">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-white/45">
                  Linked Graph Records
                </p>
                <EvidenceAssociationList
                  associations={associations[item.id] || []}
                  view="linked"
                  onRemove={removeAssociation}
                  removingAssociationId={removingAssociationId}
                />
              </div>
            </article>
          )
        })}
      </div>

      {previewItem ? <div role="dialog" aria-modal="true" aria-label={`Evidence image preview: ${previewItem.file_name}`} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={() => setPreviewItem(null)}>
        <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-[#27543a] bg-[#06110f] shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between gap-4 border-b border-[#143b28] px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{previewItem.file_name}</p><p className="mt-1 text-xs text-white/45">Authorized case-evidence preview. This view is not a verification determination.</p></div><button type="button" onClick={() => setPreviewItem(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded border border-white/15 text-white/65 hover:border-[#20dc73]/35 hover:text-[#20dc73]" aria-label="Close image preview"><X className="h-4 w-4" /></button></div>
          <div className="min-h-0 flex-1 overflow-auto bg-black p-3"><img src={`/api/cases/${encodeURIComponent(caseId)}/evidence/${encodeURIComponent(previewItem.id)}/preview`} alt={previewItem.file_name} className="mx-auto max-h-[calc(100dvh-10rem)] max-w-full object-contain" /></div>
        </div>
      </div> : null}
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
