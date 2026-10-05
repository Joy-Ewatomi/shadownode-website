import { NextRequest, NextResponse } from "next/server"
import { auditLog } from "@/lib/auth"
import { withTransaction } from "@/lib/db"
import { profileIdForUser, recordInvestigationTimeline, requireCaseOperationalAccess } from "@/lib/investigation-workspace"
import { isSameOriginMutation } from "@/lib/security-center"
import { parseSdiaJobPayload, SDIA_ANALYSIS_TYPE } from "@/lib/sdia-analysis-jobs"

const HEADERS = { "Cache-Control": "private, no-store" }
type Json = Record<string, unknown>

function object(value: unknown): Json | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : null
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function entityType(externalId: string, item: Json) {
  const kind = (text(item.entity_type) || text(item.type) || externalId.split(":", 1)[0] || "").toLowerCase()
  if (kind === "domain") return "DOMAIN"
  if (kind === "hostname" || kind === "subdomain") return "SUBDOMAIN"
  if (kind === "ipv4" || kind === "ipv6" || kind === "ip") return "IP_ADDRESS"
  if (kind === "asn") return "ASN"
  if (kind === "certificate") return "SSL_CERTIFICATE"
  if (kind === "url") return "URL"
  return "UNKNOWN_ENTITY"
}

function confidence(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.min(100, Math.round(value <= 1 ? value * 100 : value)))
  const label = String(value || "").toLowerCase()
  if (["high", "observed", "confirmed"].includes(label)) return 85
  if (["medium", "moderate", "derived"].includes(label)) return 60
  if (["low", "inferred", "candidate"].includes(label)) return 35
  return 50
}

function safeDescription(item: Json) {
  const direct = text(item.description)
  if (direct) return direct.slice(0, 4000)
  const attributes = object(item.attributes)
  return attributes ? JSON.stringify(attributes).slice(0, 4000) : "Imported from an SDIA domain analysis for analyst review."
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403, headers: HEADERS })
  const body = await request.json().catch(() => null)
  const caseId = typeof body?.case_id === "string" ? body.case_id : ""
  const jobId = typeof body?.job_id === "string" ? body.job_id : ""
  if (!caseId || !/^[0-9a-f-]{36}$/i.test(jobId)) return NextResponse.json({ error: "Invalid analysis import." }, { status: 400, headers: HEADERS })
  const access = await requireCaseOperationalAccess(request, caseId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status, headers: HEADERS })
  const actorProfileId = await profileIdForUser(access.user.id)
  if (!actorProfileId) return NextResponse.json({ error: "Your authorized profile could not be resolved." }, { status: 409, headers: HEADERS })

  const imported = await withTransaction(async (client) => {
    const jobResult = await client.query<{ findings: string }>(
      "SELECT findings FROM analysis_results WHERE id=$1 AND case_id=$2 AND analysis_type=$3 AND severity='completed' FOR UPDATE",
      [jobId, access.caseId, SDIA_ANALYSIS_TYPE],
    )
    const payload = parseSdiaJobPayload(jobResult.rows[0]?.findings)
    const analysis = object(payload?.result)
    if (!payload || !analysis) throw new Error("analysis_not_ready")
    const entities = Array.isArray(analysis.entities) ? analysis.entities : []
    const relationships = Array.isArray(analysis.relationships) ? analysis.relationships : []
    const findings = Array.isArray(analysis.findings) ? analysis.findings : []
    const entityIds = new Map<string, string>()
    let entitiesCreated = 0
    let relationshipsCreated = 0
    let observationsCreated = 0

    for (const raw of entities.slice(0, 500)) {
      const item = object(raw)
      if (!item) continue
      const externalId = text(item.entity_id) || text(item.id)
      if (!externalId) continue
      const reference = `${jobId}:${externalId}`
      const existing = await client.query<{ id: string }>(
        "SELECT id FROM investigation_entities WHERE case_id=$1 AND source_provider='SDIA' AND source_reference=$2 LIMIT 1",
        [access.caseId, reference],
      )
      if (existing.rows[0]) { entityIds.set(externalId, existing.rows[0].id); continue }
      const value = text(item.value) || text(item.name) || externalId.split(":").slice(1).join(":") || externalId
      const name = text(item.name) || text(item.label) || value
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO investigation_entities
          (case_id, entity_type, name, value, description, aliases, source_provider, source_reference,
           retrieved_at, verification_status, confidence_score, classification, client_visible, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,'[]'::jsonb,'SDIA',$6,NOW(),'unreviewed',$7,'confidential',false,$8,$9)
         RETURNING id`,
        [access.caseId, entityType(externalId, item), name.slice(0, 500), value.slice(0, 2000), safeDescription(item), reference, confidence(item.confidence), `SDIA identifier: ${externalId}`, actorProfileId],
      )
      entityIds.set(externalId, inserted.rows[0].id)
      entitiesCreated += 1
    }

    for (const raw of relationships.slice(0, 1000)) {
      const item = object(raw)
      if (!item) continue
      const externalId = text(item.relationship_id) || text(item.id)
      const source = text(item.source_entity_id)
      const target = text(item.target_entity_id)
      if (!externalId || !source || !target || !entityIds.get(source) || !entityIds.get(target)) continue
      const reference = `${jobId}:${externalId}`
      const exists = await client.query(
        "SELECT 1 FROM entity_relationships WHERE case_id=$1 AND source_reference=$2 LIMIT 1",
        [access.caseId, reference],
      )
      if (exists.rows[0]) continue
      await client.query(
        `INSERT INTO entity_relationships
          (case_id, source_entity_id, target_entity_id, relationship_type, direction, description,
           source_reference, client_visible, verification_status, confidence_score, created_by)
         VALUES ($1,$2,$3,$4,'directed',$5,$6,false,'unreviewed',$7,$8)`,
        [access.caseId, entityIds.get(source), entityIds.get(target), text(item.relationship_type) || "linked_to", safeDescription(item), reference, confidence(item.confidence), actorProfileId],
      )
      relationshipsCreated += 1
    }

    for (const raw of findings.slice(0, 500)) {
      const item = object(raw)
      if (!item) continue
      const externalId = text(item.finding_id) || text(item.id)
      const title = text(item.name) || text(item.title)
      const description = text(item.description)
      if (!externalId || !title || !description) continue
      const source = JSON.stringify([{ provider: "SDIA", job_id: jobId, finding_id: externalId }])
      const exists = await client.query(
        "SELECT 1 FROM intelligence_observations WHERE case_id=$1 AND related_sources @> $2::jsonb LIMIT 1",
        [access.caseId, source],
      )
      if (exists.rows[0]) continue
      await client.query(
        `INSERT INTO intelligence_observations
          (case_id, observation_type, title, description, related_entities, related_sources, confidence_score, status)
         VALUES ($1,$2,$3,$4,'[]'::jsonb,$5::jsonb,$6,'pending')`,
        [access.caseId, text(item.finding_type) || text(item.category) || "observation", title.slice(0, 500), description.slice(0, 8000), source, confidence(item.confidence)],
      )
      observationsCreated += 1
    }
    return { entities_created: entitiesCreated, relationships_created: relationshipsCreated, observations_created: observationsCreated, entities_available: entities.length, relationships_available: relationships.length, findings_available: findings.length }
  })

  await recordInvestigationTimeline(access.caseId, access.user.id, "sdia_graph_imported", "SDIA intelligence added for review", `${imported.entities_created} entities, ${imported.relationships_created} relationships and ${imported.observations_created} observations added for analyst review.`)
  await auditLog(access.user.id, "sdia_domain_analysis_imported", request, { case_id: access.caseId, job_id: jobId, ...imported })
  return NextResponse.json(imported, { headers: HEADERS })
}
