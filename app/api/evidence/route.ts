import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"
import {
  canUseInvestigationWorkspace,
  profileIdForUser,
  resolveCaseId,
} from "@/lib/investigation-workspace"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const rawCaseId = searchParams.get("case_id")
    const caseId = rawCaseId ? await resolveCaseId(rawCaseId) : null

    if (rawCaseId && !caseId) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    if (caseId && !(await canUseInvestigationWorkspace(user.id, user.role, caseId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const profileId = await profileIdForUser(user.id)

    const result = await query(
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
        ff.created_at,
        ff.updated_at,
        ff.chain_of_custody,
        c.case_number,
        c.title AS case_title,
        au.username AS uploaded_by
      FROM forensic_files ff
      JOIN cases c ON c.id = ff.case_id
      LEFT JOIN user_profiles up ON up.id = ff.uploaded_by
      LEFT JOIN app_users au ON au.id = up.user_id
      WHERE
        ($1::uuid IS NULL OR ff.case_id = $1::uuid)
        AND (
          $2::boolean = TRUE
          OR c.client_profile_id = $3::uuid
          OR c.assigned_to = $3::uuid
          OR EXISTS (
            SELECT 1
            FROM case_assignments ca
            WHERE ca.case_id = c.id
              AND ca.assigned_to = $3::uuid
              AND ca.removed_at IS NULL
          )
        )
      ORDER BY ff.created_at DESC
      `,
      [caseId, isAdminRole(user.role), profileId],
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("EVIDENCE GET ERROR", error)
    return NextResponse.json({ error: "Failed to load evidence" }, { status: 500 })
  }
}
