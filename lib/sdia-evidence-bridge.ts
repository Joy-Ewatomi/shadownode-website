type Json = Record<string, unknown>

export const SDIA_VERIFICATION_UNAVAILABLE_REASON = "canonical_sdia_verifier_unavailable"
export const SDIA_VERIFICATION_STATES = {
  MIGRATION_UNAVAILABLE: "MIGRATION_UNAVAILABLE",
  BRIDGE_RECORD_UNAVAILABLE: "BRIDGE_RECORD_UNAVAILABLE",
  MISSING_EVIDENCE_REFERENCES: "MISSING_EVIDENCE_REFERENCES",
  CANONICAL_VERIFIER_UNAVAILABLE: "CANONICAL_VERIFIER_UNAVAILABLE",
  CANONICAL_VERIFICATION_COMPLETED: "CANONICAL_VERIFICATION_COMPLETED",
} as const
export type SdiaVerificationState = typeof SDIA_VERIFICATION_STATES[keyof typeof SDIA_VERIFICATION_STATES]

export type SdiaArtifactIndex = {
  artifact_id: string
  artifact_type: string | null
  source: string | null
  collected_at: string | null
  sha256: string | null
  collector: string | null
  collector_version: string | null
  classification: string | null
  parent_artifacts: string[]
  context: Json
  payload_locator: string
}

export type SdiaReportMetadata = {
  schema_version: string | null
  evidence_contract_version: string | null
  tool: string | null
  tool_version: string | null
  domain: string | null
  run_id: string | null
  investigation: Json
  evidence_manifest: Json
  producer_authenticity: string
  verification: Json
}

export type SdiaVerificationContext = {
  report_id: string
  source_record_id: string
  evidence_artifact_ids: string[]
  missing_artifact_ids: string[]
  artifacts: SdiaArtifactIndex[]
  report: SdiaReportMetadata | null
  verification_state?: SdiaVerificationState
  migration_available?: boolean
  bridge_record_available?: boolean
  source_classification?: string | null
}

function object(value: unknown): Json | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : null
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function strings(value: unknown) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map(text).filter(Boolean) as string[])]
}

function artifactIds(value: unknown) {
  return strings(value)
}

export function sdiaEvidenceArtifactIds(record: Json) {
  return artifactIds(record.evidence_artifacts ?? record.evidence_artifact_ids ?? record.artifact_ids)
}

export function sdiaReportMetadata(report: Json): SdiaReportMetadata {
  const investigation = object(report.investigation) || {}
  const manifest = object(report.evidence_manifest) || {}
  const verification = object(report.verification) || object(report.evidence_verification) || {
    status: "unavailable",
    reason: SDIA_VERIFICATION_UNAVAILABLE_REASON,
  }
  return {
    schema_version: text(report.schema_version),
    evidence_contract_version: text(report.evidence_contract_version) || text(report.contract_version) || text(manifest.contract_version),
    tool: text(report.tool),
    tool_version: text(report.tool_version),
    domain: text(investigation.domain) || text(report.domain),
    run_id: text(investigation.run_id) || text(report.run_id),
    investigation,
    evidence_manifest: manifest,
    producer_authenticity: text(report.producer_authenticity) || text(manifest.producer_authenticity) || "not_established",
    verification,
  }
}

export function sdiaArtifactIndex(report: Json): SdiaArtifactIndex[] {
  if (!Array.isArray(report.evidence)) return []
  return report.evidence.flatMap((value, index) => {
    const item = object(value)
    const artifactId = text(item?.artifact_id)
    if (!item || !artifactId) return []
    return [{
      artifact_id: artifactId,
      artifact_type: text(item.artifact_type),
      source: text(item.source),
      collected_at: text(item.collected_at),
      sha256: text(item.sha256),
      collector: text(item.collector),
      collector_version: text(item.collector_version),
      classification: text(item.classification),
      parent_artifacts: strings(item.parent_artifacts),
      context: object(item.context) || {},
      // Stored jobs wrap the authoritative report at findings.result.
      payload_locator: `result.evidence[${index}]`,
    }]
  })
}

export function resolveSdiaPayloadLocator(payload: unknown, locator: string): unknown {
  const match = /^(?:result\.)?evidence\[(\d+)\]$/.exec(locator)
  if (!match) return undefined
  const envelope = object(payload)
  const report = locator.startsWith("result.") ? object(envelope?.result) : object(envelope?.result) || envelope
  const evidence = report?.evidence
  return Array.isArray(evidence) ? evidence[Number(match[1])] : undefined
}

export function sdiaMissingArtifactIds(ids: string[], artifacts: SdiaArtifactIndex[]) {
  const known = new Set(artifacts.map((item) => item.artifact_id))
  return ids.filter((id) => !known.has(id))
}

function redactRawArtifact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactRawArtifact)
  const item = object(value)
  if (!item) return value
  return Object.fromEntries(Object.entries(item).flatMap(([key, child]) => {
    if (["body_base64", "body", "raw_body", "response_body"].includes(key)) return []
    return [[key, redactRawArtifact(child)]]
  }))
}

export function redactSdiaResultForClient(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSdiaResultForClient)
  const item = object(value)
  if (!item) return value
  const sourceResponse = item.artifact_type === "rdap_source_response"
  return Object.fromEntries(Object.entries(item).flatMap(([key, child]) => {
    if (sourceResponse && key === "data") {
      const data = object(child)
      return [[key, data ? redactRawArtifact(data) : child]]
    }
    if (sourceResponse && ["body_base64", "body", "raw_body", "response_body"].includes(key)) return []
    return [[key, redactSdiaResultForClient(child)]]
  }))
}

export function sdiaCanonicalVerificationCompleted(report: SdiaReportMetadata | null) {
  const status = text(report?.verification?.status)?.toLowerCase()
  return status === "completed" || status === "verified" || status === "valid"
}

export function sdiaVerificationState(input: {
  migration_available?: boolean
  bridge_record_available?: boolean
  missing_artifact_ids?: string[]
  report?: SdiaReportMetadata | null
}): SdiaVerificationState {
  if (input.migration_available === false) return SDIA_VERIFICATION_STATES.MIGRATION_UNAVAILABLE
  if (input.bridge_record_available === false) return SDIA_VERIFICATION_STATES.BRIDGE_RECORD_UNAVAILABLE
  if ((input.missing_artifact_ids || []).length) return SDIA_VERIFICATION_STATES.MISSING_EVIDENCE_REFERENCES
  if (sdiaCanonicalVerificationCompleted(input.report || null)) return SDIA_VERIFICATION_STATES.CANONICAL_VERIFICATION_COMPLETED
  return SDIA_VERIFICATION_STATES.CANONICAL_VERIFIER_UNAVAILABLE
}

function outputClassification(value: string | null | undefined) {
  const normalized = text(value)?.toLowerCase()
  if (normalized === "observed") return "OBSERVED"
  if (normalized === "derived") return "DERIVED"
  return "UNCLASSIFIED"
}

export function sdiaUnavailableVerification(target: {
  id: string
  case_id: string
  target_type: "entity" | "relationship"
  classification: string | null
  confidence_score: number | null
  stale_at: string | null
}, context: SdiaVerificationContext): Json {
  const evidenceIds = context.evidence_artifact_ids
  const missingIds = context.missing_artifact_ids
  const report = context.report
  const verificationState = context.verification_state || sdiaVerificationState({
    migration_available: context.migration_available,
    bridge_record_available: context.bridge_record_available,
    missing_artifact_ids: missingIds,
    report,
  })
  const summaries = context.artifacts.map((artifact) => ({
    artifact_id: artifact.artifact_id,
    artifact_type: artifact.artifact_type,
    source: artifact.source,
    collected_at: artifact.collected_at,
    sha256: artifact.sha256,
    collector: artifact.collector,
    collector_version: artifact.collector_version,
    classification: artifact.classification,
    parent_artifacts: artifact.parent_artifacts,
  }))
  const limitations = [
    verificationState === SDIA_VERIFICATION_STATES.MIGRATION_UNAVAILABLE
      ? "The SDIA evidence bridge migration is unavailable in this database."
      : verificationState === SDIA_VERIFICATION_STATES.BRIDGE_RECORD_UNAVAILABLE
        ? "No SDIA evidence bridge record is available for this report."
        : verificationState === SDIA_VERIFICATION_STATES.MISSING_EVIDENCE_REFERENCES
          ? "The SDIA graph item references evidence artifacts that are not all present in the preserved report."
          : verificationState === SDIA_VERIFICATION_STATES.CANONICAL_VERIFICATION_COMPLETED
            ? "The preserved SDIA report records completed canonical verification; this website does not independently reproduce that verification."
            : "The canonical SDIA evidence verifier is unavailable in this repository.",
    "The preserved artifact references and hashes have not been independently verified here.",
    "Producer authenticity is not established by this response.",
    target.target_type === "relationship" ? "This does not establish ownership, administrative control, or organizational affiliation." : "This does not establish ownership, control, attribution, or legal admissibility.",
  ]
  if (missingIds.length) limitations.push("One or more graph evidence references are absent from the preserved SDIA report.")
  return {
    status: "INSUFFICIENT_EVIDENCE",
    verification_availability: "UNAVAILABLE",
    classification: outputClassification(context.source_classification),
    source_classification: context.source_classification || null,
    handling_classification: target.classification,
    entity_or_relationship_id: target.id,
    target_type: target.target_type,
    summary: verificationState === SDIA_VERIFICATION_STATES.CANONICAL_VERIFICATION_COMPLETED
      ? "The preserved SDIA report records completed canonical verification; local evidence verification is reported separately."
      : "The SDIA report and evidence references are preserved, but this website cannot complete canonical evidence verification.",
    sdia_verification_state: verificationState,
    checks: [
      { check: "sdia_evidence_references_preserved", passed: evidenceIds.length > 0 && missingIds.length === 0, severity: evidenceIds.length && !missingIds.length ? "info" : "warning", message: evidenceIds.length ? `${evidenceIds.length} SDIA evidence reference(s) are preserved.` : "No SDIA evidence references are available for this graph item.", related_artifact_ids: evidenceIds },
      { check: "sdia_canonical_verifier_available", passed: false, severity: "warning", message: verificationState === SDIA_VERIFICATION_STATES.CANONICAL_VERIFICATION_COMPLETED ? "This website did not independently reproduce the canonical SDIA verification recorded by the report." : "Canonical SDIA evidence verification is unavailable.", related_artifact_ids: evidenceIds },
      { check: "sdia_producer_authenticity", passed: false, severity: "warning", message: "Producer authenticity is not established by a matching digest or this bridge." },
    ],
    evidence_artifacts: evidenceIds,
    parent_artifacts: summaries.flatMap((item) => item.parent_artifacts),
    sdia_artifacts: summaries,
    integrity: { status: "UNAVAILABLE", valid: false, checked: 0, failed: 0, unavailable: Math.max(1, evidenceIds.length) },
    provenance: { status: report ? "LIMITED" : "MISSING", valid: false, sources: summaries.map((item) => item.source).filter(Boolean) },
    report_manifest_consistency: { status: report?.evidence_manifest && Object.keys(report.evidence_manifest).length ? "UNAVAILABLE" : "MISSING", reason: report ? SDIA_VERIFICATION_UNAVAILABLE_REASON : "sdia_report_metadata_unavailable" },
    producer_authenticity: report?.producer_authenticity || "not_established",
    report_identity: { report_id: context.report_id, source_record_id: context.source_record_id, schema_version: report?.schema_version || null, evidence_contract_version: report?.evidence_contract_version || null, run_id: report?.run_id || null },
    currency: target.stale_at ? new Date(target.stale_at).getTime() <= Date.now() ? "STALE" : "CURRENT" : "UNKNOWN",
    confidence: { score: target.confidence_score, label: target.confidence_score == null ? "UNSCORED" : target.confidence_score >= 75 ? "HIGH" : target.confidence_score >= 45 ? "MEDIUM" : "LOW", contextual_only: true },
    collection_timestamps: summaries.map((item) => item.collected_at).filter(Boolean),
    source_information: summaries.map((item) => item.source).filter(Boolean),
    conclusion: verificationState === SDIA_VERIFICATION_STATES.CANONICAL_VERIFICATION_COMPLETED
      ? "The preserved SDIA report records canonical verification; producer authenticity and local evidence support remain separately qualified."
      : "The preserved SDIA material cannot safely establish this graph claim until the canonical verifier is available.",
    limitations,
  }
}
