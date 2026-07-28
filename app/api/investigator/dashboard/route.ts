import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

async function getProfileForCurrentUser() {
  const user = await getCurrentUser()
  if (!user) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }

  const profile = await query(
    `
    SELECT id
    FROM user_profiles
    WHERE user_id = $1
    LIMIT 1
    `,
    [user.id],
  )

  if (!profile.rows.length) {
    return { response: NextResponse.json({ error: "Profile not found" }, { status: 404 }) }
  }

  return { user, profileId: profile.rows[0].id as string }
}

export async function GET() {
  try {
    const auth = await getProfileForCurrentUser()
    if (auth.response) return auth.response

    const cases = await query(
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
        c.created_at,
        json_agg(
          json_build_object(
            'id', ca.id,
            'assignment_role', COALESCE(ca.assignment_role, $2),
            'status', COALESCE(ca.status, 'assigned'),
            'accepted_at', ca.accepted_at,
            'rejected_at', ca.rejected_at,
            'rejection_reason', ca.rejection_reason,
            'deadline', ca.deadline,
            'notes', ca.notes
          )
        ) FILTER (WHERE ca.id IS NOT NULL) AS assignments
      FROM cases c
      JOIN case_assignments ca
        ON ca.case_id = c.id
      WHERE ca.assigned_to = $1
        AND ca.removed_at IS NULL
        AND COALESCE(ca.status, 'assigned') <> 'removed'
      GROUP BY c.id
      ORDER BY c.created_at DESC
      `,
      [auth.profileId, auth.user?.role || "investigator"],
    )

    const evidence = await query(
      `
      SELECT COUNT(DISTINCT f.id)::int AS total
      FROM forensic_files f
      JOIN case_assignments ca ON ca.case_id = f.case_id
      WHERE ca.assigned_to = $1
        AND ca.removed_at IS NULL
        AND COALESCE(ca.status, 'assigned') IN ('assigned', 'accepted', 'completed')
      `,
      [auth.profileId],
    )

    const reports = await query(
      `
      SELECT COUNT(DISTINCT r.id)::int AS total
      FROM case_reports r
      JOIN case_assignments ca ON ca.case_id = r.case_id
      WHERE ca.assigned_to = $1
        AND ca.removed_at IS NULL
        AND COALESCE(ca.status, 'assigned') IN ('assigned', 'accepted', 'completed')
      `,
      [auth.profileId],
    )

    return NextResponse.json({
      cases: cases.rows,
      stats: {
        evidence: evidence.rows[0].total,
        reports: reports.rows[0].total,
        pending_assignments: cases.rows.reduce((total, item) => {
          const assignments = (item.assignments || []) as Array<{ status: string }>
          return total + assignments.filter((assignment) => assignment.status === "assigned").length
        }, 0),
      },
    })
  } catch (error) {
    console.error("INVESTIGATOR DASHBOARD ERROR", error)
    return NextResponse.json({ error: "Dashboard failed" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getProfileForCurrentUser()
    if (auth.response) return auth.response

    const { assignment_id, status, rejection_reason } = await req.json()
    if (!assignment_id || !["accepted", "rejected", "completed"].includes(status)) {
      return NextResponse.json({ error: "Invalid assignment update" }, { status: 400 })
    }

    const assignment = await query(
      `
      UPDATE case_assignments
      SET
        status = $3,
        accepted_at = CASE WHEN $3 = 'accepted' THEN NOW() ELSE accepted_at END,
        rejected_at = CASE WHEN $3 = 'rejected' THEN NOW() ELSE rejected_at END,
        rejection_reason = CASE WHEN $3 = 'rejected' THEN $4 ELSE rejection_reason END
      WHERE id = $1
        AND assigned_to = $2
        AND removed_at IS NULL
      RETURNING id, case_id, assigned_by, assignment_role
      `,
      [assignment_id, auth.profileId, status, rejection_reason || null],
    )

    if (!assignment.rows.length) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    const row = assignment.rows[0]

    await query(
      `
      INSERT INTO case_updates (case_id, update_type, title, content, updated_by)
      VALUES ($1, 'assignment', $2, $3, $4)
      `,
      [
        row.case_id,
        `Assignment ${status}`,
        status === "rejected" ? rejection_reason || "Assignment rejected" : `Assignment marked ${status}`,
        auth.profileId,
      ],
    ).catch(() => undefined)

    if (row.assigned_by) {
      await query(
        `
        INSERT INTO notifications (user_id, case_id, assignment_id, type, title, message, metadata)
        VALUES ($1, $2, $3, 'assignment_status', $4, $5, $6::jsonb)
        `,
        [
          row.assigned_by,
          row.case_id,
          assignment_id,
          `Assignment ${status}`,
          status === "rejected" ? rejection_reason || "Assignment rejected" : `Assignment marked ${status}`,
          JSON.stringify({ assignment_role: row.assignment_role, status, user_id: auth.user?.id }),
        ],
      ).catch(() => undefined)
    }

    await auditLog(auth.user?.id || null, "case_assignment_status_changed", req, {
      assignment_id,
      case_id: row.case_id,
      status,
      rejection_reason,
    })

    return NextResponse.json({ assignment: row, status })
  } catch (error) {
    console.error("ASSIGNMENT STATUS ERROR", error)
    return NextResponse.json({ error: "Assignment update failed" }, { status: 500 })
  }
}
