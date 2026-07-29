import { NextRequest } from "next/server"
import { auditLog, getCurrentUser, isAdminRole, type AppUser } from "@/lib/auth"
import { query } from "@/lib/db"

export type WorkspaceUser = AppUser

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value)
}

export async function resolveCaseId(caseId: string) {
  if (isUuid(caseId)) return caseId

  const result = await query<{ id: string }>(
    "SELECT id FROM cases WHERE case_number=$1 OR id::text=$1 LIMIT 1",
    [caseId],
  )

  return result.rows[0]?.id ?? null
}

export async function profileIdForUser(userId: string) {
  const profile = await query<{ id: string }>(
    "SELECT id FROM user_profiles WHERE user_id=$1 LIMIT 1",
    [userId],
  ).catch(() => ({ rows: [] }))

  return profile.rows[0]?.id ?? null
}

export async function canUseInvestigationWorkspace(userId: string, role: string, caseId: string) {
  if (isAdminRole(role)) return true
  if (!["investigator", "analyst"].includes(role)) return false

  const profileId = await profileIdForUser(userId)
  if (!profileId) return false

  const access = await query<{ id: string }>(
    `
    SELECT c.id
    FROM cases c
    LEFT JOIN case_assignments ca
      ON ca.case_id = c.id
      AND ca.assigned_to = $2
      AND ca.removed_at IS NULL
    WHERE c.id = $1
      AND (
        c.assigned_to = $2
        OR ca.id IS NOT NULL
      )
    LIMIT 1
    `,
    [caseId, profileId],
  )

  return Boolean(access.rows.length)
}

export async function requireInvestigationWorkspace(
  request: NextRequest,
  rawCaseId: string,
): Promise<{ ok: true; user: WorkspaceUser; caseId: string } | { ok: false; status: number; error: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, status: 401, error: "Unauthorized" }

  const caseId = await resolveCaseId(rawCaseId)
  if (!caseId) return { ok: false, status: 404, error: "Case not found" }

  if (!(await canUseInvestigationWorkspace(user.id, user.role, caseId))) {
    await auditLog(user.id, "investigation_workspace_forbidden", request, { case_id: caseId })
    return { ok: false, status: 403, error: "Forbidden" }
  }

  return { ok: true, user, caseId }
}

export function toScore(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  const score = Number(value)
  if (!Number.isFinite(score)) return null
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function optionalText(value: unknown) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text ? text : null
}

export function aliasesJson(value: unknown) {
  if (Array.isArray(value)) return JSON.stringify(value.map((item) => String(item).trim()).filter(Boolean))
  if (typeof value === "string") {
    const aliases = value.split(",").map((item) => item.trim()).filter(Boolean)
    return JSON.stringify(aliases)
  }
  return JSON.stringify([])
}

export async function recordInvestigationTimeline(
  caseId: string,
  userId: string | null,
  updateType: string,
  title: string,
  content: string,
) {
  const profileId = userId ? await profileIdForUser(userId) : null

  await query(
    `
    INSERT INTO case_updates (case_id, updated_by, update_type, title, content)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [caseId, profileId, updateType, title, content],
  )
}
