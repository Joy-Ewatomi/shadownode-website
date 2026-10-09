import { NextRequest, NextResponse } from "next/server"

import { auditLog } from "@/lib/auth"
import { canonicalJson, createGraphSnapshot, getActiveGraphSnapshot, removeGraphSnapshot, sha256 } from "@/lib/report-artifacts"
import { query } from "@/lib/db"
import { optionalText, profileIdForUser, requireCaseOperationalAccess, requireCaseReadAccess, recordInvestigationTimeline } from "@/lib/investigation-workspace"
import { emitCaseWorkspaceEvent } from "@/lib/realtime/workspace-events"

function graphArtifactResponse(artifact: Awaited<ReturnType<typeof getActiveGraphSnapshot>>) {
  if (!artifact) return null
  const metadata = artifact.metadata && typeof artifact.metadata === "object" ? artifact.metadata : {}
  return {
    id: artifact.id,
    title: artifact.title,
    description: artifact.description,
    visibility_scope: artifact.visibility_scope,
    sha256: artifact.sha256,
    created_at: artifact.created_at,
    metadata: {
      entity_count: typeof metadata.entity_count === "number" ? metadata.entity_count : 0,
      relationship_count: typeof metadata.relationship_count === "number" ? metadata.relationship_count : 0,
      page_count: typeof metadata.page_count === "number" ? metadata.page_count : 0,
      layout: metadata.layout === "hierarchical" ? "hierarchical" : "network",
    },
  }
}

function canManageReports(role: string | null | undefined) {
  return ["super_administrator", "super-administrator", "administrator", "staff", "investigator", "analyst"].includes(String(role || ""))
}

async function reportForCase(reportId: string, caseId: string) {
  const result = await query<{ id: string; title: string | null; status: string | null; classification: string | null }>(
    "SELECT id, title, status, classification FROM case_reports WHERE id = $1 AND case_id = $2 LIMIT 1",
    [reportId, caseId],
  )
  return result.rows[0] || null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; reportId: string }> }) {
  const { id: caseId, reportId } = await params
  const access = await requireCaseReadAccess(request, caseId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const report = await reportForCase(reportId, access.caseId)
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 })
  const artifact = await getActiveGraphSnapshot(reportId)
  if (access.user.role === "client" && artifact?.visibility_scope !== "client") {
    return NextResponse.json({ artifact: null })
  }
  return NextResponse.json({ artifact: graphArtifactResponse(artifact) })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; reportId: string }> }) {
  try {
    const { id: caseId, reportId } = await params
    const access = await requireCaseOperationalAccess(request, caseId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    if (!canManageReports(access.user.role)) return NextResponse.json({ error: "You are not authorized to attach report artifacts." }, { status: 403 })
    const report = await reportForCase(reportId, access.caseId)
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 })
    if (!["draft", "review"].includes(String(report.status || "draft").toLowerCase())) {
      return NextResponse.json({ error: "Approved report versions are immutable. Create a revised draft before replacing a graph attachment." }, { status: 409 })
    }
    const body = await request.json()
    const title = optionalText(body?.title) || `${report.title || "Investigation Report"} - Investigation Graph`
    const description = optionalText(body?.description) || "Recorded case entities and relationships at the time this figure was attached."
    const visibility = body?.visibility === "client" ? "client" : "internal"
    const layout = body?.layout === "network" ? "network" : "hierarchical"
    const profileId = await profileIdForUser(access.user.id)
    await removeGraphSnapshot({ reportId, caseId: access.caseId, actorProfileId: profileId })
    const artifact = await createGraphSnapshot({
      reportId,
      caseId: access.caseId,
      createdBy: profileId,
      contentSha256: sha256(canonicalJson({ report_id: reportId, title, description, visibility, layout })),
      title,
      description,
      visibility,
      layout,
    })
    await recordInvestigationTimeline(access.caseId, access.user.id, "report_graph_attached", "Investigation graph attached", report.title || "Case report")
    await emitCaseWorkspaceEvent({ type: "case.updated", case_id: access.caseId, actor_id: access.user.id, record_id: reportId, data: { graph_artifact_id: artifact.id, change: "report_graph_attached" } })
    await auditLog(access.user.id, "report_graph_attached", request, { case_id: access.caseId, report_id: reportId, artifact_id: artifact.id, visibility_scope: visibility, layout, sha256: artifact.sha256 })
    return NextResponse.json({ artifact: graphArtifactResponse(artifact) }, { status: 201 })
  } catch (error) {
    console.error("REPORT GRAPH ATTACHMENT ERROR", error)
    return NextResponse.json({ error: "Unable to create the investigation graph attachment. Confirm the report artifact migration has been applied." }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; reportId: string }> }) {
  try {
    const { id: caseId, reportId } = await params
    const access = await requireCaseOperationalAccess(request, caseId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    if (!canManageReports(access.user.role)) return NextResponse.json({ error: "You are not authorized to remove report artifacts." }, { status: 403 })
    const report = await reportForCase(reportId, access.caseId)
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 })
    if (!["draft", "review"].includes(String(report.status || "draft").toLowerCase())) return NextResponse.json({ error: "Approved report versions are immutable." }, { status: 409 })
    const profileId = await profileIdForUser(access.user.id)
    await removeGraphSnapshot({ reportId, caseId: access.caseId, actorProfileId: profileId })
    await recordInvestigationTimeline(access.caseId, access.user.id, "report_graph_removed", "Investigation graph removed", report.title || "Case report")
    await emitCaseWorkspaceEvent({ type: "case.updated", case_id: access.caseId, actor_id: access.user.id, record_id: reportId, data: { change: "report_graph_removed" } })
    await auditLog(access.user.id, "report_graph_removed", request, { case_id: access.caseId, report_id: reportId })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("REPORT GRAPH REMOVAL ERROR", error)
    return NextResponse.json({ error: "Unable to remove the investigation graph attachment." }, { status: 500 })
  }
}
