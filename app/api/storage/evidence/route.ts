import { NextRequest, NextResponse } from "next/server"
import { createSignedUrlForBucket } from "@/lib/services/storage-service"
import { auditLog, getCurrentUser } from "@/lib/auth"
import {
  canUseCaseOperationalAccess,
  canUseCaseOversightRead,
  canUseCaseReviewAccess,
  profileIdForUser,
} from "@/lib/investigation-workspace"
import { query } from "@/lib/db"

const SIGNED_URL_TTL_SECONDS = 5 * 60

type EvidenceRow = {
  id: string
  case_id: string
  storage_path: string | null
  is_evidence: boolean | null
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const evidenceId =
      url.searchParams.get("id") ||
      url.searchParams.get("evidence_id") ||
      url.searchParams.get("file_id")

    if (!evidenceId) {
      return NextResponse.json({ error: "Evidence id required" }, { status: 400 })
    }

    if (url.searchParams.has("path")) {
      await auditLog(user.id, "evidence_download_path_rejected", req, {})
      return NextResponse.json({ error: "Evidence id required" }, { status: 400 })
    }

    const evidence = await query<EvidenceRow>(
      `
      SELECT id, case_id, storage_path, is_evidence
      FROM forensic_files
      WHERE id = $1
      LIMIT 1
      `,
      [evidenceId],
    )

    const row = evidence.rows[0]

    if (!row?.storage_path || row.is_evidence === false) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const profileId = await profileIdForUser(user.id)
    const isClient = user.role === "client"

    const clientOwnsCase = isClient && profileId
      ? await query<{ exists: boolean }>(
          `
          SELECT EXISTS (
            SELECT 1
            FROM cases
            WHERE id = $1
              AND (client_profile_id = $2 OR case_user_id = $2)
          ) AS exists
          `,
          [row.case_id, profileId],
        )
      : null

    const allowed =
      !isClient &&
      (
        (await canUseCaseOperationalAccess(user.id, user.role, row.case_id)) ||
        (await canUseCaseReviewAccess(user.id, user.role, row.case_id)) ||
        (await canUseCaseOversightRead(user.id, user.role, row.case_id))
      )

    if (!allowed || clientOwnsCase?.rows[0]?.exists) {
      await auditLog(user.id, "evidence_download_forbidden", req, { case_id: row.case_id })
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const signed = await createSignedUrlForBucket("evidence", row.storage_path, SIGNED_URL_TTL_SECONDS)
    await auditLog(user.id, "evidence_download_signed", req, {
      case_id: row.case_id,
      evidence_id: row.id,
      ttl_seconds: SIGNED_URL_TTL_SECONDS,
    })
    return NextResponse.redirect(signed)
  } catch (err) {
    console.error("EVIDENCE SIGN ERROR", err)
    return NextResponse.json({ error: "Unable to create evidence download" }, { status: 400 })
  }
}
