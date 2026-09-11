import { NextRequest, NextResponse } from "next/server"
import {
  auditLog,
  getCurrentUser,
  isAdminRole,
} from "@/lib/auth"
import { query } from "@/lib/db"
import { emitCaseWorkspaceEvent } from "@/lib/realtime/workspace-events"

type AssignmentRole =
  | "investigator"
  | "analyst"
  | "administrator"
  | "super_administrator"

const ASSIGNMENT_ROLES: AssignmentRole[] = [
  "investigator",
  "analyst",
  "administrator",
  "super_administrator",
]

function isSuperAdministrator(
  role?: string | null,
) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

function isValidAssignmentRole(
  role: string,
): role is AssignmentRole {
  return ASSIGNMENT_ROLES.includes(
    role as AssignmentRole,
  )
}

async function requireAdmin() {
  const user = await getCurrentUser()

  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      ),
    }
  }

  if (!isAdminRole(user.role)) {
    return {
      response: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      ),
    }
  }

  return {
    user,
    response: null,
  }
}

/* ============================================================
   GET CASE COMMAND CENTER
============================================================ */

export async function GET() {
  try {
    const auth = await requireAdmin()

    if (auth.response) {
      return auth.response
    }

    const cases = await query(`
      SELECT
        c.id,
        c.case_number,
        c.title,
        c.description,
        c.service_type,
        c.status,
        c.priority,
        c.assigned_to,
        c.client_profile_id,
        c.case_user_id,
        c.organization_id,
        c.budget,
        c.estimated_completion,
        c.completed_at,
        c.created_at,
        c.updated_at,
        c.progress,
        c.payment_status,
        c.started_at,
        c.final_report_url,

        r.id AS request_id,
        r.user_id AS request_user_id,
        r.client_email,
        r.contact_method,
        r.token,
        r.is_anonymous,

        r.case_number AS request_case_number,
        r.title AS request_title,
        r.description AS request_description,
        r.service_type AS request_service_type,

        r.final_price,
        r.price_notes,
        r.ai_analysis,
        r.currency,
        r.ai_price_estimate,
        r.converted_case_id,
        r.ai_status,
        r.ai_complexity,
        r.ai_estimated_hours,
        r.ai_suggested_service,
        r.priority AS request_priority,
        r.ai_confidence,
        r.ai_reasoning,

        r.approved_quote_amount,
        r.approved_quote_currency,
        r.approved_quote_notes,
        r.approved_estimated_completion,
        r.quote_sent_at,
        r.client_decision_at,
        r.declined_reason,

        r.investigation_objective,

        r.subject_type,
        r.subject_full_name,
        r.subject_known_usernames,
        r.subject_emails,
        r.subject_phone_numbers,
        r.subject_location,
        r.subject_organization,
        r.subject_websites,

        r.subject_company_name,
        r.subject_company_website,
        r.subject_company_country,
        r.subject_company_industry,

        r.subject_domain,
        r.subject_url,
        r.subject_ip_address,
        r.subject_platform,

        r.existing_information,
        r.investigation_depth,
        r.confidentiality_level,
        r.authorization_confirmed,

        r.communication_method,

        r.subject_approximate_age,
        r.subject_height,
        r.subject_weight,
        r.subject_hair_color,
        r.subject_eye_color,
        r.subject_skin_tone,
        r.subject_distinguishing_marks,
        r.subject_nationality,
        r.subject_languages_spoken,
        r.subject_last_known_address,
        r.subject_last_known_occupation,
        r.subject_additional_usernames,
        r.subject_gaming_ids,
        r.subject_cryptocurrency_wallets,
        r.subject_domain_names,
        r.subject_ip_addresses,
        r.subject_vehicle_registration,

        r.supporting_links,

        client_user.username AS client_username,

        COALESCE(
          (
            SELECT COUNT(*)::int
            FROM forensic_files ff
            WHERE ff.case_id = c.id
          ),
          0
        ) AS evidence_count,

        COALESCE(
          (
            SELECT COUNT(*)::int
            FROM case_reports cr
            WHERE cr.case_id = c.id
          ),
          0
        ) AS report_count,

        COALESCE(
          (
            SELECT COUNT(*)::int
            FROM case_assignments ca_count
            WHERE
              ca_count.case_id = c.id
              AND ca_count.removed_at IS NULL
          ),
          0
        ) AS assignment_count,

        COALESCE(
          (
            SELECT COUNT(*)::int
            FROM case_assignments ca_pending
            WHERE
              ca_pending.case_id = c.id
              AND ca_pending.removed_at IS NULL
              AND ca_pending.status = 'pending'
          ),
          0
        ) AS pending_assignment_count,

        COALESCE(
          (
            SELECT COUNT(*)::int
            FROM case_assignments ca_active
            WHERE
              ca_active.case_id = c.id
              AND ca_active.removed_at IS NULL
              AND COALESCE(
                ca_active.status,
                'assigned'
              ) IN (
                'assigned',
                'approved',
                'active',
                'accepted'
              )
          ),
          0
        ) AS approved_assignment_count,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ca.id,
                'assigned_to', ca.assigned_to,
                'user_id', assigned_user.id,
                'username', assigned_user.username,
                'email', assigned_user.email,
                'user_role', assigned_user.role,

                'assignment_role',
                  COALESCE(
                    ca.assignment_role,
                    assigned_user.role
                  ),

                'status',
                  COALESCE(
                    ca.status,
                    'assigned'
                  ),

                'deadline', ca.deadline,
                'notes', ca.notes,

                'accepted_at', ca.accepted_at,
                'rejected_at', ca.rejected_at,
                'rejection_reason',
                  ca.rejection_reason,

                'assigned_by', ca.assigned_by,
                'assigned_at', ca.assigned_at,
                'removed_at', ca.removed_at,

                'assigned_by_username',
                  assigner_user.username
              )
              ORDER BY ca.assigned_at DESC
            )
            FROM case_assignments ca

            LEFT JOIN user_profiles assigned_profile
              ON assigned_profile.id = ca.assigned_to

            LEFT JOIN app_users assigned_user
              ON assigned_user.id = assigned_profile.user_id

            LEFT JOIN user_profiles assigner_profile
              ON assigner_profile.id = ca.assigned_by

            LEFT JOIN app_users assigner_user
              ON assigner_user.id = assigner_profile.user_id

            WHERE
              ca.case_id = c.id
              AND ca.removed_at IS NULL
          ),
          '[]'::json
        ) AS assignments

      FROM cases c

      LEFT JOIN requests r
        ON r.converted_case_id = c.id

      LEFT JOIN app_users client_user
        ON client_user.id = r.user_id

      ORDER BY
        c.created_at DESC
    `)

    const staff = await query(`
      SELECT
        au.id,
        au.username,
        au.email,
        au.role,
        au.status,

        up.id AS profile_id,
        up.full_name,

        (
          SELECT COUNT(*)
          FROM case_assignments ca
          WHERE
            ca.assigned_to = up.id
            AND ca.removed_at IS NULL
            AND COALESCE(
              ca.status,
              'assigned'
            ) IN (
              'assigned',
              'accepted',
              'active',
              'approved'
            )
        ) AS active_assignments,

        (
          SELECT MAX(ca.assigned_at)
          FROM case_assignments ca
          WHERE
            ca.assigned_to = up.id
            AND ca.removed_at IS NULL
        ) AS last_assigned_at

      FROM app_users au

      LEFT JOIN user_profiles up
        ON up.user_id = au.id

      WHERE
        au.role IN (
          'investigator',
          'analyst',
          'administrator',
          'super_administrator',
          'super-administrator'
        )

        AND au.status = 'active'

      ORDER BY
        CASE au.role
          WHEN 'investigator' THEN 1
          WHEN 'analyst' THEN 2
          WHEN 'administrator' THEN 3
          WHEN 'super_administrator' THEN 4
          WHEN 'super-administrator' THEN 4
          ELSE 5
        END,

        COALESCE(
          NULLIF(up.full_name, ''),
          au.username
        )
    `)

    return NextResponse.json({
      cases: cases.rows,
      staff: staff.rows,
    })
  } catch (error) {
    console.error(
      "ADMIN CASE GET ERROR",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed loading cases",
      },
      {
        status: 500,
      },
    )
  }
}

/* ============================================================
   POST ASSIGNMENT

   Administrator:
     pending → Super Administrator approval

   Super Administrator:
     approved → immediately active
============================================================ */

export async function POST(
  req: NextRequest,
) {
  try {
    const auth = await requireAdmin()

    if (auth.response) {
      return auth.response
    }

    const body = await req.json()

    const caseId = String(
      body.case_id || "",
    ).trim()

    const userId = String(
      body.user_id || "",
    ).trim()

    const assignmentRole = String(
      body.assignment_role || "",
    )
      .trim()
      .toLowerCase()

    const deadline = body.deadline
      ? String(body.deadline).trim()
      : null

    const notes = body.notes
      ? String(body.notes).trim()
      : null

    if (!caseId || !userId) {
      return NextResponse.json(
        {
          error:
            "case_id and user_id are required",
        },
        {
          status: 400,
        },
      )
    }

    if (
      !isValidAssignmentRole(
        assignmentRole,
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid assignment role",
        },
        {
          status: 400,
        },
      )
    }

    const caseResult = await query<{
      id: string
      case_number: string
      title: string
      status: string | null
    }>(
      `
        SELECT
          id,
          case_number,
          title,
          status
        FROM cases
        WHERE id = $1
        LIMIT 1
      `,
      [caseId],
    )

    const caseRow = caseResult.rows[0]

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

    const assigneeResult = await query<{
      user_id: string
      profile_id: string
      username: string
      email: string
      role: string
      status: string | null
    }>(
      `
        SELECT
          au.id AS user_id,
          up.id AS profile_id,
          au.username,
          au.email,
          au.role,
          au.status
        FROM app_users au
        INNER JOIN user_profiles up
          ON up.user_id = au.id
        WHERE au.id = $1
        LIMIT 1
      `,
      [userId],
    )

    const assignee =
      assigneeResult.rows[0]

    if (!assignee) {
      return NextResponse.json(
        {
          error:
            "Selected user profile not found",
        },
        {
          status: 404,
        },
      )
    }

    if (assignee.status !== "active") {
      return NextResponse.json(
        {
          error:
            "Selected user is not active",
        },
        {
          status: 400,
        },
      )
    }

    const roleMatches =
      assignmentRole === "super_administrator"
        ? assignee.role ===
            "super_administrator" ||
          assignee.role ===
            "super-administrator"
        : assignee.role ===
          assignmentRole

    if (!roleMatches) {
      return NextResponse.json(
        {
          error:
            "Selected user's role does not match the assignment role",
        },
        {
          status: 400,
        },
      )
    }

    const assignerProfileResult =
      await query<{
        id: string
      }>(
        `
          SELECT id
          FROM user_profiles
          WHERE user_id = $1
          LIMIT 1
        `,
        [auth.user?.id],
      )

    const assignerProfileId =
      assignerProfileResult.rows[0]?.id

    if (!assignerProfileId) {
      return NextResponse.json(
        {
          error:
            "Assigning administrator profile not found",
        },
        {
          status: 400,
        },
      )
    }

    const duplicate = await query<{
      id: string
      status: string | null
    }>(
      `
        SELECT
          id,
          status
        FROM case_assignments
        WHERE
          case_id = $1
          AND assigned_to = $2
          AND removed_at IS NULL
          AND COALESCE(
            status,
            'assigned'
          ) NOT IN (
            'rejected',
            'removed'
          )
        ORDER BY
          assigned_at DESC
        LIMIT 1
      `,
      [
        caseId,
        assignee.profile_id,
      ],
    )

    if (duplicate.rows.length) {
      return NextResponse.json(
        {
          error:
            "This user already has an active or pending assignment for this case",
        },
        {
          status: 409,
        },
      )
    }

    const directAssignment =
      isSuperAdministrator(
        auth.user?.role,
      )

    const assignmentStatus =
      directAssignment
        ? "approved"
        : "pending"

    await query("BEGIN")

    try {
      /*
       * IMPORTANT:
       *
       * $5 is explicitly typed as varchar because
       * case_assignments.status is varchar.
       *
       * This fixes PostgreSQL 42P08:
       * "inconsistent types deduced for parameter $5"
       */
      const assignment =
        await query<{
          id: string
          case_id: string
          assigned_to: string
          assigned_by: string | null
          assignment_role: string
          status: string
          deadline: string | null
          notes: string | null
          accepted_at: string | null
          assigned_at: string | null
        }>(
          `
            INSERT INTO case_assignments (
              case_id,
              assigned_to,
              assigned_by,
              assignment_role,
              status,
              deadline,
              notes,
              accepted_at,
              assigned_at
            )

            VALUES (
              $1::uuid,
              $2::uuid,
              $3::uuid,
              $4::varchar,
              $5::varchar,
              NULLIF($6, '')::date,
              NULLIF($7, '')::text,

              CASE
                WHEN $5::varchar = 'approved'
                THEN NOW()
                ELSE NULL
              END,

              NOW()
            )

            RETURNING
              id,
              case_id,
              assigned_to,
              assigned_by,
              assignment_role,
              status,
              deadline,
              notes,
              accepted_at,
              assigned_at
          `,
          [
            caseId,
            assignee.profile_id,
            assignerProfileId,
            assignmentRole,
            assignmentStatus,
            deadline,
            notes,
          ],
        )

      const assignmentRow =
        assignment.rows[0]

      if (
        directAssignment &&
        assignmentRole ===
          "investigator"
      ) {
        await query(
          `
            UPDATE cases
            SET
              assigned_to = $2,
              status = CASE
                WHEN status IN (
                  'awaiting_assignment',
                  'case_created',
                  'priority_assigned'
                )
                THEN 'assigned'
                ELSE status
              END,
              updated_at = NOW()
            WHERE id = $1
          `,
          [
            caseId,
            assignee.profile_id,
          ],
        )
      }

      await query(
        `
          INSERT INTO case_updates (
            case_id,
            update_type,
            title,
            content,
            updated_by
          )
          VALUES (
            $1,
            'assignment',
            $2,
            $3,
            $4
          )
        `,
        [
          caseId,

          directAssignment
            ? "Operator assigned"
            : "Assignment awaiting approval",

          directAssignment
            ? `${assignee.username} was assigned as ${assignmentRole}.`
            : `${assignee.username} was proposed as ${assignmentRole}. Super Administrator approval is required.`,

          assignerProfileId,
        ],
      )

      await query("COMMIT")

      await emitCaseWorkspaceEvent({
        type: "case.updated",
        case_id: caseId,
        actor_id:
          auth.user?.id ?? null,
        record_id:
          assignmentRow.id,
        data: {
          event: directAssignment
            ? "assignment_approved"
            : "assignment_pending_approval",
          assignment_id:
            assignmentRow.id,
          assigned_user_id:
            assignee.user_id,
          assignment_role:
            assignmentRole,
          status:
            assignmentStatus,
        },
      })

      if (directAssignment) {
        await query(
          `
            INSERT INTO notifications (
              user_id,
              case_id,
              type,
              title,
              message,
              metadata
            )
            VALUES (
              $1,
              $2,
              'case_assignment',
              'New case assignment',
              $3,
              $4::jsonb
            )
          `,
          [
            assignee.user_id,
            caseId,

            `You have been assigned ${caseRow.case_number} as ${assignmentRole}.`,

            JSON.stringify({
              case_id: caseId,
              assignment_id:
                assignmentRow.id,
              assignment_role:
                assignmentRole,
              status: "approved",
            }),
          ],
        ).catch(() => undefined)
      } else {
        await query(
          `
            INSERT INTO notifications (
              user_id,
              case_id,
              type,
              title,
              message,
              metadata
            )
            VALUES (
              $1,
              $2,
              'case_assignment_pending',
              'Case assignment pending approval',
              $3,
              $4::jsonb
            )
          `,
          [
            assignee.user_id,
            caseId,

            `You have been proposed for ${caseRow.case_number} as ${assignmentRole}.`,

            JSON.stringify({
              case_id: caseId,
              assignment_id:
                assignmentRow.id,
              assignment_role:
                assignmentRole,
              status: "pending",
            }),
          ],
        ).catch(() => undefined)

        const superAdmins =
          await query<{
            id: string
          }>(
            `
              SELECT id
              FROM app_users
              WHERE
                role IN (
                  'super_administrator',
                  'super-administrator'
                )
                AND status = 'active'
            `,
          )

        for (
          const superAdmin of
            superAdmins.rows
        ) {
          await query(
            `
              INSERT INTO notifications (
                user_id,
                case_id,
                type,
                title,
                message,
                metadata
              )
              VALUES (
                $1,
                $2,
                'case_assignment_approval',
                'Case assignment requires approval',
                $3,
                $4::jsonb
              )
            `,
            [
              superAdmin.id,
              caseId,

              `${assignee.username} was proposed as ${assignmentRole} for ${caseRow.case_number}.`,

              JSON.stringify({
                case_id: caseId,
                assignment_id:
                  assignmentRow.id,
                assigned_user_id:
                  assignee.user_id,
                assignment_role:
                  assignmentRole,
                status: "pending",
              }),
            ],
          ).catch(
            () => undefined,
          )
        }
      }

      await auditLog(
        auth.user?.id ?? null,

        directAssignment
          ? "case_assignment_approved"
          : "case_assignment_pending_approval",

        req,

        {
          case_id: caseId,
          assignment_id:
            assignmentRow.id,
          assigned_user_id:
            assignee.user_id,
          assignment_role:
            assignmentRole,
          status:
            assignmentStatus,
          deadline,
        },
      )

      return NextResponse.json(
        {
          message: directAssignment
            ? "Assignment approved and activated"
            : "Assignment submitted for Super Administrator approval",

          assignment:
            assignmentRow,
        },
        {
          status: 201,
        },
      )
    } catch (error) {
      await query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error(
      "ADMIN CASE POST ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Assignment failed",
      },
      {
        status: 500,
      },
    )
  }
}

/* ============================================================
   PATCH
============================================================ */

export async function PATCH(
  req: NextRequest,
) {
  try {
    const auth = await requireAdmin()

    if (auth.response) {
      return auth.response
    }

    const body = await req.json()

    const action = String(
      body.action || "update_case",
    ).trim()

    /* ========================================================
       APPROVE ASSIGNMENT
    ======================================================== */

    if (
      action ===
      "approve_assignment"
    ) {
      if (
        !isSuperAdministrator(
          auth.user?.role,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Only a Super Administrator can approve assignments",
          },
          {
            status: 403,
          },
        )
      }

      const assignmentId =
        String(
          body.assignment_id ||
            "",
        ).trim()

      if (!assignmentId) {
        return NextResponse.json(
          {
            error:
              "assignment_id is required",
          },
          {
            status: 400,
          },
        )
      }

      const reviewerProfile =
        await query<{
          id: string
        }>(
          `
            SELECT id
            FROM user_profiles
            WHERE user_id = $1
            LIMIT 1
          `,
          [auth.user?.id],
        )

      const reviewerProfileId =
        reviewerProfile.rows[0]?.id

      if (!reviewerProfileId) {
        return NextResponse.json(
          {
            error:
              "Super Administrator profile not found",
          },
          {
            status: 400,
          },
        )
      }

      const assignment =
        await query<{
          id: string
          case_id: string
          assigned_to: string
          assignment_role:
            | string
            | null
          status:
            | string
            | null
        }>(
          `
            SELECT
              id,
              case_id,
              assigned_to,
              assignment_role,
              status
            FROM case_assignments
            WHERE id = $1
            LIMIT 1
          `,
          [assignmentId],
        )

      const row =
        assignment.rows[0]

      if (!row) {
        return NextResponse.json(
          {
            error:
              "Assignment not found",
          },
          {
            status: 404,
          },
        )
      }

      if (
        row.status !==
        "pending"
      ) {
        return NextResponse.json(
          {
            error:
              "This assignment is not pending approval",
          },
          {
            status: 409,
          },
        )
      }

      await query("BEGIN")

      try {
        const approved =
          await query(
            `
              UPDATE case_assignments
              SET
                status = 'approved',
                accepted_at =
                  COALESCE(
                    accepted_at,
                    NOW()
                  )
              WHERE id = $1
              RETURNING *
            `,
            [assignmentId],
          )

        if (
          row.assignment_role ===
          "investigator"
        ) {
          await query(
            `
              UPDATE cases
              SET
                assigned_to = $2,

                status = CASE
                  WHEN status IN (
                    'awaiting_assignment',
                    'case_created',
                    'priority_assigned'
                  )
                  THEN 'assigned'
                  ELSE status
                END,

                updated_at = NOW()

              WHERE id = $1
            `,
            [
              row.case_id,
              row.assigned_to,
            ],
          )
        }

        await query(
          `
            INSERT INTO case_updates (
              case_id,
              update_type,
              title,
              content,
              updated_by
            )
            VALUES (
              $1,
              'assignment',
              'Assignment approved',
              'Super Administrator approved the case assignment.',
              $2
            )
          `,
          [
            row.case_id,
            reviewerProfileId,
          ],
        )

        await query("COMMIT")

        await emitCaseWorkspaceEvent({
          type: "case.updated",
          case_id:
            row.case_id,
          actor_id:
            auth.user?.id ?? null,
          record_id:
            assignmentId,
          data: {
            event:
              "assignment_approved",
            assignment_id:
              assignmentId,
          },
        })

        await auditLog(
          auth.user?.id ?? null,
          "case_assignment_approved",
          req,
          {
            case_id:
              row.case_id,
            assignment_id:
              assignmentId,
            assigned_to:
              row.assigned_to,
          },
        )

        return NextResponse.json({
          message:
            "Assignment approved",
          assignment:
            approved.rows[0],
        })
      } catch (error) {
        await query("ROLLBACK")
        throw error
      }
    }

    /* ========================================================
       REJECT ASSIGNMENT
    ======================================================== */

    if (
      action ===
      "reject_assignment"
    ) {
      if (
        !isSuperAdministrator(
          auth.user?.role,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Only a Super Administrator can reject assignments",
          },
          {
            status: 403,
          },
        )
      }

      const assignmentId =
        String(
          body.assignment_id ||
            "",
        ).trim()

      const rejectionReason =
        String(
          body.rejection_reason ||
            "",
        ).trim()

      if (!assignmentId) {
        return NextResponse.json(
          {
            error:
              "assignment_id is required",
          },
          {
            status: 400,
          },
        )
      }

      if (!rejectionReason) {
        return NextResponse.json(
          {
            error:
              "A rejection reason is required",
          },
          {
            status: 400,
          },
        )
      }

      const assignment =
        await query<{
          id: string
          case_id: string
          assigned_to: string
          status:
            | string
            | null
        }>(
          `
            SELECT
              id,
              case_id,
              assigned_to,
              status
            FROM case_assignments
            WHERE id = $1
            LIMIT 1
          `,
          [assignmentId],
        )

      const row =
        assignment.rows[0]

      if (!row) {
        return NextResponse.json(
          {
            error:
              "Assignment not found",
          },
          {
            status: 404,
          },
        )
      }

      if (
        row.status !==
        "pending"
      ) {
        return NextResponse.json(
          {
            error:
              "This assignment is not pending approval",
          },
          {
            status: 409,
          },
        )
      }

      await query(
        `
          UPDATE case_assignments
          SET
            status = 'rejected',
            rejected_at = NOW(),
            rejection_reason = $2
          WHERE id = $1
        `,
        [
          assignmentId,
          rejectionReason,
        ],
      )

      await query(
        `
          INSERT INTO case_updates (
            case_id,
            update_type,
            title,
            content
          )
          VALUES (
            $1,
            'assignment',
            'Assignment rejected',
            $2
          )
        `,
        [
          row.case_id,
          `Super Administrator rejected assignment ${assignmentId}. Reason: ${rejectionReason}`,
        ],
      ).catch(() => undefined)

      await auditLog(
        auth.user?.id ?? null,
        "case_assignment_rejected",
        req,
        {
          case_id: row.case_id,
          assignment_id:
            assignmentId,
          assigned_to:
            row.assigned_to,
          rejection_reason:
            rejectionReason,
        },
      )

      return NextResponse.json({
        message:
          "Assignment rejected",
      })
    }

    /* ========================================================
       NORMAL CASE UPDATE
    ======================================================== */

    const caseId =
      String(
        body.case_id || "",
      ).trim()

    if (!caseId) {
      return NextResponse.json(
        {
          error:
            "Missing case_id",
        },
        {
          status: 400,
        },
      )
    }

    const title =
      body.title !== undefined
        ? String(
            body.title || "",
          ).trim()
        : null

    const status =
      body.status !== undefined
        ? String(
            body.status || "",
          ).trim()
        : null

    const priority =
      body.priority !== undefined
        ? String(
            body.priority ||
              "",
          ).trim()
        : null

    const estimatedCompletion =
      body.estimated_completion
        ? String(
            body.estimated_completion,
          ).trim()
        : null

    const note =
      body.note
        ? String(
            body.note,
          ).trim()
        : null

    const current =
      await query<{
        status:
          | string
          | null
        priority:
          | string
          | null
      }>(
        `
          SELECT
            status,
            priority
          FROM cases
          WHERE id = $1
          LIMIT 1
        `,
        [caseId],
      )

    if (!current.rows.length) {
      return NextResponse.json(
        {
          error:
            "Case not found",
        },
        {
          status: 404,
        },
      )
    }

    const nextStatus =
      action === "close_case"
        ? "closed"
        : status

    const updated =
      await query(
        `
          UPDATE cases
          SET
            title = COALESCE(
              NULLIF($2::text, ''),
              title
            ),

            status = COALESCE(
              NULLIF($3::text, ''),
              status
            ),

            priority = COALESCE(
              NULLIF($4::text, ''),
              priority
            ),

            estimated_completion =
              CASE
                WHEN NULLIF($5::text, '') IS NULL
                THEN estimated_completion
                ELSE NULLIF(
                  $5::text,
                  ''
                )::date
              END,

            completed_at =
              CASE
                WHEN $3::text IN (
                  'closed',
                  'delivered',
                  'completed'
                )
                THEN COALESCE(
                  completed_at,
                  NOW()
                )
                ELSE completed_at
              END,

            updated_at = NOW()

          WHERE id = $1

          RETURNING *
        `,
        [
          caseId,
          title,
          nextStatus,
          priority,
          estimatedCompletion,
        ],
      )

    await query(
      `
        INSERT INTO case_updates (
          case_id,
          update_type,
          title,
          content
        )
        VALUES (
          $1,
          'status_change',
          $2,
          $3
        )
      `,
      [
        caseId,

        `Workflow moved to ${
          nextStatus ||
          current.rows[0].status ||
          "current state"
        }`,

        note ||
          `Priority ${
            current.rows[0]
              .priority ||
            "normal"
          } → ${
            priority ||
            current.rows[0]
              .priority ||
            "normal"
          }`,
      ],
    ).catch(() => undefined)

    await auditLog(
      auth.user?.id ?? null,
      "case_updated",
      req,
      {
        case_id:
          caseId,
        status:
          nextStatus,
        priority,
        estimated_completion:
          estimatedCompletion,
        action,
      },
    )

    await emitCaseWorkspaceEvent({
      type: "case.updated",
      case_id: caseId,
      actor_id:
        auth.user?.id ?? null,
      record_id: caseId,
      data: {
        title,
        status: nextStatus,
        priority,
        estimated_completion:
          estimatedCompletion,
        action,
      },
    })

    await query(
      `
        INSERT INTO activity_logs (
          case_id,
          action,
          details
        )
        VALUES (
          $1,
          $2,
          $3::jsonb
        )
      `,
      [
        caseId,
        action,
        JSON.stringify({
          status: nextStatus,
          priority,
          estimated_completion:
            estimatedCompletion,
          administrator_id:
            auth.user?.id,
        }),
      ],
    ).catch(() => undefined)

    return NextResponse.json({
      case: updated.rows[0],
    })
  } catch (error) {
    console.error(
      "ADMIN CASE PATCH ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Case update failed",
      },
      {
        status: 500,
      },
    )
  }
}

/* ============================================================
   DELETE / ARCHIVE
============================================================ */

export async function DELETE(
  req: NextRequest,
) {
  try {
    const auth = await requireAdmin()

    if (auth.response) {
      return auth.response
    }

    const {
      searchParams,
    } = new URL(req.url)

    const caseId =
      searchParams.get(
        "case_id",
      )

    const action =
      searchParams.get(
        "action",
      ) || "archive"

    if (!caseId) {
      return NextResponse.json(
        {
          error:
            "Missing case_id",
        },
        {
          status: 400,
        },
      )
    }

    if (action === "delete") {
      await query(
        "DELETE FROM cases WHERE id = $1",
        [caseId],
      )

      await auditLog(
        auth.user?.id ?? null,
        "case_deleted",
        req,
        {
          case_id:
            caseId,
        },
      )

      return NextResponse.json({
        message:
          "Case deleted",
      })
    }

    await query(
      `
        UPDATE cases
        SET
          status = 'archived',
          updated_at = NOW()
        WHERE id = $1
      `,
      [caseId],
    )

    await query(
      `
        INSERT INTO case_updates (
          case_id,
          update_type,
          title,
          content
        )
        VALUES (
          $1,
          'status_change',
          'Case archived',
          'Administrator archived this case'
        )
      `,
      [caseId],
    ).catch(() => undefined)

    await auditLog(
      auth.user?.id ?? null,
      "case_archived",
      req,
      {
        case_id:
          caseId,
      },
    )

    return NextResponse.json({
      message:
        "Case archived",
    })
  } catch (error) {
    console.error(
      "ADMIN CASE DELETE ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Case action failed",
      },
      {
        status: 500,
      },
    )
  }
}