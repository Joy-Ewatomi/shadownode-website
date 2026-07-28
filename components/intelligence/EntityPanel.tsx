"use client"

import { FileSearch, Link2, MessageSquareText, Network } from "lucide-react"

type Relationship = {
  id: string
  source_entity_id: string
  source_entity_name?: string | null
  target_entity_id: string
  target_entity_name?: string | null
  relationship_type: string | null
  confidence_score: number | null
}

type Source = {
  id: string
  source_name: string | null
  url: string | null
  reliability_score: number | null
}

type Note = {
  id: string
  entity_id: string
  note: string | null
  username: string | null
  created_at: string
}

type Evidence = {
  id: string
  file_name: string | null
  status: string | null
}

type Entity = {
  id: string
  name: string
  entity_type: string | null
  description: string | null
  confidence_score: number | null
  verification_status: string | null
  linked_evidence?: Evidence[]
  sources?: Source[]
}

export default function EntityPanel({
  entity,
  relationships,
  notes,
}: {
  entity: Entity
  relationships: Relationship[]
  notes: Note[]
}) {
  const connected = relationships.filter(
    (relationship) => relationship.source_entity_id === entity.id || relationship.target_entity_id === entity.id,
  )
  const entityNotes = notes.filter((note) => note.entity_id === entity.id)

  return (
    <article className="rounded-md border border-[#143b28] bg-black/25 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{entity.name}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#20dc73]">{entity.entity_type || "UNKNOWN"}</p>
        </div>
        <span className="rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-[#20dc73]">
          {entity.confidence_score ?? 0}% confidence
        </span>
      </div>

      <p className="mt-3 text-sm text-white/60">{entity.description || "No entity description recorded."}</p>
      <p className="mt-2 text-xs text-white/40">Status: {entity.verification_status || "unverified"}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <InfoBlock icon={Network} label="Connected Relationships">
          {connected.length ? connected.map((relationship) => {
            const other = relationship.source_entity_id === entity.id
              ? relationship.target_entity_name
              : relationship.source_entity_name

            return (
              <p key={relationship.id} className="text-xs text-white/55">
                {relationship.relationship_type || "relationship"} with {other || "unknown"} · {relationship.confidence_score ?? 0}%
              </p>
            )
          }) : <p className="text-xs text-white/40">No relationships linked.</p>}
        </InfoBlock>

        <InfoBlock icon={FileSearch} label="Linked Evidence">
          {entity.linked_evidence?.length ? entity.linked_evidence.map((item) => (
            <p key={item.id} className="text-xs text-white/55">{item.file_name || "Evidence file"} · {item.status || "submitted"}</p>
          )) : <p className="text-xs text-white/40">No linked evidence detected.</p>}
        </InfoBlock>

        <InfoBlock icon={Link2} label="Sources">
          {entity.sources?.length ? entity.sources.map((source) => (
            <p key={source.id} className="break-all text-xs text-white/55">
              {source.source_name || "Unnamed source"} · {source.reliability_score ?? 0}%
            </p>
          )) : <p className="text-xs text-white/40">No sources linked.</p>}
        </InfoBlock>

        <InfoBlock icon={MessageSquareText} label="Analyst Notes">
          {entityNotes.length ? entityNotes.slice(0, 3).map((note) => (
            <p key={note.id} className="text-xs text-white/55">
              {note.note} <span className="text-white/35">by {note.username || "analyst"}</span>
            </p>
          )) : <p className="text-xs text-white/40">No notes yet.</p>}
        </InfoBlock>
      </div>
    </article>
  )
}

function InfoBlock({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Network
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
