import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireInvestigationWorkspace } from "@/lib/investigation-workspace"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

async function resolveCaseId(caseId: string) {
  if (isUuid(caseId)) {
    return caseId
  }

  const result = await query<{ id: string }>(
    `
      SELECT id
      FROM cases
      WHERE case_number = $1
      LIMIT 1
    `,
    [caseId],
  )

  return result.rows[0]?.id ?? null
}

type CaseRow = {
  id: string
  case_number: string | null
  title: string | null
  description: string | null
  service_type: string | null
  status: string | null
  priority: string | null
  progress: number | string | null
  budget: number | string | null
  payment_status: string | null
  estimated_completion: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string | null
  updated_at: string | null
  investigator_username: string | null
}

type TeamRow = {
  id: string
  case_id: string
  assigned_to: string
  assigned_by: string | null
  assigned_at: string | null
  removed_at: string | null

  user_id: string
  username: string | null
  full_name: string | null
  email: string | null
  role: string | null

  assignment_role: string | null
  status: string | null
  deadline: string | null
  notes: string | null

  accepted_at: string | null
  rejected_at: string | null
  rejection_reason: string | null

  assigned_by_username: string | null
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>
  },
) {
  try {
    const { id } = await context.params

    if (!id?.trim()) {
      return NextResponse.json(
        {
          error: "Case ID is required",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * ============================================================
     * RESOLVE CASE
     * ============================================================
     */

    const resolvedCaseId =
      await resolveCaseId(id)

    if (!resolvedCaseId) {
      return NextResponse.json(
        {
          error: "Case not found",
        },
        {
          status: 404,
        },
      )
    }

    /*
     * ============================================================
     * AUTHORIZATION
     * ============================================================
     */

    const access =
      await requireInvestigationWorkspace(
        request,
        resolvedCaseId,
      )

    if (!access.ok) {
      return NextResponse.json(
        {
          error: access.error,
        },
        {
          status: access.status,
        },
      )
    }

    /*
     * ============================================================
     * LOAD CASE
     * ============================================================
     */

    const caseResult =
      await query<CaseRow>(
        `
          SELECT
            c.id,
            c.case_number,
            c.title,
            c.description,
            c.service_type,
            c.status,
            c.priority,
            c.progress,
            c.budget,
            c.payment_status,
            c.estimated_completion,
            c.started_at,
            c.completed_at,
            c.created_at,
            c.updated_at,

            au.username AS investigator_username

          FROM cases c

          LEFT JOIN user_profiles up
            ON up.id = c.assigned_to

          LEFT JOIN app_users au
            ON au.id = up.user_id

          WHERE c.id = $1

          LIMIT 1
        `,
        [access.caseId],
      )

    const caseRow =
      caseResult.rows[0]

    if (!caseRow) {
      return NextResponse.json(
        {
          error: "Case not found",
        },
        {
          status: 404,
        },
      )
    }

    /*
     * ============================================================
     * LOAD STATISTICS + TEAM
     * ============================================================
     *
     * IMPORTANT:
     *
     * Active team count only includes active/approved
     * assignments.
     *
     * Pending assignments are returned separately so the
     * frontend can display "Pending Approval" rather than
     * incorrectly presenting them as active personnel.
     */

    const [
      entitiesResult,
      relationshipsResult,
      evidenceResult,
      updatesResult,
      notesResult,
      reportsResult,
      activeAssignmentsResult,
      pendingAssignmentsResult,
      rejectedAssignmentsResult,
      teamResult,
    ] = await Promise.all([
      query<{ count: number }>(
        `
          SELECT COUNT(*)::int AS count
          FROM investigation_entities
          WHERE case_id = $1
        `,
        [access.caseId],
      ),

      query<{ count: number }>(
        `
          SELECT COUNT(*)::int AS count
          FROM entity_relationships
          WHERE case_id = $1
        `,
        [access.caseId],
      ),

      query<{ count: number }>(
        `
          SELECT COUNT(*)::int AS count
          FROM forensic_files
          WHERE case_id = $1
        `,
        [access.caseId],
      ),

      query<{ count: number }>(
        `
          SELECT COUNT(*)::int AS count
          FROM case_updates
          WHERE case_id = $1
        `,
        [access.caseId],
      ),

      query<{ count: number }>(
        `
          SELECT COUNT(*)::int AS count
          FROM case_notes
          WHERE case_id = $1
        `,
        [access.caseId],
      ),

      query<{ count: number }>(
        `
          SELECT COUNT(*)::int AS count
          FROM case_reports
          WHERE case_id = $1
        `,
        [access.caseId],
      ),

      /*
       * ACTIVE TEAM
       */
      query<{ count: number }>(
        `
          SELECT COUNT(*)::int AS count
          FROM case_assignments
          WHERE case_id = $1
            AND removed_at IS NULL
            AND COALESCE(
              status,
              'assigned'
            ) IN (
              'assigned',
              'approved',
              'active',
              'accepted'
            )
        `,
        [access.caseId],
      ),

      /*
       * PENDING APPROVAL
       */
      query<{ count: number }>(
        `
          SELECT COUNT(*)::int AS count
          FROM case_assignments
          WHERE case_id = $1
            AND removed_at IS NULL
            AND status = 'pending'
        `,
        [access.caseId],
      ),

      /*
       * REJECTED
       */
      query<{ count: number }>(
        `
          SELECT COUNT(*)::int AS count
          FROM case_assignments
          WHERE case_id = $1
            AND status = 'rejected'
        `,
        [access.caseId],
      ),

      /*
       * Return assignment records with their real state.
       *
       * This allows the UI to distinguish:
       *
       * approved/active
       * pending
       * rejected
       * removed
       */
      query<TeamRow>(
        `
          SELECT
            ca.id,
            ca.case_id,
            ca.assigned_to,
            ca.assigned_by,
            ca.assigned_at,
            ca.removed_at,

            au.id AS user_id,
            au.username,
            up.full_name,
            au.email,
            au.role,

            ca.assignment_role,

            COALESCE(
              ca.status,
              'assigned'
            ) AS status,

            ca.deadline,
            ca.notes,

            ca.accepted_at,
            ca.rejected_at,
            ca.rejection_reason,

            assigned_by_user.username
              AS assigned_by_username

          FROM case_assignments ca

          JOIN user_profiles up
            ON up.id = ca.assigned_to

          JOIN app_users au
            ON au.id = up.user_id

          LEFT JOIN user_profiles assigned_by_profile
            ON assigned_by_profile.id =
               ca.assigned_by

          LEFT JOIN app_users assigned_by_user
            ON assigned_by_user.id =
               assigned_by_profile.user_id

          WHERE ca.case_id = $1

          ORDER BY
            CASE
              WHEN ca.removed_at IS NULL
                AND COALESCE(
                  ca.status,
                  'assigned'
                ) IN (
                  'assigned',
                  'approved',
                  'active',
                  'accepted'
                )
                THEN 1

              WHEN ca.removed_at IS NULL
                AND ca.status = 'pending'
                THEN 2

              WHEN ca.status = 'rejected'
                THEN 3

              ELSE 4
            END,

            ca.assigned_at DESC
        `,
        [access.caseId],
      ),
    ])

    /*
     * ============================================================
     * BUILD TEAM GROUPS
     * ============================================================
     */

    const allTeam =
      teamResult.rows

    const activeTeam =
      allTeam.filter(
        (member) =>
          !member.removed_at &&
          [
            "assigned",
            "approved",
            "active",
            "accepted",
          ].includes(
            member.status ||
              "assigned",
          ),
      )

    const pendingTeam =
      allTeam.filter(
        (member) =>
          !member.removed_at &&
          member.status ===
            "pending",
      )

    const rejectedTeam =
      allTeam.filter(
        (member) =>
          member.status ===
          "rejected",
      )

    const removedTeam =
      allTeam.filter(
        (member) =>
          Boolean(member.removed_at),
      )

    /*
     * ============================================================
     * RETURN DASHBOARD CONTRACT
     * ============================================================
     */

    return NextResponse.json({
      case: {
        id: caseRow.id,
        case_number:
          caseRow.case_number,
        title:
          caseRow.title,
        description:
          caseRow.description,
        service_type:
          caseRow.service_type,
        status:
          caseRow.status,
        priority:
          caseRow.priority,

        progress:
          caseRow.progress !==
          null
            ? Number(
                caseRow.progress,
              )
            : 0,

        budget:
          caseRow.budget !==
          null
            ? Number(
                caseRow.budget,
              )
            : null,

        payment_status:
          caseRow.payment_status,

        estimated_completion:
          caseRow.estimated_completion,

        started_at:
          caseRow.started_at,

        completed_at:
          caseRow.completed_at,

        created_at:
          caseRow.created_at,

        updated_at:
          caseRow.updated_at,

        investigator_username:
          caseRow.investigator_username,
      },

      stats: {
        entities:
          Number(
            entitiesResult.rows[0]
              ?.count ?? 0,
          ),

        relationships:
          Number(
            relationshipsResult
              .rows[0]?.count ?? 0,
          ),

        evidence:
          Number(
            evidenceResult.rows[0]
              ?.count ?? 0,
          ),

        updates:
          Number(
            updatesResult.rows[0]
              ?.count ?? 0,
          ),

        notes:
          Number(
            notesResult.rows[0]
              ?.count ?? 0,
          ),

        reports:
          Number(
            reportsResult.rows[0]
              ?.count ?? 0,
          ),

        /*
         * ONLY ACTIVE TEAM
         */
        assigned_investigators:
          Number(
            activeAssignmentsResult
              .rows[0]?.count ?? 0,
          ),

        /*
         * Operational assignment state
         */
        pending_assignments:
          Number(
            pendingAssignmentsResult
              .rows[0]?.count ?? 0,
          ),

        rejected_assignments:
          Number(
            rejectedAssignmentsResult
              .rows[0]?.count ?? 0,
          ),
      },

      /*
       * Keep the complete assignment list
       * for the case workspace.
       */
      team: allTeam,

      /*
       * Explicit grouped collections make the
       * distinction available to the UI.
       */
      active_team:
        activeTeam,

      pending_team:
        pendingTeam,

      rejected_team:
        rejectedTeam,

      removed_team:
        removedTeam,
    })
  } catch (error) {
    console.error(
      "CASE DASHBOARD ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to load case dashboard",
      },
      {
        status: 500,
      },
    )
  }
}