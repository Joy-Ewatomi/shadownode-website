"use client"

import { FileText, Loader2, Trash2 } from "lucide-react"

export type EvidenceAssociation = {
  association_id: string
  target_type: "entity" | "relationship"
  target_id: string
  target_label: string
  evidence_id: string
  evidence_file_name: string
  evidence_type: string | null
  evidence_description: string | null
  evidence_sha256: string | null
  created_at: string
  created_by: string | null
  created_by_username: string | null
}

export default function EvidenceAssociationList({
  associations,
  view,
  onRemove,
  removingAssociationId,
}: {
  associations: EvidenceAssociation[]
  view: "supporting" | "linked"
  onRemove?: (association: EvidenceAssociation) => void
  removingAssociationId?: string | null
}) {
  const isSupportingEvidence = view === "supporting"

  if (!associations.length) {
    return (
      <p className="mt-3 text-xs leading-5 text-white/40">
        {isSupportingEvidence
          ? "No evidence is linked to this graph record."
          : "This evidence is not linked to a graph entity or relationship."}
      </p>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      {associations.map((association) => {
        const label = isSupportingEvidence
          ? association.evidence_file_name
          : association.target_label
        const supportingText = isSupportingEvidence
          ? association.evidence_description
          : `${association.target_type === "entity" ? "Entity" : "Relationship"} · ${association.target_id.slice(0, 8)}`

        return (
          <article
            key={association.association_id}
            className="rounded-md border border-[#143b28] bg-black/25 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-semibold text-white">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-[#20dc73]" />
                  <span className="truncate">{label}</span>
                </p>
                <p className="mt-1 text-[11px] text-white/45">
                  {isSupportingEvidence
                    ? association.evidence_type || "evidence"
                    : supportingText}
                  {isSupportingEvidence && association.evidence_id
                    ? ` · ${association.evidence_id.slice(0, 8)}`
                    : ""}
                </p>
              </div>

              {onRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(association)}
                  disabled={removingAssociationId === association.association_id}
                  title="Remove evidence association"
                  aria-label={`Remove association for ${label}`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded border border-red-400/30 text-red-300 transition hover:bg-red-400/10 disabled:opacity-40"
                >
                  {removingAssociationId === association.association_id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              ) : null}
            </div>

            {isSupportingEvidence && association.evidence_description ? (
              <p className="mt-2 text-xs leading-5 text-white/55">
                {association.evidence_description}
              </p>
            ) : null}

            <p className="mt-2 text-[11px] text-white/35">
              Linked {new Date(association.created_at).toLocaleString()}
              {association.created_by_username
                ? ` by ${association.created_by_username}`
                : ""}
            </p>
          </article>
        )
      })}
    </div>
  )
}
