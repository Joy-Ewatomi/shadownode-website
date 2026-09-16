import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import {
  canUseCaseOperationalAccess,
  canUseCaseOversightRead,
  canUseCaseReviewAccess,
} from "@/lib/investigation-workspace"
import { deleteEvidenceFile } from "@/lib/services/storage-service"

async function loadEvidence(evidenceId: string) {
  const result = await query<{
    id: string
    case_id: string
    file_name: string
    file_size: number | null
    file_type: string | null
    file_hash: string | null
    storage_path: string | null
    evidence_type: string | null
    description: string | null
    chain_of_custody: unknown
    created_at: string
    updated_at: string
    case_number: string | null
    case_title: string | null
    client_user_id: string | null
    uploaded_by_username: string | null
  }>(
    `
    SELECT
      ff.id,
      ff.case_id,
      ff.file_name,
      ff.file_size,
      ff.file_type,
      ff.file_hash,
      ff.storage_path,
      ff.evidence_type,
      ff.description,
      ff.chain_of_custody,
      ff.created_at,
      ff.updated_at,
      c.case_number,
      c.title AS case_title,
      client_profile.user_id AS client_user_id,
      uploader.username AS uploaded_by_username
    FROM forensic_files ff
    JOIN cases c ON c.id = ff.case_id
    LEFT JOIN user_profiles client_profile ON client_profile.id = c.client_profile_id
    LEFT JOIN user_profiles uploader_profile ON uploader_profile.id = ff.uploaded_by
    LEFT JOIN app_users uploader ON uploader.id = uploader_profile.user_id
    WHERE ff.id = $1
    LIMIT 1
    `,
    [evidenceId],
  )

  return result.rows[0] ?? null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const evidence = await loadEvidence(id)

    if (!evidence) {
      return NextResponse.json({ error: "Evidence not found" }, { status: 404 })
    }

    const canView =
      user.role === "client"
        ? evidence.client_user_id === user.id
        : (await canUseCaseOperationalAccess(user.id, user.role, evidence.case_id)) ||
          (await canUseCaseReviewAccess(user.id, user.role, evidence.case_id)) ||
          (await canUseCaseOversightRead(user.id, user.role, evidence.case_id))

    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(evidence)
  } catch (error) {
    console.error("EVIDENCE GET ERROR", error)
    return NextResponse.json({ error: "Failed to load evidence" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const evidence = await loadEvidence(id)

    if (!evidence) {
      return NextResponse.json({ error: "Evidence not found" }, { status: 404 })
    }

    if (!(await canUseCaseOperationalAccess(user.id, user.role, evidence.case_id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await query("DELETE FROM forensic_files WHERE id = $1", [id])

    if (evidence.storage_path) {
      await deleteEvidenceFile(evidence.storage_path).catch((error) => {
        console.error("EVIDENCE STORAGE DELETE ERROR", error)
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("EVIDENCE DELETE ERROR", error)
    return NextResponse.json({ error: "Failed to delete evidence" }, { status: 500 })
  }
}
