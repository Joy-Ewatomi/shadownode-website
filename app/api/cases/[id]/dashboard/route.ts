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
  email: string | null
  role: string | null
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
     *
     * Reuse the existing case-workspace authorization system.
     * The browser-supplied case ID never grants access by itself.
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
     */

    const [
      entitiesResult,
      relationshipsResult,
      evidenceResult,
      updatesResult,
      notesResult,
      assignmentsResult,
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
          FROM case_assignments
          WHERE case_id = $1
            AND removed_at IS NULL
            AND COALESCE(status, 'assigned') <> 'removed'
        `,
        [access.caseId],
      ),

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
            au.email,
            au.role,

            assigned_by_user.username
              AS assigned_by_username

          FROM case_assignments ca

          JOIN user_profiles up
            ON up.id = ca.assigned_to

          JOIN app_users au
            ON au.id = up.user_id

          LEFT JOIN user_profiles assigned_by_profile
            ON assigned_by_profile.id = ca.assigned_by

          LEFT JOIN app_users assigned_by_user
            ON assigned_by_user.id =
               assigned_by_profile.user_id

          WHERE ca.case_id = $1

          ORDER BY
            ca.removed_at NULLS FIRST,
            ca.assigned_at DESC
        `,
        [access.caseId],
      ),
    ])

    /*
     * ============================================================
     * RETURN DASHBOARD CONTRACT
     * ============================================================
     *
     * This matches what app/cases/[id]/page.tsx currently reads:
     *
     *   data.case
     *   data.stats
     *   data.team
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
          caseRow.progress !== null
            ? Number(caseRow.progress)
            : 0,
        budget:
          caseRow.budget !== null
            ? Number(caseRow.budget)
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
            entitiesResult.rows[0]?.count ?? 0,
          ),

        relationships:
          Number(
            relationshipsResult.rows[0]?.count ?? 0,
          ),

        evidence:
          Number(
            evidenceResult.rows[0]?.count ?? 0,
          ),

        updates:
          Number(
            updatesResult.rows[0]?.count ?? 0,
          ),

        notes:
          Number(
            notesResult.rows[0]?.count ?? 0,
          ),

        assigned_investigators:
          Number(
            assignmentsResult.rows[0]?.count ?? 0,
          ),
      },

      team:
        teamResult.rows,
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