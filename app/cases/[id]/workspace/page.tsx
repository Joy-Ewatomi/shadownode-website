"use client"

import Timeline from "@/components/cases/Timeline"
import EvidencePanel from "@/components/evidence/EvidencePanel"
import EntityPanel from "@/components/intelligence/EntityPanel"
import FindingPanel from "@/components/intelligence/FindingPanel"
import SourcePanel from "@/components/intelligence/SourcePanel"
import ReportBuilder from "@/components/reports/ReportBuilder"
import { FileText, MessageSquare, Network, Search, ShieldCheck, Upload } from "lucide-react"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

type DashboardData = {
  case_id: string
  statistics?: {
    entities: number
    relationships: number
    evidence: number
    updates: number
    notes: number
    assigned_investigators: number
  }
}

type IntelligenceEntity = {
  id: string
  name: string
  entity_type: string | null
  description: string | null
  confidence_score: number | null
  verification_status: string | null
  linked_evidence?: { id: string; file_name: string | null; status: string | null }[]
  sources?: { id: string; source_name: string | null; url: string | null; reliability_score: number | null }[]
}

type IntelligenceRelationship = {
  id: string
  source_entity_id: string
  source_entity_name?: string | null
  target_entity_id: string
  target_entity_name?: string | null
  relationship_type: string | null
  confidence_score: number | null
}

type IntelligenceSource = {
  id: string
  source_type: string | null
  source_name: string | null
  url: string | null
  description: string | null
  reliability_score: number | null
  created_by_username?: string | null
}

type InvestigationFinding = {
  id: string
  title: string | null
  finding: string | null
  confidence_score: number | null
  created_at: string
  created_by_username?: string | null
}

type EntityNote = {
  id: string
  entity_id: string
  note: string | null
  username: string | null
  created_at: string
}

type IntelligenceData = {
  entities: IntelligenceEntity[]
  relationships: IntelligenceRelationship[]
  sources: IntelligenceSource[]
  findings: InvestigationFinding[]
  notes: EntityNote[]
}

export default function InvestigatorCaseWorkspace() {
  const params = useParams()
  const caseId = String(params.id)
  const [data, setData] = useState<DashboardData | null>(null)
  const [intelligence, setIntelligence] = useState<IntelligenceData | null>(null)
  const [intelView, setIntelView] = useState<"graph" | "sources" | "findings" | "notes">("graph")
  const [entitySearch, setEntitySearch] = useState("")
  const [relationshipFilter, setRelationshipFilter] = useState("all")
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(false)
  const [sourceForm, setSourceForm] = useState({ source_name: "", source_type: "OSINT", url: "", description: "", reliability_score: 70, entity_id: "" })
  const [findingForm, setFindingForm] = useState({ title: "", finding: "", confidence_score: 70 })
  const [noteForm, setNoteForm] = useState({ entity_id: "", note: "" })

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/cases/${caseId}/dashboard`, { credentials: "include" })
      if (res.ok) setData(await res.json())
    }
    if (caseId) load()
  }, [caseId])

  async function loadIntelligence() {
    const res = await fetch(`/api/cases/${caseId}/intelligence`, { credentials: "include" })
    if (res.ok) setIntelligence(await res.json())
  }

  useEffect(() => {
    if (caseId) loadIntelligence()
  }, [caseId])

  async function createIntelligence(payload: Record<string, unknown>) {
    const res = await fetch(`/api/cases/${caseId}/intelligence`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (res.ok) await loadIntelligence()
    return res.ok
  }

  async function addSource() {
    if (!sourceForm.source_name.trim()) return
    const saved = await createIntelligence({
      type: "source",
      ...sourceForm,
      source_name: sourceForm.source_name.trim(),
      entity_id: sourceForm.entity_id || null,
    })
    if (saved) setSourceForm({ source_name: "", source_type: "OSINT", url: "", description: "", reliability_score: 70, entity_id: "" })
  }

  async function addFinding() {
    if (!findingForm.title.trim() || !findingForm.finding.trim()) return
    const saved = await createIntelligence({ type: "finding", ...findingForm })
    if (saved) setFindingForm({ title: "", finding: "", confidence_score: 70 })
  }

  async function addNote() {
    if (!noteForm.entity_id || !noteForm.note.trim()) return
    const saved = await createIntelligence({ type: "entity_note", ...noteForm })
    if (saved) setNoteForm({ entity_id: "", note: "" })
  }

  async function sendMessage() {
    if (!message.trim()) return
    const res = await fetch("/api/messages", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseId, message: message.trim() }),
    })
    if (res.ok) {
      setMessage("")
      setSent(true)
    }
  }

  const stats = data?.statistics
  const entities = intelligence?.entities ?? []
  const relationships = intelligence?.relationships ?? []
  const relationshipTypes = Array.from(new Set(relationships.map((relationship) => relationship.relationship_type || "unknown")))
  const filteredEntities = entities.filter((entity) => {
    const search = entitySearch.toLowerCase().trim()
    if (!search) return true
    return [entity.name, entity.entity_type, entity.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search))
  })
  const filteredRelationships = relationships.filter((relationship) => {
    if (relationshipFilter === "all") return true
    return (relationship.relationship_type || "unknown") === relationshipFilter
  })

  return (
    <main className="space-y-6">
      <header className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">Investigator Workspace</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Case Operations Workspace</h1>
        <p className="mt-1 text-sm text-white/50">Case ID: {caseId}</p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <WorkspaceCard icon={ShieldCheck} label="Assignments" value={stats?.assigned_investigators ?? 0} />
        <WorkspaceCard icon={Upload} label="Evidence" value={stats?.evidence ?? 0} />
        <WorkspaceCard icon={FileText} label="Updates" value={stats?.updates ?? 0} />
        <WorkspaceCard icon={MessageSquare} label="Notes" value={stats?.notes ?? 0} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Timeline caseId={caseId} />

        <aside className="space-y-4">
          <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
            <h2 className="font-semibold text-white">Assignment Information</h2>
            <p className="mt-2 text-sm text-white/55">Normalized role assignments, acceptance state, notes, and deadlines are tracked by Mission Control and surfaced in operator dashboards.</p>
          </div>

          <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
            <h2 className="font-semibold text-white">Evidence Section</h2>
            <p className="mt-2 text-sm text-white/55">{stats?.evidence ?? 0} evidence files currently linked to this case.</p>
          </div>

          <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
            <h2 className="font-semibold text-white">Reports Section</h2>
            <p className="mt-2 text-sm text-white/55">Draft, review, and final report modules will attach here.</p>
          </div>
        </aside>
      </section>

      <EvidencePanel caseId={caseId} />

      <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">OSINT Investigation Intelligence Engine</p>
            <h2 className="mt-1 font-semibold text-white">Intelligence Graph</h2>
          </div>
          <div className="flex rounded-md border border-[#143b28] bg-black/25 p-1">
            {(["graph", "sources", "findings", "notes"] as const).map((view) => (
              <button
                key={view}
                onClick={() => setIntelView(view)}
                className={`rounded px-3 py-2 text-xs font-semibold capitalize ${intelView === view ? "bg-[#20dc73] text-black" : "text-white/55 hover:text-white"}`}
              >
                {view === "graph" ? "Intelligence Graph" : view}
              </button>
            ))}
          </div>
        </div>

        {intelView === "graph" ? (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_16rem]">
              <label className="flex h-11 items-center gap-2 rounded-md border border-[#143b28] bg-black px-3 text-sm text-white">
                <Search className="h-4 w-4 text-[#20dc73]" />
                <input value={entitySearch} onChange={(event) => setEntitySearch(event.target.value)} placeholder="Search entities..." className="w-full bg-transparent outline-none placeholder:text-white/35" />
              </label>
              <select value={relationshipFilter} onChange={(event) => setRelationshipFilter(event.target.value)} className="h-11 rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none">
                <option value="all">All relationships</option>
                {relationshipTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
              <div className="space-y-4">
                {filteredEntities.length ? filteredEntities.map((entity) => (
                  <EntityPanel key={entity.id} entity={entity} relationships={filteredRelationships} notes={intelligence?.notes ?? []} />
                )) : <p className="text-sm text-white/45">No entities match the current intelligence filters.</p>}
              </div>

              <aside className="rounded-md border border-[#143b28] bg-black/20 p-4">
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#20dc73]"><Network className="h-4 w-4" /> Relationship Filter</p>
                <div className="mt-3 space-y-2">
                  {filteredRelationships.length ? filteredRelationships.map((relationship) => (
                    <div key={relationship.id} className="rounded border border-[#143b28] bg-[#06110f] p-3 text-xs text-white/55">
                      <p className="text-white/80">{relationship.source_entity_name || "Source"} to {relationship.target_entity_name || "Target"}</p>
                      <p className="mt-1">{relationship.relationship_type || "relationship"} · {relationship.confidence_score ?? 0}% confidence</p>
                    </div>
                  )) : <p className="text-sm text-white/40">No relationships for this filter.</p>}
                </div>
              </aside>
            </div>
          </div>
        ) : null}

        {intelView === "sources" ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[20rem_1fr]">
            <div className="rounded-md border border-[#143b28] bg-black/20 p-4">
              <h3 className="font-semibold text-white">Add Source</h3>
              <div className="mt-4 space-y-3">
                <input value={sourceForm.source_name} onChange={(event) => setSourceForm({ ...sourceForm, source_name: event.target.value })} placeholder="Source name" className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none" />
                <input value={sourceForm.source_type} onChange={(event) => setSourceForm({ ...sourceForm, source_type: event.target.value })} placeholder="Source type" className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none" />
                <input value={sourceForm.url} onChange={(event) => setSourceForm({ ...sourceForm, url: event.target.value })} placeholder="URL" className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none" />
                <select value={sourceForm.entity_id} onChange={(event) => setSourceForm({ ...sourceForm, entity_id: event.target.value })} className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none">
                  <option value="">No entity link</option>
                  {entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                </select>
                <textarea value={sourceForm.description} onChange={(event) => setSourceForm({ ...sourceForm, description: event.target.value })} placeholder="Description" className="min-h-24 w-full rounded border border-[#143b28] bg-black px-3 py-2 text-sm text-white outline-none" />
                <label className="block text-xs text-white/45">Reliability: {sourceForm.reliability_score}%</label>
                <input type="range" min="0" max="100" value={sourceForm.reliability_score} onChange={(event) => setSourceForm({ ...sourceForm, reliability_score: Number(event.target.value) })} className="w-full" />
                <button onClick={addSource} className="h-10 w-full rounded bg-[#20dc73] font-bold text-black">Save Source</button>
              </div>
            </div>
            <div className="space-y-4">
              {intelligence?.sources.length ? intelligence.sources.map((source) => <SourcePanel key={source.id} source={source} />) : <p className="text-sm text-white/45">No intelligence sources recorded.</p>}
            </div>
          </div>
        ) : null}

        {intelView === "findings" ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[20rem_1fr]">
            <div className="rounded-md border border-[#143b28] bg-black/20 p-4">
              <h3 className="font-semibold text-white">Add Finding</h3>
              <div className="mt-4 space-y-3">
                <input value={findingForm.title} onChange={(event) => setFindingForm({ ...findingForm, title: event.target.value })} placeholder="Finding title" className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none" />
                <textarea value={findingForm.finding} onChange={(event) => setFindingForm({ ...findingForm, finding: event.target.value })} placeholder="Finding detail" className="min-h-32 w-full rounded border border-[#143b28] bg-black px-3 py-2 text-sm text-white outline-none" />
                <label className="block text-xs text-white/45">Confidence: {findingForm.confidence_score}%</label>
                <input type="range" min="0" max="100" value={findingForm.confidence_score} onChange={(event) => setFindingForm({ ...findingForm, confidence_score: Number(event.target.value) })} className="w-full" />
                <button onClick={addFinding} className="h-10 w-full rounded bg-[#20dc73] font-bold text-black">Save Finding</button>
              </div>
            </div>
            <div className="space-y-4">
              {intelligence?.findings.length ? intelligence.findings.map((finding) => <FindingPanel key={finding.id} finding={finding} />) : <p className="text-sm text-white/45">No investigation findings recorded.</p>}
            </div>
          </div>
        ) : null}

        {intelView === "notes" ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[20rem_1fr]">
            <div className="rounded-md border border-[#143b28] bg-black/20 p-4">
              <h3 className="font-semibold text-white">Add Entity Note</h3>
              <div className="mt-4 space-y-3">
                <select value={noteForm.entity_id} onChange={(event) => setNoteForm({ ...noteForm, entity_id: event.target.value })} className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none">
                  <option value="">Select entity</option>
                  {entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                </select>
                <textarea value={noteForm.note} onChange={(event) => setNoteForm({ ...noteForm, note: event.target.value })} placeholder="Analyst note" className="min-h-32 w-full rounded border border-[#143b28] bg-black px-3 py-2 text-sm text-white outline-none" />
                <button onClick={addNote} className="h-10 w-full rounded bg-[#20dc73] font-bold text-black">Save Note</button>
              </div>
            </div>
            <div className="space-y-3">
              {intelligence?.notes.length ? intelligence.notes.map((note) => (
                <article key={note.id} className="rounded-md border border-[#143b28] bg-black/25 p-4">
                  <p className="text-sm text-white/70">{note.note}</p>
                  <p className="mt-2 text-xs text-white/35">{note.username || "analyst"} · {new Date(note.created_at).toLocaleString()}</p>
                </article>
              )) : <p className="text-sm text-white/45">No analyst notes recorded.</p>}
            </div>
          </div>
        ) : null}
      </section>

      <ReportBuilder caseId={caseId} />

      <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
        <h2 className="font-semibold text-white">Team Chat</h2>
        <p className="mt-1 text-sm text-white/45">Start or continue a secure case-linked conversation.</p>
        <div className="mt-4 flex gap-3">
          <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message the case team..." className="h-11 flex-1 rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/60" />
          <button onClick={sendMessage} className="rounded-md bg-[#20dc73] px-4 font-bold text-black">Send</button>
        </div>
        {sent ? <p className="mt-3 text-sm text-[#20dc73]">Message sent to the case conversation.</p> : null}
      </section>
    </main>
  )
}

function WorkspaceCard({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
      <Icon className="h-5 w-5 text-[#20dc73]" />
      <p className="mt-4 text-sm text-white/50">{label}</p>
      <p className="mt-1 text-3xl font-bold text-[#20dc73]">{value}</p>
    </div>
  )
}
