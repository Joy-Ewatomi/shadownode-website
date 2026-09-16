import { NextRequest } from "next/server"
import { auditLog, getCurrentUser, type AppUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { emitCaseWorkspaceEvent } from "@/lib/realtime/workspace-events"
import {
  canCaseFunctionInvestigate,
  canCaseFunctionReview,
  isAdminLikeRole,
  isStaffLikeRole,
  isSuperAdministratorRole,
} from "@/lib/role-access"

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

type CaseAssignmentAccess = {
  assignment_role: string | null
  status: string | null
}

async function activeCaseAssignmentForUser(userId: string, caseId: string) {
  const profileId = await profileIdForUser(userId)
  if (!profileId) return null

  const access = await query<CaseAssignmentAccess>(
    `
    SELECT ca.assignment_role, COALESCE(ca.status, 'assigned') AS status
    FROM case_assignments ca
    WHERE ca.case_id = $1
      AND ca.assigned_to = $2
      AND ca.removed_at IS NULL
      AND COALESCE(ca.status, 'assigned') IN (
        'assigned',
        'approved',
        'active',
        'accepted'
      )
    ORDER BY ca.assigned_at DESC
    LIMIT 1
    `,
    [caseId, profileId],
  )

  return access.rows[0] ?? null
}

export async function canUseInvestigationWorkspace(userId: string, role: string, caseId: string) {
  return canUseCaseOperationalAccess(userId, role, caseId)
}

export async function canUseCaseOperationalAccess(userId: string, role: string, caseId: string) {
  if (role === "client") return false
  if (!isStaffLikeRole(role) && !isAdminLikeRole(role)) return false

  const access = await activeCaseAssignmentForUser(userId, caseId)

  return canCaseFunctionInvestigate(
    access?.assignment_role,
  )
}

export async function canUseCaseReviewAccess(userId: string, role: string, caseId: string) {
  if (role === "client") return false
  if (!isStaffLikeRole(role) && !isAdminLikeRole(role)) return false

  const access = await activeCaseAssignmentForUser(userId, caseId)

  return canCaseFunctionReview(access?.assignment_role)
}

export async function canUseCaseOversightRead(userId: string, role: string, caseId: string) {
  void userId
  void caseId
  return isSuperAdministratorRole(role)
}

type CaseAccessResult =
  | { ok: true; user: WorkspaceUser; caseId: string }
  | { ok: false; status: number; error: string }

async function requireCaseAccess(
  request: NextRequest,
  rawCaseId: string,
  check: (userId: string, role: string, caseId: string) => Promise<boolean>,
  auditAction: string,
): Promise<CaseAccessResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, status: 401, error: "Unauthorized" }

  const caseId = await resolveCaseId(rawCaseId)
  if (!caseId) return { ok: false, status: 404, error: "Case not found" }

  if (!(await check(user.id, user.role, caseId))) {
    await auditLog(user.id, auditAction, request, { case_id: caseId })
    return { ok: false, status: 403, error: "Forbidden" }
  }

  return { ok: true, user, caseId }
}

export async function requireCaseOperationalAccess(
  request: NextRequest,
  rawCaseId: string,
): Promise<CaseAccessResult> {
  return requireCaseAccess(
    request,
    rawCaseId,
    canUseCaseOperationalAccess,
    "case_operational_access_forbidden",
  )
}

export async function requireCaseReviewAccess(
  request: NextRequest,
  rawCaseId: string,
): Promise<CaseAccessResult> {
  return requireCaseAccess(
    request,
    rawCaseId,
    canUseCaseReviewAccess,
    "case_review_access_forbidden",
  )
}

export async function requireCaseOversightRead(
  request: NextRequest,
  rawCaseId: string,
): Promise<CaseAccessResult> {
  return requireCaseAccess(
    request,
    rawCaseId,
    canUseCaseOversightRead,
    "case_oversight_read_forbidden",
  )
}

export async function requireCaseReadAccess(
  request: NextRequest,
  rawCaseId: string,
): Promise<CaseAccessResult> {
  return requireCaseAccess(
    request,
    rawCaseId,
    async (userId, role, caseId) =>
      (await canUseCaseOperationalAccess(userId, role, caseId)) ||
      (await canUseCaseReviewAccess(userId, role, caseId)) ||
      (await canUseCaseOversightRead(userId, role, caseId)),
    "case_read_access_forbidden",
  )
}

export const requireInvestigationWorkspace = requireCaseOperationalAccess

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

  const inserted = await query<{ id: string }>(
    `
    INSERT INTO case_updates (case_id, updated_by, update_type, title, content)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
    `,
    [caseId, profileId, updateType, title, content],
  )

  await emitCaseWorkspaceEvent({
    type: "timeline.created",
    case_id: caseId,
    actor_id: userId,
    record_id: inserted.rows[0]?.id ?? null,
    data: { update_type: updateType, title, content },
  })
}
