import { NextRequest, NextResponse } from "next/server"

import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import {
  profileIdForUser,
  recordInvestigationTimeline,
  requireCaseOperationalAccess,
  requireCaseReadAccess,
  resolveCaseId,
} from "@/lib/investigation-workspace"

const MAX_TITLE_LENGTH = 160
const MAX_CONTENT_LENGTH = 5000
const MAX_TYPE_LENGTH = 64
const ALLOWED_UPDATE_TYPES = new Set([
  "case_update",
  "progress",
  "status_change",
  "assignment",
  "evidence",
  "report",
  "payment",
  "entity_created",
  "entity_updated",
  "relationship_created",
  "relationship_updated",
  "observation_added",
  "timeline",
])

async function clientOwnsCase(userId: string, caseId: string) {
  const profileId = await profileIdForUser(userId)
  if (!profileId) return false

  const result = await query<{ exists: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM cases
      WHERE id = $1
        AND (client_profile_id = $2 OR case_user_id = $2)
    ) AS exists
    `,
    [caseId, profileId],
  )

  return Boolean(result.rows[0]?.exists)
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null
  const text = value.trim()
  return text ? text.slice(0, maxLength) : null
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await context.params
    const caseId = await resolveCaseId(id)
    if (!caseId) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (user.role === "client") {
      if (!(await clientOwnsCase(user.id, caseId))) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }

      await auditLog(user.id, "case_updates_client_internal_hidden", request, { case_id: caseId })
      return NextResponse.json([])
    }

    const access = await requireCaseReadAccess(request, caseId)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const result = await query(
      `
      SELECT
        cu.id,
        cu.case_id,
        cu.updated_by,
        cu.update_type,
        cu.title,
        cu.content,
        cu.created_at,
        u.username
      FROM case_updates cu
      LEFT JOIN user_profiles up ON up.id = cu.updated_by
      LEFT JOIN app_users u ON u.id = up.user_id
      WHERE cu.case_id = $1
      ORDER BY cu.created_at DESC
      `,
      [access.caseId],
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("CASE UPDATES GET ERROR", error)
    return NextResponse.json({ error: "Failed loading updates" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const access = await requireCaseOperationalAccess(request, id)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const body = await request.json()
    const allowedKeys = new Set(["title", "content", "update_type"])
    const unknownKeys = Object.keys(body || {}).filter((key) => !allowedKeys.has(key))
    if (unknownKeys.length) {
      return NextResponse.json({ error: "Unsupported update fields" }, { status: 400 })
    }

    const title = cleanText(body.title, MAX_TITLE_LENGTH)
    const content = cleanText(body.content, MAX_CONTENT_LENGTH)
    const updateType = cleanText(body.update_type, MAX_TYPE_LENGTH) || "case_update"

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    if (!ALLOWED_UPDATE_TYPES.has(updateType)) {
      return NextResponse.json({ error: "Unsupported update type" }, { status: 400 })
    }

    await recordInvestigationTimeline(access.caseId, access.user.id, updateType, title, content)
    await auditLog(access.user.id, "case_update_created", request, {
      case_id: access.caseId,
      update_type: updateType,
    })

    const profileId = await profileIdForUser(access.user.id)
    const latest = await query(
      `
      SELECT id, case_id, updated_by, update_type, title, content, created_at
      FROM case_updates
      WHERE case_id = $1
        AND updated_by IS NOT DISTINCT FROM $2::uuid
        AND title = $3
        AND content = $4
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [access.caseId, profileId, title, content],
    )

    return NextResponse.json(latest.rows[0] || { success: true }, { status: 201 })
  } catch (error) {
    console.error("CASE UPDATES POST ERROR", error)
    return NextResponse.json({ error: "Failed creating update" }, { status: 500 })
  }
}
