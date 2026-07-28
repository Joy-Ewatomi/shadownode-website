import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (!isAdminRole(user.role)) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  return { user }
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth.response) return auth.response

    const cases = await query(`
      SELECT
        c.id,
        c.case_number,
        c.title,
        c.description,
        c.service_type,
        c.status,
        c.priority,
        c.estimated_completion,
        c.created_at,
        json_agg(
          json_build_object(
            'id', ca.id,
            'assigned_to', ca.assigned_to,
            'user_id', u.id,
            'username', u.username,
            'user_role', u.role,
            'assignment_role', COALESCE(ca.assignment_role, u.role, 'investigator'),
            'status', COALESCE(ca.status, 'assigned'),
            'assigned_by', ca.assigned_by,
            'accepted_at', ca.accepted_at,
            'rejected_at', ca.rejected_at,
            'rejection_reason', ca.rejection_reason,
            'deadline', ca.deadline,
            'notes', ca.notes
          )
        ) FILTER (WHERE ca.id IS NOT NULL) AS assignments
      FROM cases c
      LEFT JOIN case_assignments ca
        ON ca.case_id = c.id
        AND ca.removed_at IS NULL
      LEFT JOIN user_profiles up
        ON up.id = ca.assigned_to
      LEFT JOIN app_users u
        ON u.id = up.user_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `)

    const staff = await query(`
      SELECT id, username, email, role
      FROM app_users
      WHERE role IN ('investigator', 'analyst')
        AND status = 'active'
      ORDER BY username
    `)

    return NextResponse.json({ cases: cases.rows, staff: staff.rows })
  } catch (error) {
    console.error("ADMIN CASE ERROR", error)
    return NextResponse.json({ error: "Failed loading cases" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth.response) return auth.response

    const { case_id, user_id, assignment_role, deadline, notes } = await req.json()
    if (!case_id || !user_id) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 })
    }

    const profile = await query(
      `
      SELECT id
      FROM user_profiles
      WHERE user_id = $1
      LIMIT 1
      `,
      [user_id],
    )

    if (!profile.rows.length) {
      return NextResponse.json({ error: "User profile missing" }, { status: 404 })
    }

    const assignment = await query(
      `
      INSERT INTO case_assignments
        (case_id, assigned_to, assignment_role, status, assigned_by, deadline, notes)
      VALUES
        ($1, $2, $3, 'assigned', $4, $5, $6)
      RETURNING id
      `,
      [case_id, profile.rows[0].id, assignment_role || "investigator", auth.user?.id || null, deadline || null, notes || null],
    )

    await query(
      `
      INSERT INTO case_updates (case_id, update_type, title, content, updated_by)
      VALUES ($1, 'assignment', 'Operator assigned', $2, $3)
      `,
      [case_id, `Assigned ${assignment_role || "operator"} to case`, profile.rows[0].id],
    ).catch(() => undefined)

    await query(
      `
      INSERT INTO notifications (user_id, case_id, assignment_id, type, title, message, metadata)
      VALUES ($1, $2, $3, 'case_assignment', 'New case assignment', $4, $5::jsonb)
      `,
      [
        user_id,
        case_id,
        assignment.rows[0].id,
        `You have been assigned as ${assignment_role || "investigator"}.`,
        JSON.stringify({ assignment_role: assignment_role || "investigator", deadline, assigned_by: auth.user?.id }),
      ],
    ).catch(() => undefined)

    await auditLog(auth.user?.id || null, "case_assignment_created", req, {
      case_id,
      assigned_user_id: user_id,
      assignment_id: assignment.rows[0].id,
      assignment_role: assignment_role || "investigator",
      deadline,
    })

    return NextResponse.json({ message: "Assigned successfully" })
  } catch (error) {
    console.error("ASSIGN ERROR", error)
    return NextResponse.json({ error: "Assignment failed" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth.response) return auth.response

    const { case_id, title, status, priority, estimated_completion, note, action } = await req.json()
    if (!case_id) {
      return NextResponse.json({ error: "Missing case_id" }, { status: 400 })
    }

    const current = await query(
      `
      SELECT status, priority
      FROM cases
      WHERE id = $1
      LIMIT 1
      `,
      [case_id],
    )

    if (!current.rows.length) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    const nextStatus = action === "close_case" ? "closed" : status
    const updated = await query(
      `
      UPDATE cases
      SET
        title = COALESCE($2, title),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        estimated_completion = $5,
        completed_at = CASE
          WHEN $3 IN ('closed', 'delivered', 'completed') THEN COALESCE(completed_at, NOW())
          ELSE completed_at
        END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [case_id, title || null, nextStatus || null, priority || null, estimated_completion || null],
    )

    await query(
      `
      INSERT INTO case_updates (case_id, update_type, title, content)
      VALUES ($1, 'status_change', $2, $3)
      `,
      [
        case_id,
        `Workflow moved to ${nextStatus || current.rows[0].status}`,
        note || `Priority ${current.rows[0].priority} to ${priority || current.rows[0].priority}`,
      ],
    ).catch(() => undefined)

    await auditLog(auth.user?.id || null, "case_updated", req, {
      case_id,
      status: nextStatus,
      priority,
      estimated_completion,
      action: action || "update_case",
    })

    await query(
      `
      INSERT INTO activity_logs (case_id, action, details)
      VALUES ($1, $2, $3::jsonb)
      `,
      [
        case_id,
        action || "update_case",
        JSON.stringify({
          status: nextStatus,
          priority,
          estimated_completion,
          administrator_id: auth.user?.id,
        }),
      ],
    ).catch(() => undefined)

    return NextResponse.json({ case: updated.rows[0] })
  } catch (error) {
    console.error("CASE UPDATE ERROR", error)
    return NextResponse.json({ error: "Case update failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth.response) return auth.response

    const { searchParams } = new URL(req.url)
    const caseId = searchParams.get("case_id")
    const action = searchParams.get("action") || "archive"

    if (!caseId) {
      return NextResponse.json({ error: "Missing case_id" }, { status: 400 })
    }

    if (action === "delete") {
      await query("DELETE FROM cases WHERE id = $1", [caseId])
      await auditLog(auth.user?.id || null, "case_deleted", req, { case_id: caseId })
      return NextResponse.json({ message: "Case deleted" })
    }

    await query("UPDATE cases SET status = 'archived', updated_at = NOW() WHERE id = $1", [caseId])
    await query(
      `
      INSERT INTO case_updates (case_id, update_type, title, content)
      VALUES ($1, 'status_change', 'Case archived', 'Administrator archived this case')
      `,
      [caseId],
    ).catch(() => undefined)

    await auditLog(auth.user?.id || null, "case_archived", req, { case_id: caseId })

    return NextResponse.json({ message: "Case archived" })
  } catch (error) {
    console.error("CASE DELETE ERROR", error)
    return NextResponse.json({ error: "Case action failed" }, { status: 500 })
  }
}
