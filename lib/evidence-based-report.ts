export type EvidenceBasedSection = {
  section_type: string
  title: string
  content: string
  order_index: number
}

type RecordValue = Record<string, unknown>

export type EvidenceBasedInvestigation = {
  case: RecordValue | null
  entities: RecordValue[]
  relationships: RecordValue[]
  evidence: RecordValue[]
  observations: RecordValue[]
  timeline: RecordValue[]
  graph_provenance: RecordValue[]
  sources: RecordValue[]
}

export type EvidenceBasedDraft = {
  executive_summary: string
  sections: EvidenceBasedSection[]
}

function text(value: unknown, fallback = "Not recorded in the case workspace.") {
  const result = String(value ?? "").trim()
  return result || fallback
}

function optionalText(value: unknown) {
  const result = String(value ?? "").trim()
  return result || null
}

function displayDate(value: unknown) {
  const raw = optionalText(value)
  if (!raw) return "Not recorded in the case workspace."
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? raw : date.toISOString()
}

function stableReference(prefix: string, index: number) {
  return `[${prefix}${index + 1}]`
}

function linkedEvidenceReferences(
  graphProvenance: RecordValue[],
  evidence: RecordValue[],
  linkType: "entity_evidence" | "relationship_evidence",
  targetId: unknown,
) {
  const evidenceReferences = new Map(
    evidence.map((item, index) => [String(item.id || ""), stableReference("E", index)]),
  )
  const references = graphProvenance
    .filter((link) => link.link_type === linkType && String(link.graph_record_id || "") === String(targetId || ""))
    .map((link) => evidenceReferences.get(String(link.evidence_id || "")))
    .filter((reference): reference is string => Boolean(reference))

  return references.length ? references.join(", ") : "No supporting evidence association is recorded."
}

function section(
  order_index: number,
  section_type: string,
  title: string,
  content: string,
): EvidenceBasedSection {
  return { order_index, section_type, title, content }
}

export function buildEvidenceBasedDraft(
  investigation: EvidenceBasedInvestigation,
): EvidenceBasedDraft {
  const caseRecord = investigation.case || {}
  const caseReference = text(caseRecord.case_number, "Not recorded in the case workspace.")
  const caseTitle = text(caseRecord.title, "Untitled investigation")
  const entityLines = investigation.entities.map((entity, index) => {
    const reference = stableReference("N", index)
    return [
      `${reference} ${text(entity.name, "Unnamed entity")} (${text(entity.entity_type, "Unclassified entity")})`,
      `Value or label: ${text(entity.value)}`,
      `Verification status: ${text(entity.verification_status, "unreviewed")}`,
      `Description: ${text(entity.description)}`,
      `Supporting evidence: ${linkedEvidenceReferences(investigation.graph_provenance, investigation.evidence, "entity_evidence", entity.id)}`,
    ].join("\n")
  })
  const relationshipLines = investigation.relationships.map((relationship, index) => {
    const reference = stableReference("R", index)
    return [
      `${reference} ${text(relationship.source_entity_name, "Unidentified source entity")} -> ${text(relationship.relationship_type, "related to").replaceAll("_", " ")} -> ${text(relationship.target_entity_name, "Unidentified target entity")}`,
      `Verification status: ${text(relationship.verification_status, "unreviewed")}`,
      `Recorded description: ${text(relationship.description)}`,
      `Supporting evidence: ${linkedEvidenceReferences(investigation.graph_provenance, investigation.evidence, "relationship_evidence", relationship.id)}`,
      "Interpretation limit: this is a recorded graph relationship. It does not establish identity, ownership, control, or responsibility without independent verification.",
    ].join("\n")
  })
  const evidenceLines = investigation.evidence.map((evidence, index) => {
    const reference = stableReference("E", index)
    return [
      `${reference} ${text(evidence.file_name, "Unnamed evidence record")}`,
      `Evidence type: ${text(evidence.evidence_type, "Not recorded")}`,
      `SHA-256: ${text(evidence.file_hash, "Hash not recorded")}`,
      `Evidence registration/upload timestamp (not an incident date): ${displayDate(evidence.created_at)}`,
      "Collection timestamp: Not separately recorded in the report assembly input.",
      "Verification status: Not separately recorded in the report assembly input.",
      "Description: A controlled description is retained in the Evidence Vault and must be reviewed there under case access; this draft does not reproduce evidence content.",
    ].join("\n")
  })
  const correlationLines = investigation.graph_provenance
    .filter((link) => link.link_type === "entity_evidence" || link.link_type === "relationship_evidence")
    .map((link) => {
      const evidenceIndex = investigation.evidence.findIndex((item) => String(item.id || "") === String(link.evidence_id || ""))
      const reference = evidenceIndex >= 0 ? stableReference("E", evidenceIndex) : "an unavailable evidence record"
      const target = text(link.graph_record_name, "unnamed graph record")
      const targetType = link.link_type === "entity_evidence" ? "entity" : "relationship"
      return `${reference} is associated with recorded ${targetType} ${target}. This association records an investigator link and is not independent verification or authentication.`
    })
  const chronologyLines = investigation.timeline.map((event, index) => [
    `${stableReference("T", index)} ${displayDate(event.event_date)}`,
    `Recorded event: ${text(event.title, "Untitled timeline event")}`,
    `Recorded detail: ${text(event.description)}`,
    `Source reference: ${text(event.source_title)}`,
  ].join("\n"))
  const observationLines = investigation.observations.map((observation, index) => [
    `${stableReference("O", index)} ${text(observation.title, "Untitled observation")}`,
    `Type: ${text(observation.observation_type)}`,
    `Status: ${text(observation.status, "unreviewed")}`,
    `Confidence: ${text(observation.confidence_score, "Not scored")}`,
    "Recorded detail remains in the controlled case workspace for investigator review.",
  ].join("\n"))

  const executiveSummary = [
    `This is a deterministic evidence-based draft for ${caseReference} - ${caseTitle}.`,
    `It assembles ${investigation.evidence.length} evidence record(s), ${investigation.entities.length} entity record(s), ${investigation.relationships.length} relationship record(s), ${investigation.timeline.length} incident-timeline record(s), and ${investigation.observations.length} investigator observation(s) already stored in the case workspace.`,
    "It does not independently interpret evidence, verify identities, authenticate material, or reach conclusions beyond the recorded data. An authorized investigator must review, complete, and approve it before use.",
  ].join(" ")

  return {
    executive_summary: executiveSummary,
    sections: [
      section(10, "executive_summary", "Executive Summary", executiveSummary),
      section(20, "case_information", "Case Information", [
        `Case reference: ${caseReference}`,
        `Case title: ${caseTitle}`,
        `Case status: ${text(caseRecord.status)}`,
        `Service type: ${text(caseRecord.service_type)}`,
        `Investigation opening record: ${displayDate(caseRecord.started_at || caseRecord.created_at)}`,
        `Assigned operator: ${text(caseRecord.assigned_operator_name || caseRecord.assigned_operator_username)}`,
        "Case narrative: A narrative is recorded in the controlled case workspace when available and requires investigator review before publication.",
      ].join("\n")),
      section(30, "scope_and_objectives", "Investigation Scope and Objectives", "No structured scope or objectives field is available to this deterministic generator. Investigator review is required to document the authorized scope, questions, exclusions, and objectives for this report."),
      section(40, "methodology", "Investigation Methodology", [
        "This draft was deterministically assembled from authorized case metadata, graph records, evidence metadata, evidence-to-graph associations, documented incident timeline records, and recorded investigator observations.",
        "No external search, automated content interpretation, identity resolution, or independent verification was performed by this generator.",
        `Recorded intelligence sources available for review: ${investigation.sources.length}.`,
      ].join("\n")),
      section(50, "investigation_entities", "Investigation Entities", entityLines.length ? entityLines.join("\n\n") : "No investigation entities are currently recorded in the case workspace."),
      section(60, "relationship_analysis", "Relationship Analysis", relationshipLines.length ? relationshipLines.join("\n\n") : "No investigation relationships are currently recorded in the case workspace."),
      section(70, "evidence_register", "Evidence Register", evidenceLines.length ? evidenceLines.join("\n\n") : "No eligible evidence records are currently available in the case workspace."),
      section(80, "evidence_correlation", "Evidence Correlation", correlationLines.length ? correlationLines.join("\n\n") : "No evidence-to-graph associations are currently recorded. Evidence associations, when present, remain subject to investigator verification."),
      section(90, "incident_chronology", "Incident Chronology", chronologyLines.length ? chronologyLines.join("\n\n") : "No independently documented incident chronology is currently available in the case workspace."),
      section(100, "investigator_observations", "Investigator Observations", observationLines.length ? observationLines.join("\n\n") : "No investigator observations are currently recorded. This section requires investigator completion."),
      section(110, "findings_and_verification", "Findings and Verification Status", [
        `Documented observations: ${investigation.observations.length}.`,
        `Reported allegations or intake context: ${optionalText(caseRecord.description) ? "A case narrative is recorded and requires analyst review; it is not treated as a verified finding." : "Not recorded."}`,
        `Unverified associations: ${investigation.relationships.filter((relationship) => String(relationship.verification_status || "unreviewed").toLowerCase() !== "verified").length}.`,
        "Outstanding verification requirements: Review every referenced evidence record, verify graph relationships independently where required, and record supporting observations before reaching conclusions.",
      ].join("\n")),
      section(120, "investigation_limitations", "Investigation Limitations", [
        investigation.evidence.length ? "Evidence metadata and recorded hashes are included; this generator does not inspect, authenticate, or interpret evidence file contents." : "No eligible evidence records are available.",
        investigation.timeline.length ? "Timeline entries are presented as recorded. Their accuracy and source reliability require investigator review." : "No independently documented incident chronology is available.",
        "Evidence registration/upload timestamps are not incident occurrence dates.",
        "Graph associations do not independently establish identity, attribution, ownership, control, or liability.",
      ].join("\n")),
      section(130, "recommendations", "Recommendations and Next Steps", [
        "[ ] Confirm the authorized investigation scope and objectives.",
        "[ ] Review each evidence record in the Evidence Vault and confirm integrity, custody, and relevance.",
        "[ ] Review graph relationships and record independent verification where available.",
        "[ ] Record documented incident chronology separately from evidence upload activity.",
        "[ ] Complete, review, and approve this draft through the established report workflow.",
      ].join("\n")),
      section(140, "reference_appendix", "Evidence and Entity Reference Appendix", [
        `Entities: ${investigation.entities.map((item, index) => `${stableReference("N", index)} ${text(item.name, "Unnamed entity")}`).join("; ") || "None recorded."}`,
        `Relationships: ${investigation.relationships.map((item, index) => `${stableReference("R", index)} ${text(item.relationship_type, "related to").replaceAll("_", " ")}`).join("; ") || "None recorded."}`,
        `Evidence: ${investigation.evidence.map((item, index) => `${stableReference("E", index)} ${text(item.file_name, "Unnamed evidence record")}`).join("; ") || "None recorded."}`,
        `Timeline: ${investigation.timeline.map((item, index) => `${stableReference("T", index)} ${text(item.title, "Untitled timeline event")}`).join("; ") || "None recorded."}`,
        "References identify records available in this case workspace. They are not independent verification statements.",
      ].join("\n")),
    ],
  }
}
