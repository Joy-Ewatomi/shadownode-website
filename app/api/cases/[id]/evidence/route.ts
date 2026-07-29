import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { auditLog } from "@/lib/auth"
import { optionalText, recordInvestigationTimeline, requireInvestigationWorkspace } from "@/lib/investigation-workspace"
import { query } from "@/lib/db"
import { emitCaseWorkspaceEvent } from "@/lib/realtime/workspace-events"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const access = await requireInvestigationWorkspace(request, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const evidence = await query(
      `
      SELECT
        ff.id,
        ff.case_id,
        ff.file_name,
        ff.file_size,
        ff.file_type,
        ff.file_hash,
        ff.uploaded_by,
        ff.storage_path,
        ff.is_evidence,
        ff.evidence_type,
        ff.description,
        ff.chain_of_custody,
        ff.created_at,
        ff.updated_at,
        au.username AS uploader
      FROM forensic_files ff
      LEFT JOIN app_users au ON au.id = ff.uploaded_by
      WHERE ff.case_id = $1
      ORDER BY ff.created_at DESC
      `,
      [access.caseId],
    )

    return NextResponse.json(evidence.rows)
  } catch (error) {
    console.error("EVIDENCE GET ERROR", error)
    return NextResponse.json({ error: "Failed to load evidence" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const access = await requireInvestigationWorkspace(request, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const form = await request.formData()
    const file = form.get("file")
    const description = optionalText(form.get("description"))
    const evidenceType = optionalText(form.get("evidence_type")) ?? "digital"

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Evidence file required" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex")
    const storagePath = `evidence/${access.caseId}/${Date.now()}-${file.name}`
    const custodyEvent = {
      action: "uploaded",
      user_id: access.user.id,
      timestamp: new Date().toISOString(),
      notes: description ?? "Evidence uploaded",
    }

    const inserted = await query<{ id: string }>(
      `
      INSERT INTO forensic_files
        (case_id, file_name, file_size, file_type, file_hash, uploaded_by, storage_path, is_evidence, evidence_type, description, chain_of_custody)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $9, $10::jsonb)
      RETURNING id
      `,
      [
        access.caseId,
        file.name,
        file.size,
        file.type || "application/octet-stream",
        fileHash,
        access.user.id,
        storagePath,
        evidenceType,
        description,
        JSON.stringify([custodyEvent]),
      ],
    )

    await recordInvestigationTimeline(access.caseId, access.user.id, "evidence_uploaded", "Evidence uploaded", file.name)
    await emitCaseWorkspaceEvent({
      type: "evidence.uploaded",
      case_id: access.caseId,
      actor_id: access.user.id,
      record_id: inserted.rows[0].id,
      data: { file_name: file.name, evidence_type: evidenceType },
    })
    await auditLog(access.user.id, "evidence_uploaded", request, { case_id: access.caseId, forensic_file_id: inserted.rows[0].id, file_hash: fileHash })

    return NextResponse.json({ id: inserted.rows[0].id, file_hash: fileHash }, { status: 201 })
  } catch (error) {
    console.error("EVIDENCE POST ERROR", error)
    return NextResponse.json({ error: "Failed to upload evidence" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const access = await requireInvestigationWorkspace(request, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json()
    const evidenceId = optionalText(body.id)
    if (!evidenceId) return NextResponse.json({ error: "Evidence id required" }, { status: 400 })

    const deleted = await query<{ id: string; file_name: string | null }>(
      `
      DELETE FROM forensic_files
      WHERE id = $1 AND case_id = $2
      RETURNING id, file_name
      `,
      [evidenceId, access.caseId],
    )

    if (!deleted.rows.length) return NextResponse.json({ error: "Evidence not found" }, { status: 404 })

    await emitCaseWorkspaceEvent({
      type: "evidence.deleted",
      case_id: access.caseId,
      actor_id: access.user.id,
      record_id: evidenceId,
      data: { file_name: deleted.rows[0].file_name },
    })
    await auditLog(access.user.id, "evidence_deleted", request, { case_id: access.caseId, forensic_file_id: evidenceId })

    return NextResponse.json({ id: evidenceId })
  } catch (error) {
    console.error("EVIDENCE DELETE ERROR", error)
    return NextResponse.json({ error: "Failed to delete evidence" }, { status: 500 })
  }
}
