export type ReportDraftingMaterial = {
  case_present: boolean
  entity_count: number
  relationship_count: number
  source_count: number
  observation_count: number
  timeline_count: number
  evidence_count: number
  graph_provenance_count: number
  case_activity_count: number
  note_count: number
}

export type ReportDraftingReadiness = ReportDraftingMaterial & {
  ready: boolean
  score: number
  mode: "preliminary" | "evidence_backed"
  limitations: string[]
}

export function calculateReportDraftingReadiness(
  material: ReportDraftingMaterial,
): ReportDraftingReadiness {
  const hasGraph = material.entity_count > 0 || material.relationship_count > 0
  const hasChronology = material.timeline_count > 0
  const hasContext =
    material.source_count > 0 ||
    material.observation_count > 0 ||
    material.case_activity_count > 0 ||
    material.note_count > 0

  const score =
    (material.case_present ? 25 : 0) +
    (material.evidence_count > 0 ? 25 : 0) +
    (hasGraph ? 25 : 0) +
    (hasContext || hasChronology ? 25 : 0)

  const limitations: string[] = []
  if (material.evidence_count === 0) {
    limitations.push("No uploaded evidence metadata is available; the draft is limited to recorded case and investigative information.")
  }
  if (!hasGraph) {
    limitations.push("No graph entities or relationships are available for correlation.")
  }
  if (!hasChronology) {
    limitations.push("No directly documented incident-timeline events are available. Evidence record timestamps must not be treated as incident dates.")
  }
  if (material.source_count === 0) {
    limitations.push("No intelligence source records are available. This does not prevent a preliminary draft.")
  }
  if (material.observation_count === 0) {
    limitations.push("No separately recorded investigator observations are available. Unverified material remains labeled as such.")
  }
  if (material.graph_provenance_count === 0 && hasGraph && material.evidence_count > 0) {
    limitations.push("No evidence-to-graph associations are available; graph records must not be presented as supported by evidence without separate documentation.")
  }

  return {
    ...material,
    ready: material.case_present,
    score,
    mode: material.evidence_count > 0 || hasGraph ? "evidence_backed" : "preliminary",
    limitations,
  }
}
