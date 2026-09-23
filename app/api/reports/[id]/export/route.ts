import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"

import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import {
  canUseCaseOperationalAccess,
  canUseCaseOversightRead,
  canUseCaseReviewAccess,
} from "@/lib/investigation-workspace"

type ReportRow = Record<string, unknown> & { id: string; case_id: string; client_user_id: string | null; status: string | null; classification: string | null }
type ReportSectionRow = Record<string, unknown> & { section_type: string | null; title: string | null; content: string | null; order_index: number }
type EvidenceRow = Record<string, unknown> & { id: string; file_name: string; file_type: string | null; file_hash: string | null; evidence_type: string | null; created_at: string | Date | null; chain_of_custody: unknown; uploaded_by_name: string | null }
type TimelineRow = Record<string, unknown> & { event_date: string | Date | null; title: string | null; description: string | null; created_at: string | Date }
type UpdateRow = Record<string, unknown> & { update_type: string | null; title: string | null; content: string | null; created_at: string | Date }
type ExportTimelineRow = { date: string | Date | null; type: string; title: string | null; detail: string | null }

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

    const [sections, evidence, entities, timeline, updates] = await Promise.all([
      query<ReportSectionRow>(`SELECT section_type, title, content, order_index FROM case_report_sections WHERE report_id = $1 ORDER BY order_index, created_at`, [id]),
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
      query(`
        SELECT ie.id, ie.name, ie.entity_type, ie.verification_status, ie.confidence_score
        FROM case_report_entities cre
        JOIN investigation_entities ie ON ie.id = cre.entity_id
        WHERE cre.report_id = $1
        ORDER BY ie.name
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

    const manifest = {
      report: {
        id: report.id,
        case_id: report.case_id,
        status: report.status,
        classification: report.classification,
        updated_at: report.updated_at,
      },
      sections: sections.rows,
      evidence: evidence.rows.map((item) => ({
        id: item.id,
        file_name: item.file_name,
        file_hash: item.file_hash,
        created_at: item.created_at,
        chain_of_custody: item.chain_of_custody,
      })),
      entities: entities.rows,
      timeline: timeline.rows,
      updates: updates.rows,
    }
    const digest = crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex")
    const generatedAt = new Date().toISOString()

    const sectionHtml = sections.rows.map((section, index) => `
      <section>
        <h2>${index + 1}. ${escapeHtml(section.title || section.section_type || "Report Section")}</h2>
        <div class="content">${escapeHtml(section.content).replaceAll("\n", "<br>")}</div>
      </section>
    `).join("")

    const evidenceHtml = evidence.rows.length
      ? evidence.rows.map((item, index) => {
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

    const timelineRows: ExportTimelineRow[] = [...timeline.rows.map((item) => ({
      date: item.event_date || item.created_at,
      type: "Investigation timeline",
      title: item.title,
      detail: item.description,
    })), ...updates.rows.map((item) => ({
      date: item.created_at,
      type: item.update_type || "Case update",
      title: item.title,
      detail: item.content,
    }))].sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime())

    const timelineHtml = timelineRows.length
      ? timelineRows.map((item) => `<tr><td>${escapeHtml(formatDate(item.date))}</td><td>${escapeHtml(item.type)}</td><td><strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.detail)}</td></tr>`).join("")
      : '<tr><td colspan="3">No timeline records available.</td></tr>'

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: Aptos, Arial, sans-serif; color: #17211c; font-size: 10.5pt; line-height: 1.55; }
  .brand { border-bottom: 3px solid #159957; padding-bottom: 14px; margin-bottom: 28px; }
  .brand-name { font-size: 19pt; font-weight: 800; letter-spacing: 1px; }
  .brand-sub { color: #159957; font-size: 8pt; text-transform: uppercase; letter-spacing: 2px; }
  h1 { font-size: 25pt; margin: 24px 0 8px; } h2 { font-size: 15pt; color: #0d693d; border-bottom: 1px solid #cfe5d8; padding-bottom: 5px; margin-top: 26px; }
  .meta { width: 100%; border-collapse: collapse; background: #f2f8f5; margin: 18px 0 28px; }
  .meta td { padding: 8px 10px; border: 1px solid #cfe5d8; } .label { width: 22%; color: #516259; font-size: 8pt; text-transform: uppercase; }
  .content { white-space: normal; text-align: justify; }
  table.register { width: 100%; border-collapse: collapse; font-size: 8pt; }
  table.register th { background: #0d693d; color: white; padding: 7px; text-align: left; }
  table.register td { border: 1px solid #cbd8d0; padding: 7px; vertical-align: top; }
  .mono { font-family: Consolas, monospace; overflow-wrap: anywhere; }
  .notice { margin-top: 28px; border: 1px solid #c9a227; background: #fffbea; padding: 12px; font-size: 8.5pt; }
  .signature { margin-top: 48px; page-break-inside: avoid; } .signature-line { width: 260px; border-top: 1px solid #17211c; margin-top: 50px; padding-top: 6px; }
  .footer { margin-top: 38px; padding-top: 10px; border-top: 1px solid #cfe5d8; font-size: 7.5pt; color: #607068; }
</style></head><body>
  <div class="brand"><div class="brand-name">SHADOWNODE</div><div class="brand-sub">Operations Bureau Limited</div></div>
  <div>Controlled Investigative Report</div><h1>${escapeHtml(report.title || "Investigation Report")}</h1>
  <table class="meta">
    <tr><td class="label">Case</td><td>${escapeHtml(report.case_number)} - ${escapeHtml(report.case_title)}</td><td class="label">Report ID</td><td class="mono">${escapeHtml(report.id)}</td></tr>
    <tr><td class="label">Status</td><td>${escapeHtml(report.status)}</td><td class="label">Classification</td><td>${escapeHtml(report.classification)}</td></tr>
    <tr><td class="label">Prepared by</td><td>${escapeHtml(report.created_by_name || "Not recorded")}</td><td class="label">Approved by</td><td>${escapeHtml(report.approved_by_name || "Not approved")}</td></tr>
    <tr><td class="label">Created</td><td>${escapeHtml(formatDate(report.created_at))}</td><td class="label">Updated</td><td>${escapeHtml(formatDate(report.updated_at))}</td></tr>
  </table>
  <section><h2>Executive Summary</h2><div class="content">${escapeHtml(report.summary || "No executive summary recorded.").replaceAll("\n", "<br>")}</div></section>
  ${sectionHtml}
  <section><h2>Evidence Register and Chain of Custody</h2><table class="register"><thead><tr><th>#</th><th>Evidence</th><th>SHA-256</th><th>Custodian / Collection</th><th>Custody History</th></tr></thead><tbody>${evidenceHtml}</tbody></table></section>
  <section><h2>Referenced Entities</h2><table class="register"><thead><tr><th>Entity</th><th>Type</th><th>Verification</th><th>Confidence</th></tr></thead><tbody>${entities.rows.length ? entities.rows.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.entity_type)}</td><td>${escapeHtml(item.verification_status)}</td><td>${escapeHtml(item.confidence_score ?? "Not scored")}</td></tr>`).join("") : '<tr><td colspan="4">No entities attached.</td></tr>'}</tbody></table></section>
  <section><h2>Investigation and Case Timeline</h2><table class="register"><thead><tr><th>Date</th><th>Record Type</th><th>Event</th></tr></thead><tbody>${timelineHtml}</tbody></table></section>
  <section><h2>Integrity Manifest</h2><p>This digest covers the report control fields, sections, attached evidence metadata and hashes, referenced entities, and timeline records included at export time.</p><p class="mono"><strong>SHA-256:</strong> ${digest}</p><p><strong>Generated:</strong> ${escapeHtml(generatedAt)}</p></section>
  <div class="notice"><strong>Legal caution:</strong> This document preserves available provenance and integrity metadata but does not by itself establish admissibility. Original evidence, native files, custody records, witness testimony, and jurisdiction-specific procedural requirements remain controlling.</div>
  <div class="signature"><div class="signature-line"><strong>Joy Ewatomi</strong><br>Authorized Signatory<br>ShadowNode Operations Bureau Limited<br>Date: ____________________</div></div>
  <div class="footer">ShadowNode Operations Bureau Limited | Controlled report ${escapeHtml(report.id)} | Data digest ${digest}</div>
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
