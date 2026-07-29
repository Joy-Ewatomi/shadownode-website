"use client"

import { Edit3, Link2, Save, Trash2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useCaseWorkspace } from "@/lib/realtime/useCaseWorkspace"
import WorkspaceActivityFeed from "./WorkspaceActivityFeed"
import WorkspacePresence from "./WorkspacePresence"

type Entity = {
  id: string
  entity_type: string | null
  name: string
  description: string | null
  aliases: string[] | null
  verification_status: string | null
  confidence_score: number | null
}

type Relationship = {
  id: string
  source_entity_id: string
  source_entity_name: string | null
  target_entity_id: string
  target_entity_name: string | null
  relationship_type: string | null
  description: string | null
  confidence_score: number | null
  verification_status: string | null
}

type Source = {
  id: string
  source_type: string | null
  title: string | null
  url: string | null
  description: string | null
  reliability_score: number | null
  collected_by_username?: string | null
  collected_at: string | null
}

type Observation = {
  id: string
  observation_type: string | null
  title: string | null
  description: string | null
  confidence_score: number | null
  status: string | null
  reviewed_by_username?: string | null
  reviewed_at: string | null
  created_at: string
}

type IntelligenceData = {
  entities: Entity[]
  relationships: Relationship[]
  sources: Source[]
  observations: Observation[]
}

const emptyEntity = { entity_type: "", name: "", description: "", aliases: "", verification_status: "unverified", confidence_score: 70 }
const emptyRelationship = { source_entity_id: "", target_entity_id: "", relationship_type: "", description: "", verification_status: "unverified", confidence_score: 70 }
const emptySource = { source_type: "OSINT", title: "", url: "", description: "", reliability_score: 70, collected_at: "" }
const emptyObservation = { observation_type: "analysis", title: "", description: "", confidence_score: 70, status: "draft" }

export default function InvestigationWorkspaceFoundation({ caseId }: { caseId: string }) {
  const [data, setData] = useState<IntelligenceData>({ entities: [], relationships: [], sources: [], observations: [] })
  const [view, setView] = useState<"entities" | "relationships" | "sources" | "observations">("entities")
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<{ type: string; id: string } | null>(null)
  const [entityForm, setEntityForm] = useState(emptyEntity)
  const [relationshipForm, setRelationshipForm] = useState(emptyRelationship)
  const [sourceForm, setSourceForm] = useState(emptySource)
  const [observationForm, setObservationForm] = useState(emptyObservation)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/cases/${caseId}/intelligence`, { credentials: "include" })
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [caseId])

  const realtimeCallbacks = useMemo(() => ({
    onEvent: () => {
      load()
    },
  }), [load])
  const realtime = useCaseWorkspace(caseId, realtimeCallbacks)

  async function save(type: string, payload: Record<string, unknown>) {
    const method = editing?.type === type ? "PATCH" : "POST"
    const res = await fetch(`/api/cases/${caseId}/intelligence`, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...(editing?.type === type ? { id: editing.id } : {}), ...payload }),
    })
    if (res.ok) {
      setEditing(null)
      await load()
    }
    return res.ok
  }

  async function remove(type: string, id: string) {
    const res = await fetch(`/api/cases/${caseId}/intelligence`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    })
    if (res.ok) await load()
  }

  useEffect(() => {
    if (caseId) load()
  }, [caseId, load])

  const tabs = useMemo(() => [
    ["entities", `Entities (${data.entities.length})`],
    ["relationships", `Relationships (${data.relationships.length})`],
    ["sources", `Sources (${data.sources.length})`],
    ["observations", `Observations (${data.observations.length})`],
  ] as const, [data])

  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">Investigation Workspace</p>
          <h2 className="mt-1 font-semibold text-white">Collaborative Intelligence Data Layer</h2>
        </div>
        <div className="flex flex-wrap rounded-md border border-[#143b28] bg-black/25 p-1">
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => setView(key)} className={`rounded px-3 py-2 text-xs font-semibold ${view === key ? "bg-[#20dc73] text-black" : "text-white/55 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <WorkspacePresence users={realtime.presence} status={realtime.status} />
        <WorkspaceActivityFeed events={realtime.events} />
      </div>

      {loading ? <p className="mt-5 text-sm text-white/45">Loading investigation data...</p> : null}

      {view === "entities" ? (
        <CrudGrid
          form={<EntityForm form={entityForm} setForm={setEntityForm} onSave={async () => {
            if (!entityForm.name.trim()) return
            if (await save("entity", entityForm)) setEntityForm(emptyEntity)
          }} editing={editing?.type === "entity"} />}
          list={data.entities.map((entity) => (
            <RecordCard key={entity.id} title={entity.name} subtitle={`${entity.entity_type || "unknown"} · ${entity.confidence_score ?? 0}% · ${entity.verification_status || "unverified"}`} description={entity.description} onEdit={() => {
              setEditing({ type: "entity", id: entity.id })
              setEntityForm({ entity_type: entity.entity_type || "", name: entity.name, description: entity.description || "", aliases: (entity.aliases || []).join(", "), verification_status: entity.verification_status || "unverified", confidence_score: Number(entity.confidence_score ?? 0) })
            }} onDelete={() => remove("entity", entity.id)} />
          ))}
          empty="No investigation entities recorded."
        />
      ) : null}

      {view === "relationships" ? (
        <CrudGrid
          form={<RelationshipForm form={relationshipForm} setForm={setRelationshipForm} entities={data.entities} onSave={async () => {
            if (!relationshipForm.source_entity_id || !relationshipForm.target_entity_id) return
            if (await save("relationship", relationshipForm)) setRelationshipForm(emptyRelationship)
          }} editing={editing?.type === "relationship"} />}
          list={data.relationships.map((relationship) => (
            <RecordCard key={relationship.id} title={`${relationship.source_entity_name || "Source"} to ${relationship.target_entity_name || "Target"}`} subtitle={`${relationship.relationship_type || "relationship"} · ${relationship.confidence_score ?? 0}% · ${relationship.verification_status || "unverified"}`} description={relationship.description} onEdit={() => {
              setEditing({ type: "relationship", id: relationship.id })
              setRelationshipForm({ source_entity_id: relationship.source_entity_id, target_entity_id: relationship.target_entity_id, relationship_type: relationship.relationship_type || "", description: relationship.description || "", verification_status: relationship.verification_status || "unverified", confidence_score: Number(relationship.confidence_score ?? 0) })
            }} onDelete={() => remove("relationship", relationship.id)} />
          ))}
          empty="No entity relationships recorded."
        />
      ) : null}

      {view === "sources" ? (
        <CrudGrid
          form={<SourceForm form={sourceForm} setForm={setSourceForm} onSave={async () => {
            if (!sourceForm.title.trim()) return
            if (await save("source", sourceForm)) setSourceForm(emptySource)
          }} editing={editing?.type === "source"} />}
          list={data.sources.map((source) => (
            <RecordCard key={source.id} title={source.title || "Untitled source"} subtitle={`${source.source_type || "source"} · ${source.reliability_score ?? 0}% reliable · ${source.collected_by_username || "operator"}`} description={source.description} url={source.url} onEdit={() => {
              setEditing({ type: "source", id: source.id })
              setSourceForm({ source_type: source.source_type || "", title: source.title || "", url: source.url || "", description: source.description || "", reliability_score: Number(source.reliability_score ?? 0), collected_at: source.collected_at ? source.collected_at.slice(0, 16) : "" })
            }} onDelete={() => remove("source", source.id)} />
          ))}
          empty="No intelligence sources recorded."
        />
      ) : null}

      {view === "observations" ? (
        <CrudGrid
          form={<ObservationForm form={observationForm} setForm={setObservationForm} onSave={async () => {
            if (!observationForm.title.trim() || !observationForm.description.trim()) return
            if (await save("observation", observationForm)) setObservationForm(emptyObservation)
          }} editing={editing?.type === "observation"} />}
          list={data.observations.map((observation) => (
            <RecordCard key={observation.id} title={observation.title || "Untitled observation"} subtitle={`${observation.observation_type || "observation"} · ${observation.confidence_score ?? 0}% · ${observation.status || "draft"}`} description={observation.description} onEdit={() => {
              setEditing({ type: "observation", id: observation.id })
              setObservationForm({ observation_type: observation.observation_type || "", title: observation.title || "", description: observation.description || "", confidence_score: Number(observation.confidence_score ?? 0), status: observation.status || "draft" })
            }} onDelete={() => remove("observation", observation.id)} />
          ))}
          empty="No analyst observations recorded."
        />
      ) : null}
    </section>
  )
}

function CrudGrid({ form, list, empty }: { form: React.ReactNode; list: React.ReactNode[]; empty: string }) {
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[20rem_1fr]">
      <div className="rounded-md border border-[#143b28] bg-black/20 p-4">{form}</div>
      <div className="space-y-3">{list.length ? list : <p className="text-sm text-white/45">{empty}</p>}</div>
    </div>
  )
}

function Field({ value, onChange, placeholder, type = "text" }: { value: string | number; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none" />
}

function TextArea({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-24 w-full rounded border border-[#143b28] bg-black px-3 py-2 text-sm text-white outline-none" />
}

function SaveButton({ editing, onClick }: { editing: boolean; onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-[#20dc73] font-bold text-black"><Save className="h-4 w-4" />{editing ? "Save Changes" : "Create"}</button>
}

function EntityForm({ form, setForm, onSave, editing }: { form: typeof emptyEntity; setForm: (form: typeof emptyEntity) => void; onSave: () => void; editing: boolean }) {
  return <FormShell title={editing ? "Edit Entity" : "Create Entity"} onSave={onSave} editing={editing}>
    <Field value={form.name} onChange={(name) => setForm({ ...form, name })} placeholder="Name" />
    <Field value={form.entity_type} onChange={(entity_type) => setForm({ ...form, entity_type })} placeholder="Entity type" />
    <Field value={form.aliases} onChange={(aliases) => setForm({ ...form, aliases })} placeholder="Aliases, comma separated" />
    <Field value={form.verification_status} onChange={(verification_status) => setForm({ ...form, verification_status })} placeholder="Verification status" />
    <Score value={form.confidence_score} onChange={(confidence_score) => setForm({ ...form, confidence_score })} label="Confidence" />
    <TextArea value={form.description} onChange={(description) => setForm({ ...form, description })} placeholder="Description" />
  </FormShell>
}

function RelationshipForm({ form, setForm, entities, onSave, editing }: { form: typeof emptyRelationship; setForm: (form: typeof emptyRelationship) => void; entities: Entity[]; onSave: () => void; editing: boolean }) {
  return <FormShell title={editing ? "Edit Relationship" : "Create Relationship"} onSave={onSave} editing={editing}>
    <EntitySelect value={form.source_entity_id} onChange={(source_entity_id) => setForm({ ...form, source_entity_id })} entities={entities} label="Source entity" />
    <EntitySelect value={form.target_entity_id} onChange={(target_entity_id) => setForm({ ...form, target_entity_id })} entities={entities} label="Target entity" />
    <Field value={form.relationship_type} onChange={(relationship_type) => setForm({ ...form, relationship_type })} placeholder="Relationship type" />
    <Field value={form.verification_status} onChange={(verification_status) => setForm({ ...form, verification_status })} placeholder="Verification status" />
    <Score value={form.confidence_score} onChange={(confidence_score) => setForm({ ...form, confidence_score })} label="Confidence" />
    <TextArea value={form.description} onChange={(description) => setForm({ ...form, description })} placeholder="Description" />
  </FormShell>
}

function SourceForm({ form, setForm, onSave, editing }: { form: typeof emptySource; setForm: (form: typeof emptySource) => void; onSave: () => void; editing: boolean }) {
  return <FormShell title={editing ? "Edit Source" : "Create Source"} onSave={onSave} editing={editing}>
    <Field value={form.title} onChange={(title) => setForm({ ...form, title })} placeholder="Title" />
    <Field value={form.source_type} onChange={(source_type) => setForm({ ...form, source_type })} placeholder="Source type" />
    <Field value={form.url} onChange={(url) => setForm({ ...form, url })} placeholder="URL" />
    <Field type="datetime-local" value={form.collected_at} onChange={(collected_at) => setForm({ ...form, collected_at })} placeholder="Collected at" />
    <Score value={form.reliability_score} onChange={(reliability_score) => setForm({ ...form, reliability_score })} label="Reliability" />
    <TextArea value={form.description} onChange={(description) => setForm({ ...form, description })} placeholder="Description" />
  </FormShell>
}

function ObservationForm({ form, setForm, onSave, editing }: { form: typeof emptyObservation; setForm: (form: typeof emptyObservation) => void; onSave: () => void; editing: boolean }) {
  return <FormShell title={editing ? "Edit Observation" : "Create Observation"} onSave={onSave} editing={editing}>
    <Field value={form.title} onChange={(title) => setForm({ ...form, title })} placeholder="Title" />
    <Field value={form.observation_type} onChange={(observation_type) => setForm({ ...form, observation_type })} placeholder="Observation type" />
    <Field value={form.status} onChange={(status) => setForm({ ...form, status })} placeholder="Status" />
    <Score value={form.confidence_score} onChange={(confidence_score) => setForm({ ...form, confidence_score })} label="Confidence" />
    <TextArea value={form.description} onChange={(description) => setForm({ ...form, description })} placeholder="Description" />
  </FormShell>
}

function FormShell({ title, children, onSave, editing }: { title: string; children: React.ReactNode; onSave: () => void; editing: boolean }) {
  return <div>
    <h3 className="font-semibold text-white">{title}</h3>
    <div className="mt-4 space-y-3">{children}<SaveButton editing={editing} onClick={onSave} /></div>
  </div>
}

function EntitySelect({ value, onChange, entities, label }: { value: string; onChange: (value: string) => void; entities: Entity[]; label: string }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none">
    <option value="">{label}</option>
    {entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
  </select>
}

function Score({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
  return <label className="block text-xs text-white/45">{label}: {value}%<input type="range" min="0" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full" /></label>
}

function RecordCard({ title, subtitle, description, url, onEdit, onDelete }: { title: string; subtitle: string; description?: string | null; url?: string | null; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="rounded-md border border-[#143b28] bg-black/25 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#20dc73]">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#20dc73]/30 text-[#20dc73] hover:bg-[#20dc73]/10" aria-label="Edit"><Edit3 className="h-4 w-4" /></button>
          <button onClick={onDelete} className="inline-flex h-8 w-8 items-center justify-center rounded border border-red-400/30 text-red-200 hover:bg-red-400/10" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      {url ? <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-flex max-w-full items-center gap-2 break-all text-xs text-[#20dc73]"><Link2 className="h-4 w-4 shrink-0" />{url}</a> : null}
      <p className="mt-3 text-sm text-white/60">{description || "No description recorded."}</p>
    </article>
  )
}
