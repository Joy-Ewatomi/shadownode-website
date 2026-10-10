import { NextRequest, NextResponse } from "next/server"

import { auditLog } from "@/lib/auth"
import { query } from "@/lib/db"
import { requireCaseReadAccess } from "@/lib/investigation-workspace"
import { downloadEvidenceFile } from "@/lib/services/storage-service"

const PREVIEWABLE_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
])

type EvidencePreview = {
  id: string
  file_name: string | null
  file_type: string | null
  storage_path: string | null
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; evidenceId: string }> },
) {
  try {
    const { id, evidenceId } = await context.params
    const access = await requireCaseReadAccess(request, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const result = await query<EvidencePreview>(
      `SELECT id, file_name, file_type, storage_path FROM forensic_files WHERE id = $1 AND case_id = $2 AND is_evidence IS DISTINCT FROM FALSE LIMIT 1`,
      [evidenceId, access.caseId],
    )
    const evidence = result.rows[0]
    const mimeType = evidence?.file_type?.toLowerCase() || ""

    if (!evidence?.storage_path) return NextResponse.json({ error: "Evidence image not found." }, { status: 404 })
    if (!PREVIEWABLE_IMAGE_TYPES.has(mimeType)) return NextResponse.json({ error: "This evidence file cannot be previewed as an image." }, { status: 415 })

    const bytes = await downloadEvidenceFile(evidence.storage_path)
    await auditLog(access.user.id, "evidence_image_previewed", request, {
      case_id: access.caseId,
      forensic_file_id: evidence.id,
    })

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${(evidence.file_name || "evidence-image").replace(/[\r\n"]/g, "_")}"`,
        "Content-Type": mimeType,
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("CASE EVIDENCE IMAGE PREVIEW ERROR:", error)
    return NextResponse.json({ error: "Unable to preview evidence image." }, { status: 500 })
  }
}
