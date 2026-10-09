import { NextRequest, NextResponse } from "next/server"

import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { canUseCaseOperationalAccess, canUseCaseOversightRead, canUseCaseReviewAccess } from "@/lib/investigation-workspace"
import { downloadFileFromBucket } from "@/lib/services/storage-service"

type ArtifactRow = {
  id: string
  report_id: string
  case_id: string
  storage_bucket: string
  storage_path: string
  mime_type: string
  visibility_scope: "internal" | "client"
  client_user_id: string | null
  report_status: string | null
  report_classification: string | null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; artifactId: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id: reportId, artifactId } = await params
    const result = await query<ArtifactRow>(`SELECT a.id, a.report_id, a.case_id, a.storage_bucket, a.storage_path, a.mime_type, a.visibility_scope, client_profile.user_id AS client_user_id, r.status AS report_status, r.classification AS report_classification FROM case_report_artifacts a JOIN case_reports r ON r.id = a.report_id JOIN cases c ON c.id = a.case_id LEFT JOIN user_profiles client_profile ON client_profile.id = c.client_profile_id WHERE a.id = $1 AND a.report_id = $2 AND a.removed_at IS NULL LIMIT 1`, [artifactId, reportId])
    const artifact = result.rows[0]
    if (!artifact) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const clientCanRead = user.role === "client" && artifact.client_user_id === user.id && artifact.visibility_scope === "client" && ["delivered", "published"].includes(String(artifact.report_status || "")) && String(artifact.report_classification || "confidential").toLowerCase() !== "internal"
    const staffCanRead = user.role !== "client" && ((await canUseCaseOperationalAccess(user.id, user.role, artifact.case_id)) || (await canUseCaseReviewAccess(user.id, user.role, artifact.case_id)) || (await canUseCaseOversightRead(user.id, user.role, artifact.case_id)))
    if (!clientCanRead && !staffCanRead) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const bytes = await downloadFileFromBucket(artifact.storage_bucket, artifact.storage_path)
    await auditLog(user.id, "report_artifact_downloaded", request, { report_id: reportId, artifact_id: artifact.id, case_id: artifact.case_id, mime_type: artifact.mime_type })
    return new NextResponse(bytes, { headers: { "Content-Type": artifact.mime_type, "Content-Disposition": `inline; filename=\"report-artifact-${artifact.id}.${artifact.mime_type === "application/pdf" ? "pdf" : "svg"}\"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } })
  } catch (error) {
    console.error("REPORT ARTIFACT DOWNLOAD ERROR", error)
    return NextResponse.json({ error: "Unable to retrieve report artifact." }, { status: 500 })
  }
}
