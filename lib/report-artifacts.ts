import crypto from "crypto"
import sharp from "sharp"

import { query, withTransaction, type DatabasePoolClient } from "@/lib/db"
import type { RichDocument } from "@/lib/report-document"
import { layoutHierarchicalReportGraph, type ReportGraphLayout } from "@/lib/report-graph-layout"
import { richDocumentStorageAvailable } from "@/lib/report-rich-document-storage"
import { uploadFileToBucket } from "@/lib/services/storage-service"

export const REPORT_ARTIFACT_BUCKET = "report-artifacts"

export type ReportArtifact = {
  id: string
  report_id: string
  case_id: string
  report_version_id: string | null
  artifact_type: "graph_snapshot" | "approved_pdf"
  visibility_scope: "internal" | "client"
  storage_bucket: string
  storage_path: string
  mime_type: string
  sha256: string
  title: string | null
  description: string | null
  metadata: Record<string, unknown>
  content_sha256: string
  created_at: string
  removed_at: string | null
}

type SnapshotEntity = {
  id: string
  name: string | null
  value: string | null
  entity_type: string | null
  verification_status: string | null
  confidence_score: number | null
  classification: string | null
  client_visible: boolean | null
}

type SnapshotRelationship = {
  id: string
  source_entity_id: string
  target_entity_id: string
  relationship_type: string | null
  verification_status: string | null
  confidence_score: number | null
  client_visible: boolean | null
}

type SnapshotSection = { section_type: string | null; title: string | null; content: string | null; content_document?: RichDocument | null; order_index: number }
type SnapshotEvidence = { id: string; file_name: string | null; file_type: string | null; file_hash: string | null; evidence_type: string | null; description: string | null; created_at: string | null; chain_of_custody: unknown; uploaded_by_name: string | null }
type SnapshotTimeline = { event_date: string | null; title: string | null; description: string | null; created_at: string | null }
type SnapshotUpdate = { update_type: string | null; title: string | null; content: string | null; created_at: string | null }

type SnapshotReport = {
  id: string
  case_id: string
  title: string | null
  summary: string | null
  report_type: string | null
  status: string | null
  classification: string | null
  created_at: string | null
  updated_at: string | null
  case_number: string | null
  case_title: string | null
  created_by_name: string | null
  approved_by_name: string | null
  summary_document?: RichDocument | null
}

export type FrozenReportSnapshot = {
  schema_version: 1 | 2
  report: SnapshotReport
  sections: SnapshotSection[]
  evidence: SnapshotEvidence[]
  entities: SnapshotEntity[]
  relationships: SnapshotRelationship[]
  timeline: SnapshotTimeline[]
  updates: SnapshotUpdate[]
  graph_artifact_id: string | null
}

function asIso(value: unknown) {
  return value instanceof Date ? value.toISOString() : value == null ? null : String(value)
}

function normalise(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalise)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalise(item)]))
  }
  return value
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(normalise(value))
}

export function sha256(value: string | Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function displayEntity(entity: SnapshotEntity) {
  return String(entity.name || entity.value || "Unnamed entity").trim().slice(0, 54) || "Unnamed entity"
}

function statusColor(status: string | null) {
  switch (String(status || "unreviewed").toLowerCase()) {
    case "verified": return "#087f43"
    case "supported": return "#0f766e"
    case "refuted": return "#b42318"
    default: return "#8a6411"
  }
}

export function buildGraphSvg(input: {
  entities: SnapshotEntity[]
  relationships: SnapshotRelationship[]
  title: string
  description: string
  page?: number
  pageSize?: number
}) {
  const pageSize = Math.max(1, input.pageSize || 42)
  const page = Math.max(0, input.page || 0)
  const entities = input.entities.slice(page * pageSize, (page + 1) * pageSize)
  const entityIds = new Set(entities.map((item) => item.id))
  const relationships = input.relationships.filter((item) => entityIds.has(item.source_entity_id) && entityIds.has(item.target_entity_id))
  const columns = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(entities.length))))
  const nodeWidth = 240
  const nodeHeight = 78
  const gapX = 54
  const gapY = 74
  const rows = Math.max(1, Math.ceil(entities.length / columns))
  const width = Math.max(920, columns * nodeWidth + (columns - 1) * gapX + 120)
  const height = Math.max(520, rows * nodeHeight + (rows - 1) * gapY + 240)
  const positions = new Map(entities.map((entity, index) => [entity.id, {
    x: 60 + (index % columns) * (nodeWidth + gapX),
    y: 150 + Math.floor(index / columns) * (nodeHeight + gapY),
  }]))
  const edges = relationships.map((relationship) => {
    const source = positions.get(relationship.source_entity_id)
    const target = positions.get(relationship.target_entity_id)
    if (!source || !target) return ""
    const label = String(relationship.relationship_type || "related to").replaceAll("_", " ").slice(0, 30)
    const middleX = (source.x + target.x + nodeWidth) / 2
    const middleY = (source.y + target.y + nodeHeight) / 2
    return `<g><line x1="${source.x + nodeWidth / 2}" y1="${source.y + nodeHeight / 2}" x2="${target.x + nodeWidth / 2}" y2="${target.y + nodeHeight / 2}" stroke="#60746a" stroke-width="1.3"/><rect x="${middleX - 60}" y="${middleY - 10}" width="120" height="18" rx="3" fill="#f7faf8"/><text x="${middleX}" y="${middleY + 3}" text-anchor="middle" fill="#405048" font-family="Noto Sans, Arial, sans-serif" font-size="8">${escapeXml(label)}</text></g>`
  }).join("")
  const nodes = entities.map((entity) => {
    const position = positions.get(entity.id)!
    const status = String(entity.verification_status || "unreviewed").toLowerCase()
    const label = displayEntity(entity)
    return `<g><rect x="${position.x}" y="${position.y}" width="${nodeWidth}" height="${nodeHeight}" rx="7" fill="#f9fcfa" stroke="${statusColor(status)}" stroke-width="2"/><text x="${position.x + nodeWidth / 2}" y="${position.y + 29}" text-anchor="middle" fill="#16221c" font-family="Noto Sans, Arial, sans-serif" font-size="12" font-weight="700">${escapeXml(label)}</text><text x="${position.x + nodeWidth / 2}" y="${position.y + 48}" text-anchor="middle" fill="#277a4e" font-family="Noto Sans, Arial, sans-serif" font-size="9">${escapeXml(entity.entity_type || "ENTITY")}</text><text x="${position.x + nodeWidth / 2}" y="${position.y + 65}" text-anchor="middle" fill="${statusColor(status)}" font-family="Noto Sans, Arial, sans-serif" font-size="8">${escapeXml(status)}</text></g>`
  }).join("")
  const pageCount = Math.max(1, Math.ceil(input.entities.length / pageSize))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Investigation graph"><rect width="100%" height="100%" fill="#ffffff"/><text x="60" y="48" fill="#104d2e" font-family="Noto Sans, Arial, sans-serif" font-size="21" font-weight="700">${escapeXml(input.title)}</text><text x="60" y="74" fill="#526258" font-family="Noto Sans, Arial, sans-serif" font-size="11">${escapeXml(input.description)}</text><text x="60" y="102" fill="#526258" font-family="Noto Sans, Arial, sans-serif" font-size="10">Page ${page + 1} of ${pageCount} · ${input.entities.length} entities · ${input.relationships.length} recorded relationships</text>${edges}${nodes}<g transform="translate(60 ${height - 54})"><text x="0" y="0" fill="#304137" font-family="Noto Sans, Arial, sans-serif" font-size="10" font-weight="700">Verification legend</text><circle cx="8" cy="18" r="5" fill="#087f43"/><text x="18" y="22" fill="#405048" font-family="Noto Sans, Arial, sans-serif" font-size="9">Verified</text><circle cx="104" cy="18" r="5" fill="#0f766e"/><text x="114" y="22" fill="#405048" font-family="Noto Sans, Arial, sans-serif" font-size="9">Supported</text><circle cx="208" cy="18" r="5" fill="#8a6411"/><text x="218" y="22" fill="#405048" font-family="Noto Sans, Arial, sans-serif" font-size="9">Unreviewed</text><circle cx="324" cy="18" r="5" fill="#b42318"/><text x="334" y="22" fill="#405048" font-family="Noto Sans, Arial, sans-serif" font-size="9">Refuted</text><text x="0" y="40" fill="#607068" font-family="Noto Sans, Arial, sans-serif" font-size="8">Relationship labels describe recorded links. They are not verified solely because connected entities are verified.</text></g></svg>`
}

function pathForSections(sections: Array<{ startPoint?: { x: number; y: number }; bendPoints?: Array<{ x: number; y: number }>; endPoint?: { x: number; y: number } }>) {
  const section = sections[0]
  if (!section?.startPoint || !section.endPoint) return ""
  const points = [section.startPoint, ...(section.bendPoints || []), section.endPoint]
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ")
}

function edgeLabelPoint(sections: Array<{ startPoint?: { x: number; y: number }; bendPoints?: Array<{ x: number; y: number }>; endPoint?: { x: number; y: number } }>) {
  const section = sections[0]
  const points = section?.startPoint && section.endPoint
    ? [section.startPoint, ...(section.bendPoints || []), section.endPoint]
    : []
  return points[Math.floor(points.length / 2)] || null
}

/** A deterministic ELK-based report figure. It keeps directed cross-links. */
export async function buildHierarchicalGraphSvg(input: {
  entities: SnapshotEntity[]
  relationships: SnapshotRelationship[]
  title: string
  description: string
  page?: number
  pageSize?: number
}) {
  const pageSize = Math.max(1, input.pageSize || 36)
  const page = Math.max(0, input.page || 0)
  const hasOverview = input.entities.length > pageSize
  const detailIndex = hasOverview ? page - 1 : page
  const isOverview = hasOverview && page === 0
  const entities = isOverview
    ? input.entities
    : input.entities.slice(Math.max(0, detailIndex) * pageSize, (Math.max(0, detailIndex) + 1) * pageSize)
  const entityIds = new Set(entities.map((item) => item.id))
  const relationships = isOverview
    ? input.relationships
    : input.relationships.filter((item) => entityIds.has(item.source_entity_id) && entityIds.has(item.target_entity_id))
  const layout = await layoutHierarchicalReportGraph({
    entities,
    relationships,
    compact: isOverview,
  })
  const pageCount = hasOverview
    ? 1 + Math.ceil(input.entities.length / pageSize)
    : Math.max(1, Math.ceil(input.entities.length / pageSize))
  const detailCrossLinks = !isOverview
    ? input.relationships.filter((item) => entityIds.has(item.source_entity_id) !== entityIds.has(item.target_entity_id)).length
    : 0
  const edges = relationships.map((relationship) => {
    const edge = layout.edges.get(relationship.id)
    const path = pathForSections(edge?.sections || [])
    if (!path) return ""
    const point = edgeLabelPoint(edge?.sections || [])
    const label = String(relationship.relationship_type || "related to").replaceAll("_", " ").slice(0, 30)
    const labelText = point ? `<g><rect x="${point.x - 54}" y="${point.y - 9}" width="108" height="17" rx="3" fill="#f7faf8" opacity="0.95"/><text x="${point.x}" y="${point.y + 3}" text-anchor="middle" fill="#405048" font-family="Noto Sans, Arial, sans-serif" font-size="8">${escapeXml(label)}</text></g>` : ""
    return `<g><path d="${path}" fill="none" stroke="#60746a" stroke-width="1.25" marker-end="url(#arrow)"/>${labelText}</g>`
  }).join("")
  const nodes = entities.map((entity) => {
    const position = layout.nodes.get(entity.id)
    if (!position) return ""
    const status = String(entity.verification_status || "unreviewed").toLowerCase()
    const label = displayEntity(entity)
    const fontSize = isOverview ? 9 : 12
    const typeSize = isOverview ? 7 : 9
    const statusSize = isOverview ? 6 : 8
    return `<g><rect x="${position.x}" y="${position.y}" width="${position.width}" height="${position.height}" rx="7" fill="#f9fcfa" stroke="${statusColor(status)}" stroke-width="2"/><text x="${position.x + position.width / 2}" y="${position.y + position.height * 0.37}" text-anchor="middle" fill="#16221c" font-family="Noto Sans, Arial, sans-serif" font-size="${fontSize}" font-weight="700">${escapeXml(label)}</text><text x="${position.x + position.width / 2}" y="${position.y + position.height * 0.61}" text-anchor="middle" fill="#277a4e" font-family="Noto Sans, Arial, sans-serif" font-size="${typeSize}">${escapeXml(entity.entity_type || "ENTITY")}</text><text x="${position.x + position.width / 2}" y="${position.y + position.height * 0.82}" text-anchor="middle" fill="${statusColor(status)}" font-family="Noto Sans, Arial, sans-serif" font-size="${statusSize}">${escapeXml(status)}</text></g>`
  }).join("")
  const label = isOverview
    ? "Complete hierarchical overview"
    : `Hierarchical detail ${detailIndex + 1} of ${Math.ceil(input.entities.length / pageSize)}`
  const height = layout.height + 112
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${height}" viewBox="0 0 ${layout.width} ${height}" role="img" aria-label="Investigation graph"><defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#60746a"/></marker></defs><rect width="100%" height="100%" fill="#ffffff"/><text x="56" y="38" fill="#104d2e" font-family="Noto Sans, Arial, sans-serif" font-size="20" font-weight="700">${escapeXml(input.title)}</text><text x="56" y="61" fill="#526258" font-family="Noto Sans, Arial, sans-serif" font-size="10">${escapeXml(input.description)}</text><text x="56" y="83" fill="#526258" font-family="Noto Sans, Arial, sans-serif" font-size="9">${label} · page ${page + 1} of ${pageCount} · ${entities.length} entities · ${relationships.length} relationships${detailCrossLinks ? ` · ${detailCrossLinks} cross-page relationships retained in the overview and relationship register` : ""}</text><g transform="translate(0 54)">${edges}${nodes}</g><g transform="translate(56 ${height - 44})"><text x="0" y="0" fill="#304137" font-family="Noto Sans, Arial, sans-serif" font-size="10" font-weight="700">Verification legend</text><circle cx="8" cy="18" r="5" fill="#087f43"/><text x="18" y="22" fill="#405048" font-family="Noto Sans, Arial, sans-serif" font-size="9">Verified</text><circle cx="104" cy="18" r="5" fill="#0f766e"/><text x="114" y="22" fill="#405048" font-family="Noto Sans, Arial, sans-serif" font-size="9">Supported</text><circle cx="208" cy="18" r="5" fill="#8a6411"/><text x="218" y="22" fill="#405048" font-family="Noto Sans, Arial, sans-serif" font-size="9">Unreviewed</text><circle cx="324" cy="18" r="5" fill="#b42318"/><text x="334" y="22" fill="#405048" font-family="Noto Sans, Arial, sans-serif" font-size="9">Refuted</text><text x="0" y="40" fill="#607068" font-family="Noto Sans, Arial, sans-serif" font-size="8">Directed lines and labels describe recorded relationships. They are not verified solely because connected entities are verified.</text></g></svg>`
}

async function loadGraph(caseId: string, visibility: "internal" | "client") {
  const [entityResult, relationshipResult] = await Promise.all([
    query<SnapshotEntity>(`SELECT id, name, value, entity_type, verification_status, confidence_score, classification, client_visible FROM investigation_entities WHERE case_id = $1 ${visibility === "client" ? "AND client_visible = true" : ""} ORDER BY created_at, id`, [caseId]),
    query<SnapshotRelationship>(`SELECT id, source_entity_id, target_entity_id, relationship_type, verification_status, confidence_score, client_visible FROM entity_relationships WHERE case_id = $1 ${visibility === "client" ? "AND client_visible = true" : ""} ORDER BY created_at, id`, [caseId]),
  ])
  const visibleIds = new Set(entityResult.rows.map((item) => item.id))
  return { entities: entityResult.rows, relationships: relationshipResult.rows.filter((item) => visibleIds.has(item.source_entity_id) && visibleIds.has(item.target_entity_id)) }
}

export async function createGraphSnapshot(input: {
  reportId: string
  caseId: string
  createdBy: string | null
  contentSha256: string
  title: string
  description: string
  visibility: "internal" | "client"
  layout?: ReportGraphLayout
}) {
  const graph = await loadGraph(input.caseId, input.visibility)
  const layout = input.layout === "network" ? "network" : "hierarchical"
  const id = crypto.randomUUID()
  const basePath = `${input.caseId}/${input.reportId}/graph/${id}`
  const pageSize = layout === "hierarchical" ? 36 : 42
  const pageCount = layout === "hierarchical" && graph.entities.length > pageSize
    ? 1 + Math.ceil(graph.entities.length / pageSize)
    : Math.max(1, Math.ceil(graph.entities.length / pageSize))
  const pages = await Promise.all(Array.from({ length: pageCount }, async (_, page) => {
    const svg = layout === "hierarchical"
      ? await buildHierarchicalGraphSvg({ ...graph, title: input.title, description: input.description, page, pageSize })
      : buildGraphSvg({ ...graph, title: input.title, description: input.description, page, pageSize })
    const png = await sharp(Buffer.from(svg), { density: 220 }).png({ compressionLevel: 9 }).toBuffer()
    const suffix = page === 0 ? "" : `-page-${page + 1}`
    const svgPath = `${basePath}${suffix}.svg`
    const pngPath = `${basePath}${suffix}.png`
    await uploadFileToBucket(REPORT_ARTIFACT_BUCKET, svgPath, Buffer.from(svg), "image/svg+xml")
    await uploadFileToBucket(REPORT_ARTIFACT_BUCKET, pngPath, png, "image/png")
    return { page: page + 1, svg_storage_path: svgPath, png_storage_path: pngPath, svg_sha256: sha256(svg), png_sha256: sha256(png) }
  }))
  const primary = pages[0]
  const metadata = {
    schema_version: 2,
    layout,
    png_storage_path: primary.png_storage_path,
    png_sha256: primary.png_sha256,
    entity_count: graph.entities.length,
    relationship_count: graph.relationships.length,
    page_count: pages.length,
    pages,
    graph_snapshot: { entities: graph.entities, relationships: graph.relationships },
  }
  const inserted = await query<ReportArtifact>(`INSERT INTO case_report_artifacts (id, report_id, case_id, artifact_type, visibility_scope, storage_bucket, storage_path, mime_type, sha256, title, description, metadata, content_sha256, created_by) VALUES ($1, $2, $3, 'graph_snapshot', $4, $5, $6, 'image/svg+xml', $7, $8, $9, $10::jsonb, $11, $12) RETURNING *`, [id, input.reportId, input.caseId, input.visibility, REPORT_ARTIFACT_BUCKET, primary.svg_storage_path, primary.svg_sha256, input.title, input.description, JSON.stringify(metadata), input.contentSha256, input.createdBy])
  return inserted.rows[0]
}

export async function getActiveGraphSnapshot(reportId: string, client?: DatabasePoolClient) {
  const executor = client || { query }
  const result = await executor.query<ReportArtifact>(`SELECT * FROM case_report_artifacts WHERE report_id = $1 AND artifact_type = 'graph_snapshot' AND removed_at IS NULL ORDER BY created_at DESC LIMIT 1`, [reportId])
  return result.rows[0] || null
}

export async function removeGraphSnapshot(input: { reportId: string; caseId: string; actorProfileId: string | null }) {
  await query(`UPDATE case_report_artifacts SET removed_at = now(), removed_by = $3 WHERE report_id = $1 AND case_id = $2 AND artifact_type = 'graph_snapshot' AND removed_at IS NULL`, [input.reportId, input.caseId, input.actorProfileId])
}

async function loadFrozenSnapshot(client: DatabasePoolClient, reportId: string, caseId: string, graphArtifactId: string | null): Promise<FrozenReportSnapshot> {
  const richDocuments =
    await richDocumentStorageAvailable()

  const [reportResult, sections, evidence, entities, relationships, timeline, updates] = await Promise.all([
    client.query<SnapshotReport>(`SELECT cr.id, cr.case_id, cr.title, cr.summary, ${richDocuments ? "cr.summary_document," : "NULL::jsonb AS summary_document,"} cr.report_type, cr.status, cr.classification, cr.created_at, cr.updated_at, c.case_number, c.title AS case_title, creator.full_name AS created_by_name, approver.full_name AS approved_by_name FROM case_reports cr JOIN cases c ON c.id = cr.case_id LEFT JOIN user_profiles creator ON creator.id = cr.created_by LEFT JOIN user_profiles approver ON approver.id = cr.approved_by WHERE cr.id = $1 AND cr.case_id = $2 FOR UPDATE`, [reportId, caseId]),
    client.query<SnapshotSection>(`SELECT section_type, title, content, ${richDocuments ? "content_document," : "NULL::jsonb AS content_document,"} order_index FROM case_report_sections WHERE report_id = $1 ORDER BY order_index, created_at`, [reportId]),
    client.query<SnapshotEvidence>(`SELECT ff.id, ff.file_name, ff.file_type, ff.file_hash, ff.evidence_type, ff.description, ff.created_at, ff.chain_of_custody, uploader.full_name AS uploaded_by_name FROM case_report_evidence cre JOIN forensic_files ff ON ff.id = cre.forensic_file_id LEFT JOIN user_profiles uploader ON uploader.id = ff.uploaded_by WHERE cre.report_id = $1 ORDER BY ff.created_at, ff.id`, [reportId]),
    client.query<SnapshotEntity>(`SELECT ie.id, ie.name, ie.value, ie.entity_type, ie.verification_status, ie.confidence_score, ie.classification, ie.client_visible FROM case_report_entities cre JOIN investigation_entities ie ON ie.id = cre.entity_id WHERE cre.report_id = $1 ORDER BY ie.name, ie.id`, [reportId]),
    client.query<SnapshotRelationship>(`SELECT er.id, er.source_entity_id, er.target_entity_id, er.relationship_type, er.verification_status, er.confidence_score, er.client_visible FROM entity_relationships er JOIN case_report_entities source_link ON source_link.entity_id = er.source_entity_id AND source_link.report_id = $1 JOIN case_report_entities target_link ON target_link.entity_id = er.target_entity_id AND target_link.report_id = $1 WHERE er.case_id = $2 ORDER BY er.created_at, er.id`, [reportId, caseId]),
    client.query<SnapshotTimeline>(`SELECT event_date, title, description, created_at FROM investigation_timeline WHERE case_id = $1 ORDER BY event_date NULLS LAST, created_at`, [caseId]),
    client.query<SnapshotUpdate>(`SELECT update_type, title, content, created_at FROM case_updates WHERE case_id = $1 ORDER BY created_at`, [caseId]),
  ])
  if (!reportResult.rows[0]) throw new Error("Report not found for snapshot")
  return {
    schema_version: richDocuments ? 2 : 1,
    report: { ...reportResult.rows[0], created_at: asIso(reportResult.rows[0].created_at), updated_at: asIso(reportResult.rows[0].updated_at) },
    sections: sections.rows.map((item) => ({ ...item, order_index: Number(item.order_index || 0) })),
    evidence: evidence.rows.map((item) => ({ ...item, created_at: asIso(item.created_at) })),
    entities: entities.rows,
    relationships: relationships.rows,
    timeline: timeline.rows.map((item) => ({ ...item, event_date: asIso(item.event_date), created_at: asIso(item.created_at) })),
    updates: updates.rows.map((item) => ({ ...item, created_at: asIso(item.created_at) })),
    graph_artifact_id: graphArtifactId,
  }
}

export async function freezeApprovedReportVersion(input: { reportId: string; caseId: string; approvedBy: string | null }) {
  return withTransaction(async (client) => {
    const existing = await client.query<{ id: string; content_snapshot: FrozenReportSnapshot; content_sha256: string; version_number: number }>(`SELECT id, content_snapshot, content_sha256, version_number FROM case_report_versions WHERE report_id = $1 ORDER BY version_number DESC LIMIT 1`, [input.reportId])
    if (existing.rows[0]) return existing.rows[0]
    const graph = await getActiveGraphSnapshot(input.reportId, client)
    const snapshot = await loadFrozenSnapshot(client, input.reportId, input.caseId, graph?.id || null)
    const digest = sha256(canonicalJson(snapshot))
    const versionId = crypto.randomUUID()
    const created = await client.query<{ id: string; content_snapshot: FrozenReportSnapshot; content_sha256: string; version_number: number }>(`INSERT INTO case_report_versions (id, report_id, case_id, version_number, status, content_snapshot, content_sha256, approved_by) VALUES ($1, $2, $3, 1, 'approved', $4::jsonb, $5, $6) RETURNING id, content_snapshot, content_sha256, version_number`, [versionId, input.reportId, input.caseId, JSON.stringify(snapshot), digest, input.approvedBy])
    if (graph) await client.query(`UPDATE case_report_artifacts SET report_version_id = $2, content_sha256 = $3 WHERE id = $1`, [graph.id, versionId, digest])
    return created.rows[0]
  })
}

export async function getApprovedReportVersion(reportId: string) {
  const result = await query<{ id: string; report_id: string; case_id: string; version_number: number; content_snapshot: FrozenReportSnapshot; content_sha256: string; approved_at: string }>(`SELECT id, report_id, case_id, version_number, content_snapshot, content_sha256, approved_at FROM case_report_versions WHERE report_id = $1 ORDER BY version_number DESC LIMIT 1`, [reportId])
  return result.rows[0] || null
}
