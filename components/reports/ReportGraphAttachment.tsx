"use client"

import { ImagePlus, Loader2, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

type Artifact = {
  id: string
  title: string | null
  description: string | null
  visibility_scope: "internal" | "client"
  metadata: { entity_count?: number; relationship_count?: number; page_count?: number; layout?: "network" | "hierarchical" } | null
}

export default function ReportGraphAttachment({ caseId, reportId, locked, manage = true }: { caseId: string; reportId: string; locked: boolean; manage?: boolean }) {
  const [artifact, setArtifact] = useState<Artifact | null>(null)
  const [title, setTitle] = useState("Investigation Graph")
  const [description, setDescription] = useState("Recorded entities and relationships at the time this figure is attached.")
  const [visibility, setVisibility] = useState<"internal" | "client">("internal")
  const [layout, setLayout] = useState<"network" | "hierarchical">("hierarchical")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const endpoint = `/api/cases/${encodeURIComponent(caseId)}/reports/${encodeURIComponent(reportId)}/graph`
  async function load() {
    const response = await fetch(endpoint, { credentials: "include" })
    if (!response.ok) return
    const data = await response.json()
    setArtifact(data.artifact || null)
    if (data.artifact?.title) setTitle(data.artifact.title)
    if (data.artifact?.description) setDescription(data.artifact.description)
    if (data.artifact?.visibility_scope === "client") setVisibility("client")
    if (data.artifact?.metadata?.layout === "network") setLayout("network")
  }
  useEffect(() => { void load() }, [caseId, reportId])

  async function save() {
    setSaving(true); setMessage("")
    try {
      const response = await fetch(endpoint, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, visibility, layout }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "Unable to create graph attachment.")
      setArtifact(data.artifact); setMessage("Graph snapshot attached. It will not follow later live-graph changes.")
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create graph attachment.") } finally { setSaving(false) }
  }

  async function remove() {
    if (!window.confirm("Remove this graph attachment? Removing it does not change the live investigation graph.")) return
    setSaving(true); setMessage("")
    try {
      const response = await fetch(endpoint, { method: "DELETE", credentials: "include" })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "Unable to remove graph attachment.")
      setArtifact(null); setMessage("Graph attachment removed.")
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to remove graph attachment.") } finally { setSaving(false) }
  }

  return <section className="rounded-xl border border-[#143b28] bg-black/20 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="flex items-center gap-2 font-semibold text-white"><ImagePlus className="h-4 w-4 text-[#20dc73]" />Investigation Graph</h3><p className="mt-1 text-xs leading-5 text-white/45">A stored figure is used in the report, Word export, and approved PDF. It never exposes evidence files or changes when the live graph changes.</p></div>
      {artifact ? <span className="rounded border border-[#20dc73]/25 bg-[#20dc73]/5 px-2 py-1 font-mono text-[8px] uppercase text-[#20dc73]">Attached</span> : null}
    </div>
    {artifact ? <div className="mt-4 overflow-hidden rounded-lg border border-[#143b28] bg-[#06110f]"><img src={`/api/reports/${encodeURIComponent(reportId)}/artifacts/${encodeURIComponent(artifact.id)}`} alt={artifact.title || "Investigation graph"} className="max-h-[28rem] w-full object-contain" /><div className="border-t border-[#143b28] p-3 text-xs text-white/55"><strong className="text-white">{artifact.title || "Investigation graph"}</strong><p className="mt-1">{artifact.description}</p><p className="mt-2 font-mono text-[9px] text-white/35">{artifact.metadata?.entity_count ?? 0} entities · {artifact.metadata?.relationship_count ?? 0} relationships · {artifact.metadata?.layout || "network"} layout · {artifact.visibility_scope} visibility</p></div></div> : null}
    {manage && !locked ? <div className="mt-4 grid gap-3 lg:grid-cols-2"><input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Graph figure title" className="h-10 rounded-lg border border-[#143b28] bg-black px-3 text-sm text-white outline-none" /><select value={visibility} onChange={(event) => setVisibility(event.target.value === "client" ? "client" : "internal")} className="h-10 rounded-lg border border-[#143b28] bg-black px-3 text-sm text-white outline-none"><option value="internal">Internal visibility</option><option value="client">Client-visible only</option></select><select value={layout} onChange={(event) => setLayout(event.target.value === "network" ? "network" : "hierarchical")} aria-label="Graph layout" className="h-10 rounded-lg border border-[#143b28] bg-black px-3 text-sm text-white outline-none"><option value="hierarchical">Hierarchical layout</option><option value="network">Network layout</option></select><p className="self-center text-xs leading-5 text-white/45">Hierarchical keeps direction and cross-links. Large cases include an overview and readable detail pages.</p><textarea value={description} onChange={(event) => setDescription(event.target.value)} aria-label="Graph figure description" className="min-h-20 rounded-lg border border-[#143b28] bg-black px-3 py-2 text-sm text-white outline-none lg:col-span-2" /><div className="flex flex-wrap gap-2 lg:col-span-2"><button type="button" onClick={() => void save()} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#20dc73] px-3 text-sm font-semibold text-black disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}{artifact ? "Replace Investigation Graph" : "Insert Investigation Graph"}</button>{artifact ? <button type="button" onClick={() => void remove()} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-400/30 px-3 text-sm font-semibold text-red-300 disabled:opacity-50"><Trash2 className="h-4 w-4" />Remove attachment</button> : null}</div></div> : artifact ? <p className="mt-4 text-xs text-white/45">This graph snapshot is frozen with the controlled report version.</p> : null}
    {message ? <p className="mt-3 text-xs leading-5 text-white/60">{message}</p> : null}
  </section>
}
