import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"

import { auditLog } from "@/lib/auth"
import {
  optionalText,
  profileIdForUser,
  recordInvestigationTimeline,
  requireCaseOperationalAccess,
  requireCaseReadAccess,
} from "@/lib/investigation-workspace"
import { query } from "@/lib/db"
import {
  deleteEvidenceFile,
  uploadEvidenceFile,
} from "@/lib/services/storage-service"
import { emitCaseWorkspaceEvent } from "@/lib/realtime/workspace-events"

type EvidenceRow = {
  id: string
  file_name: string | null
  storage_path: string | null
}

function isSuperAdminRole(
  role: string | null | undefined,
) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

function canManageEvidence(
  role: string | null | undefined,
) {
  return (
    role === "administrator" ||
    isSuperAdminRole(role) ||
    role === "staff" ||
    role === "investigator" ||
    role === "analyst"
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const access =
      await requireCaseReadAccess(
        request,
        id,
      )

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
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
          au.username AS uploader

        FROM forensic_files ff

        LEFT JOIN user_profiles up
          ON up.id = ff.uploaded_by

        LEFT JOIN app_users au
          ON au.id = up.user_id

        WHERE ff.case_id = $1

        ORDER BY ff.created_at DESC
      `,
      [access.caseId],
    )

    return NextResponse.json(rows)
  } catch (error) {
    console.error(
      "CASE EVIDENCE GET ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to load evidence",
      },
      {
        status: 500,
      },
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const access =
      await requireCaseOperationalAccess(
        request,
        id,
      )

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      )
    }

    if (
      !canManageEvidence(
        access.user.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to upload evidence for this case.",
        },
        {
          status: 403,
        },
      )
    }

    const form =
      await request.formData()

    const uploaded =
      form.get("file")

    if (!(uploaded instanceof File)) {
      return NextResponse.json(
        {
          error: "File required",
        },
        {
          status: 400,
        },
      )
    }

    if (uploaded.size <= 0) {
      return NextResponse.json(
        {
          error: "The uploaded file is empty.",
        },
        {
          status: 400,
        },
      )
    }

    const description =
      optionalText(
        form.get("description"),
      )

    const evidenceType =
      optionalText(
        form.get("evidence_type"),
      ) ?? "digital"

    const buffer =
      Buffer.from(
        await uploaded.arrayBuffer(),
      )

    const hash =
      crypto
        .createHash("sha256")
        .update(buffer)
        .digest("hex")

    const safeFileName =
      uploaded.name
        .replace(
          /[^\w.\-() ]/g,
          "_",
        )
        .trim() ||
      "evidence-file"

    const storagePath =
      `${access.caseId}/${Date.now()}-${safeFileName}`

    await uploadEvidenceFile(
      storagePath,
      buffer,
      uploaded.type ||
        "application/octet-stream",
    )

    const uploaderProfileId =
      await profileIdForUser(
        access.user.id,
      )

    if (!uploaderProfileId) {
      await deleteEvidenceFile(
        storagePath,
      ).catch(() => {})

      return NextResponse.json(
        {
          error:
            "User profile missing",
        },
        {
          status: 500,
        },
      )
    }

    const custody = [
      {
        action: "uploaded",
        actor: access.user.username,
        actor_id: access.user.id,
        timestamp:
          new Date().toISOString(),
        notes: description,
      },
    ]

    let inserted: EvidenceRow | null =
      null

    try {
      const { rows } =
        await query<EvidenceRow>(
          `
            INSERT INTO forensic_files (
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

            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              TRUE,
              $8,
              $9,
              $10::jsonb
            )

            RETURNING
              id,
              file_name,
              storage_path
          `,
          [
            access.caseId,
            uploaded.name,
            uploaded.size,
            uploaded.type ||
              "application/octet-stream",
            hash,
            uploaderProfileId,
            storagePath,
            evidenceType,
            description,
            JSON.stringify(
              custody,
            ),
          ],
        )

      inserted =
        rows[0] || null
    } catch (databaseError) {
      await deleteEvidenceFile(
        storagePath,
      ).catch(() => {})

      throw databaseError
    }

    if (!inserted) {
      await deleteEvidenceFile(
        storagePath,
      ).catch(() => {})

      throw new Error(
        "Evidence record was not created.",
      )
    }

    await recordInvestigationTimeline(
      access.caseId,
      access.user.id,
      "evidence_uploaded",
      "Evidence Uploaded",
      uploaded.name,
    )

    await emitCaseWorkspaceEvent({
      type: "evidence.uploaded",
      case_id: access.caseId,
      actor_id: access.user.id,
      record_id: inserted.id,
      data: {
        file_name:
          uploaded.name,
        evidence_type:
          evidenceType,
      },
    })

    await auditLog(
      access.user.id,
      "evidence_uploaded",
      request,
      {
        case_id:
          access.caseId,
        forensic_file_id:
          inserted.id,
      },
    )

    return NextResponse.json(
      {
        success: true,
        id: inserted.id,
        file_hash: hash,
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "CASE EVIDENCE UPLOAD ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error: "Upload failed",
      },
      {
        status: 500,
      },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const access =
      await requireCaseOperationalAccess(
        request,
        id,
      )

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      )
    }

    if (
      !canManageEvidence(
        access.user.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to remove evidence from this case.",
        },
        {
          status: 403,
        },
      )
    }

    const body =
      await request.json()

    const evidenceId =
      optionalText(body?.id)

    if (!evidenceId) {
      return NextResponse.json(
        {
          error:
            "Evidence id required",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * Fetch first so we retain the storage path.
     * The case_id condition prevents deleting an
     * evidence record belonging to another case.
     */
    const existingResult =
      await query<EvidenceRow>(
        `
          SELECT
            id,
            file_name,
            storage_path

          FROM forensic_files

          WHERE
            id = $1
            AND case_id = $2

          LIMIT 1
        `,
        [
          evidenceId,
          access.caseId,
        ],
      )

    const existing =
      existingResult.rows[0]

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Evidence not found",
        },
        {
          status: 404,
        },
      )
    }

    /*
     * Remove the database record only after
     * we've captured the storage path.
     */
    const deletedResult =
      await query<EvidenceRow>(
        `
          DELETE FROM forensic_files

          WHERE
            id = $1
            AND case_id = $2

          RETURNING
            id,
            file_name,
            storage_path
        `,
        [
          evidenceId,
          access.caseId,
        ],
      )

    const deleted =
      deletedResult.rows[0]

    if (!deleted) {
      return NextResponse.json(
        {
          error:
            "Evidence could not be removed.",
        },
        {
          status: 409,
        },
      )
    }

    /*
     * Storage cleanup is best-effort after the
     * database record has been removed.
     */
    if (deleted.storage_path) {
      try {
        await deleteEvidenceFile(
          deleted.storage_path,
        )
      } catch (storageError) {
        console.error(
          "CASE EVIDENCE STORAGE DELETE ERROR:",
          storageError,
        )
      }
    }

    /*
     * Preserve the existing investigation
     * audit/timeline integration.
     */
    await recordInvestigationTimeline(
      access.caseId,
      access.user.id,
      "evidence_deleted",
      "Evidence Removed",
      deleted.file_name || "",
    )

    await emitCaseWorkspaceEvent({
      type: "evidence.deleted",
      case_id: access.caseId,
      actor_id: access.user.id,
      record_id: deleted.id,
      data: {
        file_name:
          deleted.file_name,
      },
    })

    await auditLog(
      access.user.id,
      "evidence_deleted",
      request,
      {
        case_id:
          access.caseId,
        forensic_file_id:
          deleted.id,
      },
    )

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(
      "CASE EVIDENCE DELETE ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error: "Delete failed",
      },
      {
        status: 500,
      },
    )
  }
}
