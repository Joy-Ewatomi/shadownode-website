import { NextRequest, NextResponse } from "next/server"
import type { QueryResultRow } from "pg"

import { query } from "@/lib/db"
import { requireCaseOperationalAccess } from "@/lib/investigation-workspace"
import { verifyIntelligenceClaim, type VerificationArtifact, type VerificationClaim } from "@/lib/intelligence-verifier"
import { downloadEvidenceFile } from "@/lib/services/storage-service"
import { parseSdiaJobPayload } from "@/lib/sdia-analysis-jobs"
import { sdiaArtifactIndex, sdiaEvidenceArtifactIds, sdiaMissingArtifactIds, sdiaReportMetadata, sdiaUnavailableVerification, sdiaVerificationState, type SdiaReportMetadata, type SdiaVerificationContext } from "@/lib/sdia-evidence-bridge"

type Json = Record<string, unknown>
type TargetRow = {
  id: string
  case_id: string
  target_type: "entity" | "relationship"
  entity_type: string | null
  value: string | null
  source_value: string | null
  target_value: string | null
  relationship_type: string | null
  classification: string | null
  confidence_score: number | null
  source_reference: string | null
  source_entity_id: string | null
  target_entity_id: string | null
  source_entity_type: string | null
  target_entity_type: string | null
  stale_at: string | null
}

function parseJsonContent(buffer: Buffer, fileType: string | null) {
  const text = buffer.toString("utf8")
  if (fileType?.includes("json") || /^[\s]*[\[{]/.test(text)) {
    try { return { data: JSON.parse(text), raw: buffer } } catch { return { data: text, raw: buffer } }
  }
  if (fileType?.startsWith("text/") || fileType?.includes("xml") || fileType?.includes("csv")) return { data: text, raw: buffer }
  return { data: { binary_file: true }, raw: buffer }
}

function asObject(value: unknown): Json | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : null
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function findSdiaRecord(result: Json, sourceReference: string) {
  const externalId = sourceReference.split(":").slice(1).join(":")
  for (const key of ["entities", "relationships", "findings", "evidence", "artifacts"]) {
    const items = Array.isArray(result[key]) ? result[key] as unknown[] : []
    const match = items.find((item) => {
      const record = asObject(item)
      return record && [record.id, record.entity_id, record.relationship_id, record.finding_id, record.artifact_id].some((id) => String(id || "") === externalId)
    })
    if (match) return match
  }
  return null
}

function strings(value: unknown) {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()))] : []
}

async function optionalMigrationQuery<T extends QueryResultRow>(sql: string, params: unknown[]) {
  try {
    const result = await query<T>(sql, params)
    return { available: true, rows: result.rows }
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "42P01") return { available: false, rows: [] as T[] }
    throw error
  }
}

async function loadSdiaContext(target: TargetRow, caseId: string): Promise<SdiaVerificationContext | null> {
  if (!target.source_reference || !/^[0-9a-f-]{36}:/i.test(target.source_reference)) return null
  const separator = target.source_reference.indexOf(":")
  const jobId = target.source_reference.slice(0, separator)
  const sourceRecordId = target.source_reference.slice(separator + 1)
  const job = await query<{ findings: string }>("SELECT findings FROM analysis_results WHERE id=$1 AND case_id=$2 AND severity='completed' LIMIT 1", [jobId, caseId])
  const payload = parseSdiaJobPayload(job.rows[0]?.findings)
  const result = asObject(payload?.result)
  if (!result) return null
  const record = findSdiaRecord(result, target.source_reference)
  const reportResult = await optionalMigrationQuery<{
    analysis_result_id: string
    schema_version: string | null
    evidence_contract_version: string | null
    tool: string | null
    tool_version: string | null
    domain: string | null
    run_id: string | null
    investigation: unknown
    evidence_manifest: unknown
    producer_authenticity: string | null
    verification: unknown
  }>(
    `SELECT analysis_result_id, schema_version, evidence_contract_version, tool, tool_version,
            domain, run_id, investigation, evidence_manifest, producer_authenticity, verification
       FROM sdia_analysis_reports WHERE analysis_result_id=$1 AND case_id=$2 LIMIT 1`,
    [jobId, caseId],
  )
  const artifactResult = await optionalMigrationQuery<{
    artifact_id: string
    artifact_type: string | null
    source: string | null
    collected_at: string | null
    sha256: string | null
    collector: string | null
    collector_version: string | null
    classification: string | null
    parent_artifacts: unknown
    context: unknown
    payload_locator: string
  }>(
    `SELECT artifact_id, artifact_type, source, collected_at, sha256, collector, collector_version,
            classification, parent_artifacts, context, payload_locator
       FROM sdia_evidence_artifacts WHERE report_id=$1 ORDER BY artifact_id ASC`,
    [jobId],
  )
  const provenanceResult = await optionalMigrationQuery<{
    report_id: string
    source_record_id: string
    evidence_artifact_ids: unknown
    missing_artifact_ids: unknown
  }>(
    `SELECT report_id, source_record_id, evidence_artifact_ids, missing_artifact_ids
       FROM sdia_graph_provenance
      WHERE report_id=$1 AND case_id=$2 AND target_type=$3 AND target_id=$4 LIMIT 1`,
    [jobId, caseId, target.target_type, target.id],
  )
  const report: SdiaReportMetadata | null = reportResult.rows[0]
    ? {
        schema_version: reportResult.rows[0].schema_version,
        evidence_contract_version: reportResult.rows[0].evidence_contract_version,
        tool: reportResult.rows[0].tool,
        tool_version: reportResult.rows[0].tool_version,
        domain: reportResult.rows[0].domain,
        run_id: reportResult.rows[0].run_id,
        investigation: asObject(reportResult.rows[0].investigation) || {},
        evidence_manifest: asObject(reportResult.rows[0].evidence_manifest) || {},
        producer_authenticity: reportResult.rows[0].producer_authenticity || "not_established",
        verification: asObject(reportResult.rows[0].verification) || { status: "unavailable" },
      }
    : sdiaReportMetadata(result)
  const artifacts = artifactResult.rows.length
    ? artifactResult.rows.map((item) => ({ ...item, parent_artifacts: strings(item.parent_artifacts), context: asObject(item.context) || {} }))
    : sdiaArtifactIndex(result)
  const storedProvenance = provenanceResult.rows[0]
  const recordObject = asObject(record)
  const evidenceArtifactIds = storedProvenance ? strings(storedProvenance.evidence_artifact_ids) : recordObject ? sdiaEvidenceArtifactIds(recordObject) : []
  const missingArtifactIds = storedProvenance ? strings(storedProvenance.missing_artifact_ids) : sdiaMissingArtifactIds(evidenceArtifactIds, artifacts)
  const migrationAvailable = reportResult.available && artifactResult.available && provenanceResult.available
  const bridgeRecordAvailable = Boolean(reportResult.rows[0])
  return {
    report_id: storedProvenance?.report_id || reportResult.rows[0]?.analysis_result_id || jobId,
    source_record_id: storedProvenance?.source_record_id || sourceRecordId,
    evidence_artifact_ids: evidenceArtifactIds,
    missing_artifact_ids: missingArtifactIds,
    artifacts,
    report,
    verification_state: sdiaVerificationState({ migration_available: migrationAvailable, bridge_record_available: bridgeRecordAvailable, missing_artifact_ids: missingArtifactIds, report }),
    migration_available: migrationAvailable,
    bridge_record_available: bridgeRecordAvailable,
    source_classification: text(recordObject?.classification),
  }
}

async function loadArtifacts(target: TargetRow, caseId: string) {
  const linkTable = target.target_type === "entity" ? "entity_evidence" : "relationship_evidence"
  const sourceTable = target.target_type === "entity" ? "entity_sources" : "relationship_sources"
  const targetColumn = target.target_type === "entity" ? "entity_id" : "relationship_id"
  const evidence = await query<{ id: string; case_id: string; file_name: string; file_type: string | null; file_hash: string | null; storage_path: string | null; evidence_type: string | null; description: string | null; created_at: string | null }>(`
    SELECT ff.id, ff.case_id, ff.file_name, ff.file_type, ff.file_hash, ff.storage_path, ff.evidence_type, ff.description, ff.created_at
    FROM ${linkTable} link JOIN forensic_files ff ON ff.id=link.forensic_file_id
    WHERE link.${targetColumn}=$1 AND ff.case_id=$2
    ORDER BY ff.created_at ASC, ff.id ASC`, [target.id, caseId])
  const sources = await query<{ title: string; source_type: string; collected_at: string | null }>(`
    SELECT src.title, src.source_type, src.collected_at FROM ${sourceTable} link
    JOIN intelligence_sources src ON src.id=link.source_id WHERE link.${targetColumn}=$1 AND src.case_id=$2
    ORDER BY src.collected_at ASC NULLS LAST, src.id ASC`, [target.id, caseId])
  const artifacts: VerificationArtifact[] = []

  for (const item of evidence.rows) {
    let content: { data: unknown; raw: Buffer | null } = { data: null, raw: null }
    let contentAvailable = false
    if (item.storage_path) {
      try { content = parseJsonContent(await downloadEvidenceFile(item.storage_path), item.file_type); contentAvailable = true } catch { /* Availability is reported explicitly below. */ }
    }
    artifacts.push({ id: item.id, case_id: item.case_id, data: content.data, raw_content: content.raw, recorded_sha256: item.file_hash, source: null, source_type: null, collected_at: null, evidence_classification: "observed", record_exists: true, content_available: contentAvailable })
  }

  const sdia = await loadSdiaContext(target, caseId)

  if (sources.rows.length) artifacts.forEach((artifact, index) => {
    const source = sources.rows[index] || sources.rows[0]
    artifact.source = source.title
    artifact.source_type = source.source_type
    artifact.collected_at = source.collected_at
  })
  return { artifacts, sdia }
}

function claimFromTarget(target: TargetRow, artifactIds: string[]): VerificationClaim {
  return { id: target.id, case_id: target.case_id, target_type: target.target_type, entity_type: target.entity_type, value: target.value, source_value: target.source_value, source_entity_type: target.source_entity_type, target_value: target.target_value, target_entity_type: target.target_entity_type, relationship_type: target.relationship_type, evidence_classification: target.relationship_type === "shares_observed_ip_with" ? "derived" : "observed", handling_classification: target.classification, confidence_score: target.confidence_score == null ? null : Number(target.confidence_score), stale_at: target.stale_at, artifact_ids: artifactIds }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const access = await requireCaseOperationalAccess(request, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const targetType = request.nextUrl.searchParams.get("target_type")
    const targetId = request.nextUrl.searchParams.get("target_id") || ""
    if (!targetId || !["entity", "relationship"].includes(String(targetType))) return NextResponse.json({ error: "A valid graph target is required." }, { status: 400 })

    const targetResult = targetType === "entity"
      ? await query<TargetRow>(`SELECT ie.id, ie.case_id, 'entity'::text AS target_type, ie.entity_type, COALESCE(ie.value, ie.name) AS value, NULL::text AS source_value, NULL::text AS target_value, NULL::text AS relationship_type, ie.classification, ie.confidence_score, ie.source_reference, NULL::uuid AS source_entity_id, NULL::uuid AS target_entity_id, NULL::text AS source_entity_type, NULL::text AS target_entity_type, ie.stale_at FROM investigation_entities ie WHERE ie.id=$1 AND ie.case_id=$2 LIMIT 1`, [targetId, access.caseId])
      : await query<TargetRow>(`SELECT er.id, er.case_id, 'relationship'::text AS target_type, NULL::text AS entity_type, NULL::text AS value, COALESCE(source.value, source.name) AS source_value, COALESCE(target.value, target.name) AS target_value, er.relationship_type, NULL::text AS classification, er.confidence_score, er.source_reference, er.source_entity_id, er.target_entity_id, source.entity_type AS source_entity_type, target.entity_type AS target_entity_type, LEAST(source.stale_at, target.stale_at) AS stale_at FROM entity_relationships er JOIN investigation_entities source ON source.id=er.source_entity_id AND source.case_id=er.case_id JOIN investigation_entities target ON target.id=er.target_entity_id AND target.case_id=er.case_id WHERE er.id=$1 AND er.case_id=$2 LIMIT 1`, [targetId, access.caseId])
    const target = targetResult.rows[0]
    if (!target) return NextResponse.json({ error: "Graph item not found in this case." }, { status: 404 })

    const loaded = await loadArtifacts(target, access.caseId)
    const artifacts = loaded.artifacts
    const claim = claimFromTarget(target, artifacts.map((item) => item.id))
    if (target.relationship_type === "shares_observed_ip_with" && target.source_entity_id && target.target_entity_id) {
      const parents = await query<TargetRow>(`
        SELECT er.id, er.case_id, 'relationship'::text AS target_type, NULL::text AS entity_type, NULL::text AS value,
          COALESCE(source.value, source.name) AS source_value, COALESCE(ip.value, ip.name) AS target_value,
          er.relationship_type, NULL::text AS classification, er.confidence_score, er.source_reference,
          er.source_entity_id, er.target_entity_id, source.entity_type AS source_entity_type,
          ip.entity_type AS target_entity_type, LEAST(source.stale_at, ip.stale_at) AS stale_at
        FROM entity_relationships er
        JOIN investigation_entities source ON source.id=er.source_entity_id AND source.case_id=er.case_id
        JOIN investigation_entities ip ON ip.id=er.target_entity_id AND ip.case_id=er.case_id
        WHERE er.case_id=$1 AND er.relationship_type='resolves_to'
          AND er.source_entity_id IN ($2, $3)
          AND er.target_entity_id IN (
            SELECT left_rel.target_entity_id FROM entity_relationships left_rel
            JOIN entity_relationships right_rel ON right_rel.case_id=left_rel.case_id AND right_rel.target_entity_id=left_rel.target_entity_id
            WHERE left_rel.case_id=$1 AND left_rel.relationship_type='resolves_to' AND right_rel.relationship_type='resolves_to'
              AND left_rel.source_entity_id=$2 AND right_rel.source_entity_id=$3
          )
        ORDER BY er.target_entity_id ASC, er.source_entity_id ASC, er.created_at ASC, er.id ASC`, [access.caseId, target.source_entity_id, target.target_entity_id])
      const bySharedIp = new Map<string, TargetRow[]>()
      for (const parent of parents.rows) bySharedIp.set(parent.target_entity_id || "", [...(bySharedIp.get(parent.target_entity_id || "") || []), parent])
      for (const candidates of bySharedIp.values()) {
        const selected: Array<{ claim: VerificationClaim; artifacts: VerificationArtifact[] }> = []
        for (const endpointId of [target.source_entity_id, target.target_entity_id]) {
          const endpointCandidates = candidates.filter((item) => item.source_entity_id === endpointId)
          let fallback: { claim: VerificationClaim; artifacts: VerificationArtifact[] } | null = null
          for (const parent of endpointCandidates) {
            const parentLoaded = await loadArtifacts(parent, access.caseId)
            const parentArtifacts = parentLoaded.artifacts
            const parentClaim = claimFromTarget(parent, parentArtifacts.map((item) => item.id))
            fallback ||= { claim: parentClaim, artifacts: parentArtifacts }
            if (verifyIntelligenceClaim(parentClaim, parentArtifacts).status === "SUPPORTED") { fallback = { claim: parentClaim, artifacts: parentArtifacts }; break }
          }
          if (fallback) selected.push(fallback)
        }
        if (selected.length === 2) {
          claim.parent_claims = selected.map((item) => item.claim)
          artifacts.push(...selected.flatMap((item) => item.artifacts))
          break
        }
      }
    }
    if (loaded.sdia) {
      const unavailable = sdiaUnavailableVerification(target, loaded.sdia)
      if (!artifacts.length) return NextResponse.json({ ...unavailable, local_verification: { status: "NOT_RUN", reason: "no_locally_attached_evidence" } }, { headers: { "Cache-Control": "private, no-store" } })
      const verified = verifyIntelligenceClaim(claim, artifacts)
      return NextResponse.json({
        ...verified,
        local_verification: { status: verified.status, integrity: verified.integrity, provenance: verified.provenance, evidence_artifacts: verified.evidence_artifacts },
        sdia_verification: unavailable,
        limitations: [...verified.limitations, "Local evidence verification and SDIA bridge verification are reported separately."],
      }, { headers: { "Cache-Control": "private, no-store" } })
    }
    const result = verifyIntelligenceClaim(claim, artifacts)
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    console.error("GRAPH VERIFICATION ERROR", error)
    return NextResponse.json({ error: "Evidence verification could not be completed." }, { status: 500 })
  }
}
