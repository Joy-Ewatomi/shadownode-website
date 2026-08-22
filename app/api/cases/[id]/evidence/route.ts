import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { auditLog } from "@/lib/auth"
import {
  optionalText,
  profileIdForUser,
  recordInvestigationTimeline,
  requireInvestigationWorkspace,
} from "@/lib/investigation-workspace"
import { query } from "@/lib/db"
import {
  uploadEvidenceFile,
  deleteEvidenceFile,
} from "@/lib/services/storage-service"
import { emitCaseWorkspaceEvent } from "@/lib/realtime/workspace-events"

type EvidenceRow = {
  id: string
  file_name: string | null
  storage_path: string | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const access = await requireInvestigationWorkspace(request, id)

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const { rows } = await query(
      `
      SELECT
        ff.id,
        ff.case_id,
        ff.file_name,
        ff.file_size,
        ff.file_type,
        ff.file_hash,
        ff.storage_path,
        ff.is_evidence,
        ff.evidence_type,
        ff.description,
        ff.chain_of_custody,
        ff.created_at,
        ff.updated_at,
        au.username AS uploaded_by
      FROM forensic_files ff
      LEFT JOIN user_profiles up
        ON up.id = ff.uploaded_by
      LEFT JOIN app_users au
        ON au.id = up.user_id
      WHERE ff.case_id=$1
      ORDER BY ff.created_at DESC
      `,
      [access.caseId]
    )

    return NextResponse.json(rows)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Failed to load evidence" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const access = await requireInvestigationWorkspace(request, id)

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const form = await request.formData()

    const uploaded = form.get("file")

    if (!(uploaded instanceof File)) {
      return NextResponse.json(
        { error: "File required" },
        { status: 400 }
      )
    }

    const description =
      optionalText(form.get("description"))

    const evidenceType =
      optionalText(form.get("evidence_type")) ??
      "digital"

    const buffer = Buffer.from(
      await uploaded.arrayBuffer()
    )

    const hash = crypto
      .createHash("sha256")
      .update(buffer)
      .digest("hex")

    /*
      Later this will become:
      Supabase Storage
      AWS S3
      Azure Blob
      etc.

      For now we only store the path.
    */

    const storagePath =
      `${access.caseId}/${Date.now()}-${uploaded.name}`

    await uploadEvidenceFile(
      storagePath,
      buffer,
      uploaded.type || "application/octet-stream"
    )

    const uploaderProfileId =
      await profileIdForUser(access.user.id)

    if (!uploaderProfileId) {
      return NextResponse.json(
        { error: "User profile missing" },
        { status: 500 }
      )
    }

    const custody = [
      {
        action: "uploaded",
        actor: access.user.username,
        actor_id: access.user.id,
        timestamp: new Date().toISOString(),
        notes: description,
      },
    ]

    const { rows } = await query<EvidenceRow>(
      `
      INSERT INTO forensic_files
      (
        case_id,
        file_name,
        file_size,
        file_type,
        file_hash,
        uploaded_by,
        storage_path,
        is_evidence,
        evidence_type,
        description,
        chain_of_custody
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,
        TRUE,
        $8,$9,$10::jsonb
      )
      RETURNING id,file_name
      `,
      [
        access.caseId,
        uploaded.name,
        uploaded.size,
        uploaded.type || "application/octet-stream",
        hash,
        uploaderProfileId,
        storagePath,
        evidenceType,
        description,
        JSON.stringify(custody),
      ]
    )

    await recordInvestigationTimeline(
      access.caseId,
      access.user.id,
      "evidence_uploaded",
      "Evidence Uploaded",
      uploaded.name
    )

    await emitCaseWorkspaceEvent({
      type: "evidence.uploaded",
      case_id: access.caseId,
      actor_id: access.user.id,
      record_id: rows[0].id,
      data: {
        file_name: uploaded.name,
        evidence_type: evidenceType,
      },
    })

    await auditLog(
      access.user.id,
      "evidence_uploaded",
      request,
      {
        case_id: access.caseId,
        forensic_file_id: rows[0].id,
      }
    )

    return NextResponse.json(
      {
        success: true,
        id: rows[0].id,
        file_hash: hash,
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const access = await requireInvestigationWorkspace(request, id)

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await request.json()

    const evidenceId =
      optionalText(body.id)

    if (!evidenceId) {
      return NextResponse.json(
        { error: "Evidence id required" },
        { status: 400 }
      )
    }

    const { rows } = await query<EvidenceRow>(
      `
      DELETE FROM forensic_files
      WHERE id=$1
      AND case_id=$2
      RETURNING id,file_name
      `,
      [
        evidenceId,
        access.caseId,
      ]
    )

    if (!rows.length) {
await deleteEvidenceFile(
  rows[0].storage_path ?? ""
).catch(() => {})
      return NextResponse.json(
        { error: "Evidence not found" },
        { status: 404 }
      )
    }

    await recordInvestigationTimeline(
      access.caseId,
      access.user.id,
      "evidence_deleted",
      "Evidence Removed",
      rows[0].file_name ?? ""
    )

    await emitCaseWorkspaceEvent({
      type: "evidence.deleted",
      case_id: access.caseId,
      actor_id: access.user.id,
      record_id: evidenceId,
      data: {
        file_name: rows[0].file_name,
      },
    })

    await auditLog(
      access.user.id,
      "evidence_deleted",
      request,
      {
        case_id: access.caseId,
        forensic_file_id: evidenceId,
      }
    )

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error: "Delete failed",
      },
      {
        status: 500,
      }
    )
  }
}
