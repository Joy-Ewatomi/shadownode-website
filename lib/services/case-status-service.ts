import type { DatabasePoolClient } from "@/lib/db"
import { query } from "@/lib/db"

export const CANONICAL_CASE_STATUSES = [
  "awaiting_payment",
  "awaiting_assignment",
  "active",
  "waiting_client",
  "waiting_evidence",
  "report_review",
  "completed",
  "closed",
  "archived",
] as const

export type CaseStatus = (typeof CANONICAL_CASE_STATUSES)[number]

type TransitionActor =
  | "system"
  | "assignment_workflow"
  | "lead_investigator"
  | "investigator"
  | "analyst"
  | "administrator"
  | "super_administrator"
  | "reviewer"
  | "client"

type TransitionOptions = {
  caseId: string
  to: CaseStatus
  actorUserId?: string | null
  actorProfileId?: string | null
  actor: TransitionActor
  reason: string
  sourceAction: string
  executor?: Pick<DatabasePoolClient, "query">
}

const TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  awaiting_payment: ["awaiting_assignment"],
  awaiting_assignment: ["active"],
  active: ["waiting_client", "waiting_evidence", "report_review"],
  waiting_client: ["active", "report_review"],
  waiting_evidence: ["active", "report_review"],
  report_review: ["active", "completed"],
  completed: ["closed", "active"],
  closed: ["archived", "active"],
  archived: [],
}

const ACTOR_TRANSITIONS: Record<TransitionActor, string[]> = {
  system: ["awaiting_payment:awaiting_assignment"],
  assignment_workflow: ["awaiting_assignment:active"],
  lead_investigator: [
    "active:waiting_client",
    "active:waiting_evidence",
    "waiting_client:active",
    "waiting_evidence:active",
    "active:report_review",
    "waiting_client:report_review",
    "waiting_evidence:report_review",
  ],
  investigator: [
    "active:waiting_client",
    "active:waiting_evidence",
    "waiting_client:active",
    "waiting_evidence:active",
    "active:report_review",
    "waiting_client:report_review",
    "waiting_evidence:report_review",
  ],
  analyst: [
    "active:waiting_client",
    "active:waiting_evidence",
    "waiting_client:active",
    "waiting_evidence:active",
    "active:report_review",
    "waiting_client:report_review",
    "waiting_evidence:report_review",
  ],
  administrator: [
    "active:waiting_client",
    "active:waiting_evidence",
    "waiting_client:active",
    "waiting_evidence:active",
    "active:report_review",
    "waiting_client:report_review",
    "waiting_evidence:report_review",
  ],
  super_administrator: [
    "report_review:completed",
    "completed:closed",
    "closed:archived",
    "closed:active",
    "completed:active",
  ],
  reviewer: [],
  client: [],
}

export function isCanonicalCaseStatus(status: string | null | undefined): status is CaseStatus {
  return CANONICAL_CASE_STATUSES.includes(status as CaseStatus)
}

export function normalizeCaseStatusForQuery(status: string | null | undefined): CaseStatus | null {
  const normalized = String(status || "").trim().toLowerCase()

  switch (normalized) {
    case "awaiting-payment":
      return "awaiting_payment"
    case "awaiting-assignment":
      return "awaiting_assignment"
    case "in-progress":
    case "in_progress":
    case "investigation_in_progress":
    case "assigned":
      return "active"
    case "waiting-client":
    case "awaiting_client":
      return "waiting_client"
    case "waiting-evidence":
      return "waiting_evidence"
    case "review":
      return "report_review"
    default:
      return isCanonicalCaseStatus(normalized) ? normalized : null
  }
}

export async function transitionCaseStatus({
  caseId,
  to,
  actorUserId = null,
  actorProfileId = null,
  actor,
  reason,
  sourceAction,
  executor = { query },
}: TransitionOptions) {
  const current = await executor.query<{
    status: string | null
  }>(
    `
    SELECT status
    FROM cases
    WHERE id = $1
    FOR UPDATE
    `,
    [caseId],
  )

  const from = current.rows[0]?.status
  if (!from) throw new Error("Case not found")
  if (from === to) {
    return {
      changed: false,
      previousStatus: from,
      newStatus: to,
    }
  }
  if (!isCanonicalCaseStatus(from)) {
    throw new Error(`Cannot transition from unknown case status: ${from}`)
  }

  const transitionKey = `${from}:${to}`
  if (!TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid case status transition: ${from} -> ${to}`)
  }
  if (!ACTOR_TRANSITIONS[actor].includes(transitionKey)) {
    throw new Error(`Actor ${actor} cannot perform case status transition: ${from} -> ${to}`)
  }

  await executor.query(
    `
    UPDATE cases
    SET status = $2, updated_at = NOW()
    WHERE id = $1
    `,
    [caseId, to],
  )

  await executor.query(
    `
    INSERT INTO case_updates (
      case_id,
      updated_by,
      update_type,
      title,
      content
    )
    VALUES (
      $1,
      $2,
      'status_change',
      'Case status changed',
      $3
    )
    `,
    [
      caseId,
      actorProfileId,
      `${from} -> ${to}. ${reason}`,
    ],
  )

  await executor.query(
    `
    INSERT INTO audit_logs (
      user_id,
      action,
      metadata,
      created_at
    )
    VALUES (
      $1,
      $2,
      $3::jsonb,
      NOW()
    )
    `,
    [
      actorUserId,
      "case_status_transition",
      JSON.stringify({
        case_id: caseId,
        previous_status: from,
        new_status: to,
        reason,
        source_action: sourceAction,
        actor,
      }),
    ],
  )

  return {
    changed: true,
    previousStatus: from,
    newStatus: to,
  }
}
