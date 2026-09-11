import { NextRequest, NextResponse } from "next/server"

import {
  query,
} from "@/lib/db"

import {
  requireInvestigationWorkspace,
} from "@/lib/investigation-workspace"

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>
  },
) {
  try {
    const { id } = await params

    const access =
      await requireInvestigationWorkspace(
        request,
        id,
      )

    if (!access.ok) {
      return NextResponse.json(
        {
          error:
            access.error,
        },
        {
          status:
            access.status,
        },
      )
    }

    const team =
      await query(
        `
          SELECT
            ca.id,
            ca.case_id,

            ca.assigned_to,
            ca.assigned_by,

            ca.assigned_at,
            ca.removed_at,

            ca.assignment_role,
            ca.status,
            ca.deadline,
            ca.notes,

            ca.accepted_at,
            ca.rejected_at,
            ca.rejection_reason,

            au.id AS user_id,
            au.username,
            au.email,
            au.role,

            up.id AS assigned_to_profile_id,

            assigned_by_user.username
              AS assigned_by_username

          FROM case_assignments ca

          INNER JOIN user_profiles up
            ON up.id = ca.assigned_to

          INNER JOIN app_users au
            ON au.id = up.user_id

          LEFT JOIN user_profiles assigned_by_profile
            ON assigned_by_profile.id =
              ca.assigned_by

          LEFT JOIN app_users assigned_by_user
            ON assigned_by_user.id =
              assigned_by_profile.user_id

          WHERE
            ca.case_id = $1

          ORDER BY
            CASE
              WHEN ca.status = 'pending'
                THEN 0
              WHEN ca.status IN (
                'approved',
                'active',
                'accepted',
                'assigned'
              )
                THEN 1
              WHEN ca.status = 'rejected'
                THEN 2
              ELSE 3
            END,

            ca.assigned_at DESC
        `,
        [access.caseId],
      )

    return NextResponse.json(
      team.rows,
    )
  } catch (error) {
    console.error(
      "CASE TEAM GET ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to load case team",
      },
      {
        status: 500,
      },
    )
  }
}