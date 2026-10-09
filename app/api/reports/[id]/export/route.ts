import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"

import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import {
  canUseCaseOperationalAccess,
  canUseCaseOversightRead,
  canUseCaseReviewAccess,
} from "@/lib/investigation-workspace"
import { getApprovedReportVersion, REPORT_ARTIFACT_BUCKET, sha256 } from "@/lib/report-artifacts"
import { renderRichDocumentToHtml, type RichDocument } from "@/lib/report-document"
import { renderReportPdf } from "@/lib/report-pdf"
import { richDocumentStorageAvailable } from "@/lib/report-rich-document-storage"
import { downloadFileFromBucket, uploadFileToBucket } from "@/lib/services/storage-service"

type ReportRow = Record<string, unknown> & { id: string; case_id: string; client_user_id: string | null; status: string | null; classification: string | null }
type ReportSectionRow = Record<string, unknown> & { section_type: string | null; title: string | null; content: string | null; content_document?: RichDocument | null; order_index: number }
type EvidenceRow = Record<string, unknown> & { id: string; file_name: string; file_type: string | null; file_hash: string | null; evidence_type: string | null; created_at: string | Date | null; chain_of_custody: unknown; uploaded_by_name: string | null }
type TimelineRow = Record<string, unknown> & { event_date: string | Date | null; title: string | null; description: string | null; created_at: string | Date }
type UpdateRow = Record<string, unknown> & { update_type: string | null; title: string | null; content: string | null; created_at: string | Date }
type ExportTimelineRow = { date: string | Date | null; type: string; title: string | null; detail: string | null }
type ExportEntityRow = Record<string, unknown> & { id: string; name: string | null; entity_type: string | null; verification_status: string | null; confidence_score: number | null }
type ExportRelationshipRow = Record<string, unknown> & { id: string; source_entity_id: string; source_name: string | null; target_entity_id: string; target_name: string | null; relationship_type: string | null; verification_status: string | null; confidence_score: number | null; source_reference: string | null }

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function formatDate(value: unknown) {
  if (!value) return "Not recorded"
  const date = new Date(String(value))
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toISOString().replace("T", " ").replace(".000Z", " UTC")
}

function safeCustody(value: unknown) {
  if (Array.isArray(value)) return value
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function metadataObject(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value === "string") {
    try { return JSON.parse(value) as Record<string, unknown> } catch { return {} }
  }
  return {}
}

function buildGraphExhibit(entities: ExportEntityRow[], relationships: ExportRelationshipRow[]) {
  if (!entities.length) return '<p>No report entities were available for the graph exhibit.</p>'
  const degree = new Map<string, number>()
  relationships.forEach((item) => {
    degree.set(item.source_entity_id, (degree.get(item.source_entity_id) || 0) + 1)
    degree.set(item.target_entity_id, (degree.get(item.target_entity_id) || 0) + 1)
  })
  const selected = [...entities]
    .sort((left, right) => {
      const leftPriority = left.entity_type === "DOMAIN" ? 10000 : 0
      const rightPriority = right.entity_type === "DOMAIN" ? 10000 : 0
      return (rightPriority + (degree.get(right.id) || 0)) - (leftPriority + (degree.get(left.id) || 0))
    })
    .slice(0, 48)
  const selectedIds = new Set(selected.map((item) => item.id))
  const graphRelationships = relationships.filter((item) => selectedIds.has(item.source_entity_id) && selectedIds.has(item.target_entity_id))
  const columns = Math.min(6, selected.length)
  const nodeWidth = 150
  const nodeHeight = 58
  const horizontalGap = 34
  const verticalGap = 52
  const width = Math.max(640, columns * (nodeWidth + horizontalGap) + 40)
  const height = Math.max(260, Math.ceil(selected.length / columns) * (nodeHeight + verticalGap) + 70)
  const positions = new Map(selected.map((item, index) => [item.id, {
    x: 28 + (index % columns) * (nodeWidth + horizontalGap),
    y: 48 + Math.floor(index / columns) * (nodeHeight + verticalGap),
  }]))
  const edgeSvg = graphRelationships.map((item) => {
    const source = positions.get(item.source_entity_id)
    const target = positions.get(item.target_entity_id)
    if (!source || !target) return ""
    return `<line x1="${source.x + nodeWidth / 2}" y1="${source.y + nodeHeight / 2}" x2="${target.x + nodeWidth / 2}" y2="${target.y + nodeHeight / 2}" stroke="#68776f" stroke-width="1" opacity="0.65" />`
  }).join("")
  const nodeSvg = selected.map((item) => {
    const position = positions.get(item.id)!
    const name = String(item.name || "Unnamed entity")
    const shortName = name.length > 24 ? `${name.slice(0, 23)}…` : name
    return `<g><rect x="${position.x}" y="${position.y}" width="${nodeWidth}" height="${nodeHeight}" rx="5" fill="#06110f" stroke="#159957" stroke-width="1.5"/><text x="${position.x + nodeWidth / 2}" y="${position.y + 25}" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="10" font-weight="700">${escapeHtml(shortName)}</text><text x="${position.x + nodeWidth / 2}" y="${position.y + 42}" text-anchor="middle" fill="#50c785" font-family="Consolas, monospace" font-size="8">${escapeHtml(item.entity_type || "ENTITY")}</text></g>`
  }).join("")
  const note = entities.length > selected.length ? `Overview displays the ${selected.length} most connected entities. The complete entity and relationship registers follow.` : "All report entities are displayed."
  return `<div class="graph-exhibit"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Case intelligence relationship graph"><rect width="100%" height="100%" fill="#f7faf8"/><text x="28" y="26" fill="#0d693d" font-family="Arial, sans-serif" font-size="12" font-weight="700">Case intelligence relationship overview</text>${edgeSvg}${nodeSvg}</svg><p class="caption">${escapeHtml(note)} Nodes are investigative records; connecting lines indicate recorded relationships and do not independently prove ownership or wrongdoing.</p></div>`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const reportResult = await query<ReportRow>(
      `
        SELECT
          cr.*,
          c.case_number,
          c.title AS case_title,
          c.client_profile_id,
          client_profile.user_id AS client_user_id,
          creator.full_name AS created_by_name,
          approver.full_name AS approved_by_name
        FROM case_reports cr
        JOIN cases c ON c.id = cr.case_id
        LEFT JOIN user_profiles client_profile ON client_profile.id = c.client_profile_id
        LEFT JOIN user_profiles creator ON creator.id = cr.created_by
        LEFT JOIN user_profiles approver ON approver.id = cr.approved_by
        WHERE cr.id = $1
        LIMIT 1
      `,
      [id],
    )

    const report = reportResult.rows[0]
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 })

    const clientCanView =
      user.role === "client" &&
      report.client_user_id === user.id &&
      ["delivered", "published"].includes(String(report.status || "")) &&
      String(report.classification || "confidential").toLowerCase() !== "internal"

    const staffCanView =
      user.role !== "client" &&
      ((await canUseCaseOperationalAccess(user.id, user.role, report.case_id)) ||
        (await canUseCaseReviewAccess(user.id, user.role, report.case_id)) ||
        (await canUseCaseOversightRead(user.id, user.role, report.case_id)))

    if (!clientCanView && !staffCanView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const format = new URL(request.url).searchParams.get("format")
    if (format === "pdf") {
      const frozenVersion = await getApprovedReportVersion(report.id)
      if (!frozenVersion) {
        return NextResponse.json({ error: "PDF export is available after this report version has been formally approved and frozen." }, { status: 409 })
      }
      const snapshot = frozenVersion.content_snapshot
      const graphArtifactId = snapshot.graph_artifact_id
      let graph: { id: string; visibility_scope: string; storage_bucket: string; storage_path: string; metadata: unknown; title: string | null; description: string | null } | null = null
      if (graphArtifactId) {
        const graphResult = await query<{ id: string; visibility_scope: string; storage_bucket: string; storage_path: string; metadata: unknown; title: string | null; description: string | null }>(
          "SELECT id, visibility_scope, storage_bucket, storage_path, metadata, title, description FROM case_report_artifacts WHERE id = $1 AND report_id = $2 AND removed_at IS NULL LIMIT 1",
          [graphArtifactId, report.id],
        )
        graph = graphResult.rows[0] || null
        if (user.role === "client" && graph?.visibility_scope !== "client") return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      const existingResult = await query<{ id: string; storage_bucket: string; storage_path: string; sha256: string }>(
        "SELECT id, storage_bucket, storage_path, sha256 FROM case_report_artifacts WHERE report_version_id = $1 AND artifact_type = 'approved_pdf' AND removed_at IS NULL LIMIT 1",
        [frozenVersion.id],
      )
      let pdfBytes: Buffer
      let artifactId: string
      let digest: string
      let reused = false
      if (existingResult.rows[0]) {
        const existing = existingResult.rows[0]
        pdfBytes = await downloadFileFromBucket(existing.storage_bucket, existing.storage_path)
        artifactId = existing.id
        digest = existing.sha256
        reused = true
      } else {
        const graphMetadata = metadataObject(graph?.metadata)
        const pageMetadata = Array.isArray(graphMetadata.pages) ? graphMetadata.pages : []
        const pngPaths = pageMetadata
          .map((page) => page && typeof page === "object" && typeof (page as Record<string, unknown>).png_storage_path === "string" ? String((page as Record<string, unknown>).png_storage_path) : null)
          .filter((path): path is string => Boolean(path))
        if (!pngPaths.length && typeof graphMetadata.png_storage_path === "string") pngPaths.push(graphMetadata.png_storage_path)
        const graphPngs = graph ? await Promise.all(pngPaths.map((path) => downloadFileFromBucket(graph!.storage_bucket, path))) : []
        pdfBytes = await renderReportPdf({ snapshot, version: frozenVersion.version_number, graphPngs, graphTitle: graph?.title, graphDescription: graph?.description, exportedAt: new Date().toISOString() })
        digest = sha256(pdfBytes)
        artifactId = crypto.randomUUID()
        const storagePath = `${report.case_id}/${report.id}/version-${frozenVersion.version_number}/${artifactId}.pdf`
        await uploadFileToBucket(REPORT_ARTIFACT_BUCKET, storagePath, pdfBytes, "application/pdf")
        try {
          await query(`INSERT INTO case_report_artifacts (id, report_id, case_id, report_version_id, artifact_type, visibility_scope, storage_bucket, storage_path, mime_type, sha256, metadata, content_sha256, created_by) VALUES ($1, $2, $3, $4, 'approved_pdf', $5, $6, $7, 'application/pdf', $8, $9::jsonb, $10, NULL)`, [artifactId, report.id, report.case_id, frozenVersion.id, graph?.visibility_scope === "client" ? "client" : "internal", REPORT_ARTIFACT_BUCKET, storagePath, digest, JSON.stringify({ report_version: frozenVersion.version_number, generated_at: new Date().toISOString() }), frozenVersion.content_sha256])
        } catch (insertError) {
          const concurrent = await query<{ id: string; storage_bucket: string; storage_path: string; sha256: string }>("SELECT id, storage_bucket, storage_path, sha256 FROM case_report_artifacts WHERE report_version_id = $1 AND artifact_type = 'approved_pdf' AND removed_at IS NULL LIMIT 1", [frozenVersion.id])
          if (!concurrent.rows[0]) throw insertError
          pdfBytes = await downloadFileFromBucket(concurrent.rows[0].storage_bucket, concurrent.rows[0].storage_path)
          artifactId = concurrent.rows[0].id
          digest = concurrent.rows[0].sha256
          reused = true
        }
      }
      await auditLog(user.id, "report_pdf_exported", request, { report_id: report.id, case_id: report.case_id, report_version: frozenVersion.version_number, artifact_id: artifactId, sha256: digest, reused })
      const safeName = String(report.case_number || "case-report").replace(/[^a-zA-Z0-9_-]/g, "-")
      return new NextResponse(pdfBytes, { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=\"${safeName}-report-v${frozenVersion.version_number}.pdf\"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } })
    }

    const richDocuments =
      await richDocumentStorageAvailable()

    const [sections, evidence, entities, relationships, timeline, updates] = await Promise.all([
      query<ReportSectionRow>(`SELECT section_type, title, content, ${richDocuments ? "content_document," : "NULL::jsonb AS content_document,"} order_index FROM case_report_sections WHERE report_id = $1 ORDER BY order_index, created_at`, [id]),
      query<EvidenceRow>(`
        SELECT ff.id, ff.file_name, ff.file_type, ff.file_size, ff.file_hash,
               ff.evidence_type, ff.description, ff.created_at, ff.chain_of_custody,
               uploader.full_name AS uploaded_by_name
        FROM case_report_evidence cre
        JOIN forensic_files ff ON ff.id = cre.forensic_file_id
        LEFT JOIN user_profiles uploader ON uploader.id = ff.uploaded_by
        WHERE cre.report_id = $1
        ORDER BY ff.created_at
      `, [id]),
      query<ExportEntityRow>(`
        SELECT ie.id, ie.name, ie.entity_type, ie.verification_status, ie.confidence_score
        FROM case_report_entities cre
        JOIN investigation_entities ie ON ie.id = cre.entity_id
        WHERE cre.report_id = $1
        ORDER BY ie.name
      `, [id]),
      query<ExportRelationshipRow>(`
        SELECT er.id, er.source_entity_id, source_entity.name AS source_name,
               er.target_entity_id, target_entity.name AS target_name,
               er.relationship_type, er.verification_status,
               er.confidence_score, er.source_reference
        FROM entity_relationships er
        JOIN case_report_entities source_report_entity
          ON source_report_entity.entity_id = er.source_entity_id AND source_report_entity.report_id = $1
        JOIN case_report_entities target_report_entity
          ON target_report_entity.entity_id = er.target_entity_id AND target_report_entity.report_id = $1
        JOIN investigation_entities source_entity ON source_entity.id = er.source_entity_id
        JOIN investigation_entities target_entity ON target_entity.id = er.target_entity_id
        ORDER BY source_entity.name, er.relationship_type, target_entity.name
      `, [id]),
      query<TimelineRow>(`
        SELECT event_date, title, description, created_at
        FROM investigation_timeline
        WHERE case_id = $1
        ORDER BY event_date NULLS LAST, created_at
      `, [report.case_id]),
      query<UpdateRow>(`
        SELECT update_type, title, content, created_at
        FROM case_updates
        WHERE case_id = $1
        ORDER BY created_at
      `, [report.case_id]),
    ])

    const frozenForExport = await getApprovedReportVersion(report.id)
    const frozenSnapshot = frozenForExport?.content_snapshot
    const exportReport =
      frozenSnapshot?.report ||
      report
    const frozenEntityNames = new Map((frozenSnapshot?.entities || []).map((entity) => [entity.id, entity.name || entity.value || entity.id]))
    const exportSections = frozenSnapshot ? frozenSnapshot.sections : sections.rows
    const exportEvidence = frozenSnapshot ? frozenSnapshot.evidence : evidence.rows
    const exportEntities: ExportEntityRow[] = frozenSnapshot
      ? frozenSnapshot.entities.map((entity) => ({ ...entity }))
      : entities.rows
    const exportRelationships: ExportRelationshipRow[] = frozenSnapshot
      ? frozenSnapshot.relationships.map((relationship) => ({
          ...relationship,
          source_name: frozenEntityNames.get(relationship.source_entity_id) || relationship.source_entity_id,
          target_name: frozenEntityNames.get(relationship.target_entity_id) || relationship.target_entity_id,
          source_reference: "Recorded in frozen report version",
        }))
      : relationships.rows
    const exportTimeline = frozenSnapshot ? frozenSnapshot.timeline : timeline.rows
    const exportUpdates = frozenSnapshot ? frozenSnapshot.updates : updates.rows

    const manifest = {
      report: {
        id: exportReport.id,
        case_id: exportReport.case_id,
        title: exportReport.title,
        summary: exportReport.summary,
        summary_document: exportReport.summary_document || null,
        status: exportReport.status,
        classification: exportReport.classification,
        updated_at: exportReport.updated_at,
      },
      sections: exportSections,
      evidence: exportEvidence.map((item) => ({
        id: item.id,
        file_name: item.file_name,
        file_hash: item.file_hash,
        created_at: item.created_at,
        chain_of_custody: item.chain_of_custody,
      })),
      entities: exportEntities,
      relationships: exportRelationships,
      timeline: exportTimeline,
      updates: exportUpdates,
    }
    const digest = crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex")
    const generatedAt = new Date().toISOString()

    const sectionHtml = exportSections.map((section, index) => `
      <section>
        <h2>${index + 1}. ${escapeHtml(section.title || section.section_type || "Report Section")}</h2>
        <div class="content">${section.content_document ? renderRichDocumentToHtml(section.content_document) : escapeHtml(section.content).replaceAll("\n", "<br>")}</div>
      </section>
    `).join("")

    const evidenceHtml = exportEvidence.length
      ? exportEvidence.map((item, index) => {
          const custody = safeCustody(item.chain_of_custody)
          return `
            <tr>
              <td>${index + 1}</td>
              <td><strong>${escapeHtml(item.file_name)}</strong><br>${escapeHtml(item.evidence_type || item.file_type || "Evidence")}</td>
              <td class="mono">${escapeHtml(item.file_hash || "Hash not recorded")}</td>
              <td>${escapeHtml(item.uploaded_by_name || "Not recorded")}<br>${escapeHtml(formatDate(item.created_at))}</td>
              <td>${custody.length ? custody.map((entry) => `${escapeHtml(entry.action || "event")} - ${escapeHtml(entry.actor || "unknown")} - ${escapeHtml(formatDate(entry.timestamp))}`).join("<br>") : "No custody events recorded"}</td>
            </tr>
          `
        }).join("")
      : '<tr><td colspan="5">No evidence was attached to this report.</td></tr>'

    const timelineRows: ExportTimelineRow[] = [...exportTimeline.map((item) => ({
      date: item.event_date || item.created_at,
      type: "Investigation timeline",
      title: item.title,
      detail: item.description,
    })), ...exportUpdates.map((item) => ({
      date: item.created_at,
      type: item.update_type || "Case update",
      title: item.title,
      detail: item.content,
    }))].sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime())

    const timelineHtml = timelineRows.length
      ? timelineRows.map((item) => `<tr><td>${escapeHtml(formatDate(item.date))}</td><td>${escapeHtml(item.type)}</td><td><strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.detail)}</td></tr>`).join("")
      : '<tr><td colspan="3">No timeline records available.</td></tr>'

    let graphHtml = buildGraphExhibit(exportEntities, exportRelationships)
    const frozenGraphId = frozenForExport?.content_snapshot?.graph_artifact_id
    if (frozenGraphId) {
      const graphResult = await query<{ storage_bucket: string; metadata: unknown; title: string | null; description: string | null; visibility_scope: string }>(
        "SELECT storage_bucket, metadata, title, description, visibility_scope FROM case_report_artifacts WHERE id = $1 AND report_id = $2 AND removed_at IS NULL LIMIT 1",
        [frozenGraphId, report.id],
      )
      const storedGraph = graphResult.rows[0]
      if (user.role === "client" && storedGraph?.visibility_scope !== "client") return NextResponse.json({ error: "Not found" }, { status: 404 })
      const pngPath = metadataObject(storedGraph?.metadata).png_storage_path
      if (storedGraph && typeof pngPath === "string") {
        const png = await downloadFileFromBucket(storedGraph.storage_bucket, pngPath)
        graphHtml = `<figure class="graph-exhibit"><img src="data:image/png;base64,${png.toString("base64")}" alt="Investigation graph"/><figcaption class="caption"><strong>${escapeHtml(storedGraph.title || "Investigation graph")}</strong><br>${escapeHtml(storedGraph.description || "Recorded entities and relationships at the time this figure was attached.")}</figcaption></figure>`
      }
    }
    const relationshipHtml = exportRelationships.length
      ? exportRelationships.map((item, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(item.source_name)}</td><td>${escapeHtml(String(item.relationship_type || "related to").replaceAll("_", " "))}</td><td>${escapeHtml(item.target_name)}</td><td>${escapeHtml(item.verification_status || "unreviewed")}<br>Confidence: ${escapeHtml(item.confidence_score ?? "Not scored")}</td><td class="mono">${escapeHtml(item.source_reference || "Not recorded")}</td></tr>`).join("")
      : '<tr><td colspan="6">No relationships were attached between report entities.</td></tr>'

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: Aptos, Arial, sans-serif; color: #17211c; font-size: 10.5pt; line-height: 1.55; }
  .brand { border-bottom: 3px solid #159957; padding-bottom: 14px; margin-bottom: 28px; }
  .brand-name { font-size: 19pt; font-weight: 800; letter-spacing: 1px; }
  .brand-sub { color: #159957; font-size: 8pt; text-transform: uppercase; letter-spacing: 2px; }
  h1 { font-size: 25pt; margin: 24px 0 8px; } h2 { font-size: 15pt; color: #0d693d; border-bottom: 1px solid #cfe5d8; padding-bottom: 5px; margin-top: 26px; } h3 { font-size: 12pt; color: #23533a; margin: 18px 0 7px; }
  .meta { width: 100%; border-collapse: collapse; background: #f2f8f5; margin: 18px 0 28px; }
  .meta td { padding: 8px 10px; border: 1px solid #cfe5d8; } .label { width: 22%; color: #516259; font-size: 8pt; text-transform: uppercase; }
  .content { white-space: normal; text-align: justify; }
  .content p { margin: 0 0 9px; } .content ul, .content ol { margin: 0 0 10px; padding-left: 24px; } .content li { margin: 0 0 3px; }
  table.rich-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin: 12px 0; } table.rich-table th { background: #0d693d; color: #fff; padding: 7px; text-align: left; } table.rich-table td { border: 1px solid #cbd8d0; padding: 7px; vertical-align: top; } table.rich-table p { margin: 0; }
  table.register { width: 100%; border-collapse: collapse; font-size: 8pt; }
  table.register th { background: #0d693d; color: white; padding: 7px; text-align: left; }
  table.register td { border: 1px solid #cbd8d0; padding: 7px; vertical-align: top; }
  .mono { font-family: Consolas, monospace; overflow-wrap: anywhere; }
  .graph-exhibit { border: 1px solid #cfe5d8; padding: 10px; page-break-inside: avoid; }
  .graph-exhibit svg, .graph-exhibit img { display: block; width: 100%; max-height: 185mm; object-fit: contain; }
  .caption { margin: 8px 2px 0; color: #607068; font-size: 7.5pt; }
  .notice { margin-top: 28px; border: 1px solid #c9a227; background: #fffbea; padding: 12px; font-size: 8.5pt; }
  .signature { margin-top: 48px; page-break-inside: avoid; } .signature-line { width: 260px; border-top: 1px solid #17211c; margin-top: 50px; padding-top: 6px; }
  .footer { margin-top: 38px; padding-top: 10px; border-top: 1px solid #cfe5d8; font-size: 7.5pt; color: #607068; }
</style></head><body>
  <div class="brand"><div class="brand-name">SHADOWNODE</div><div class="brand-sub">Operations Bureau Limited</div></div>
  <div>Controlled Investigative Report</div><h1>${escapeHtml(exportReport.title || "Investigation Report")}</h1>
  <table class="meta">
    <tr><td class="label">Case</td><td>${escapeHtml(report.case_number)} - ${escapeHtml(report.case_title)}</td><td class="label">Report ID</td><td class="mono">${escapeHtml(report.id)}</td></tr>
    <tr><td class="label">Status</td><td>${escapeHtml(exportReport.status)}</td><td class="label">Classification</td><td>${escapeHtml(exportReport.classification)}</td></tr>
    <tr><td class="label">Prepared by</td><td>${escapeHtml(exportReport.created_by_name || "Not recorded")}</td><td class="label">Approved by</td><td>${escapeHtml(exportReport.approved_by_name || "Not approved")}</td></tr>
    <tr><td class="label">Created</td><td>${escapeHtml(formatDate(exportReport.created_at))}</td><td class="label">Updated</td><td>${escapeHtml(formatDate(exportReport.updated_at))}</td></tr>
  </table>
  <section><h2>Executive Summary</h2><div class="content">${exportReport.summary_document ? renderRichDocumentToHtml(exportReport.summary_document) : escapeHtml(exportReport.summary || "No executive summary recorded.").replaceAll("\n", "<br>")}</div></section>
  ${sectionHtml}
  <section><h2>Intelligence Graph Exhibit</h2>${graphHtml}</section>
  <section><h2>Relationship Register</h2><table class="register"><thead><tr><th>#</th><th>Source Entity</th><th>Relationship</th><th>Target Entity</th><th>Review State</th><th>Source Reference</th></tr></thead><tbody>${relationshipHtml}</tbody></table></section>
  <section><h2>Evidence Register and Chain of Custody</h2><table class="register"><thead><tr><th>#</th><th>Evidence</th><th>SHA-256</th><th>Custodian / Collection</th><th>Custody History</th></tr></thead><tbody>${evidenceHtml}</tbody></table></section>
  <section><h2>Referenced Entities</h2><table class="register"><thead><tr><th>Entity</th><th>Type</th><th>Verification</th><th>Confidence</th></tr></thead><tbody>${exportEntities.length ? exportEntities.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.entity_type)}</td><td>${escapeHtml(item.verification_status)}</td><td>${escapeHtml(item.confidence_score ?? "Not scored")}</td></tr>`).join("") : '<tr><td colspan="4">No entities attached.</td></tr>'}</tbody></table></section>
  <section><h2>Investigation and Case Timeline</h2><table class="register"><thead><tr><th>Date</th><th>Record Type</th><th>Event</th></tr></thead><tbody>${timelineHtml}</tbody></table></section>
  <section><h2>Integrity Manifest</h2><p>This digest covers the report control fields, sections, attached evidence metadata and hashes, referenced entities, and timeline records included at export time.</p><p class="mono"><strong>SHA-256:</strong> ${digest}</p><p><strong>Generated:</strong> ${escapeHtml(generatedAt)}</p></section>
  <div class="notice"><strong>Legal caution:</strong> This document preserves available provenance and integrity metadata but does not by itself establish admissibility. Original evidence, native files, custody records, witness testimony, and jurisdiction-specific procedural requirements remain controlling.</div>
  <div class="signature"><div class="signature-line"><strong>Joy Ewatomi</strong><br>Authorized Signatory<br>SHADOWNODE OPERATIONS BUREAU LIMITED<br>Date: ____________________</div></div>
  <div class="footer">SHADOWNODE OPERATIONS BUREAU LIMITED | Controlled report ${escapeHtml(report.id)} | Data digest ${digest}</div>
</body></html>`

    await auditLog(user.id, "report_exported", request, {
      report_id: report.id,
      case_id: report.case_id,
      digest,
      format: "word_html",
    })

    const safeName = String(report.case_number || "case-report").replace(/[^a-zA-Z0-9_-]/g, "-")
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}-report.doc"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("REPORT EXPORT ERROR", error)
    return NextResponse.json({ error: "Failed to export report" }, { status: 500 })
  }
}
