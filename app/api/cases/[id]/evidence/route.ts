import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { auditLog } from "@/lib/auth"
import { optionalText, recordInvestigationTimeline, requireInvestigationWorkspace } from "@/lib/investigation-workspace"
import { query } from "@/lib/db"

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
    await auditLog(access.user.id, "evidence_uploaded", request, { case_id: access.caseId, forensic_file_id: inserted.rows[0].id, file_hash: fileHash })

    return NextResponse.json({ id: inserted.rows[0].id, file_hash: fileHash }, { status: 201 })
  } catch (error) {
    console.error("EVIDENCE POST ERROR", error)
    return NextResponse.json({ error: "Failed to upload evidence" }, { status: 500 })
  }
}
