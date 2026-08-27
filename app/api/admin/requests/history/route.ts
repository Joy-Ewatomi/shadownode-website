import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    if (!isAdminRole(user.role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      )
    }

    if (
      user.role !== "administrator" &&
      user.role !== "super_administrator"
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      )
    }

    const requestId =
      request.nextUrl.searchParams
        .get("requestId")
        ?.trim() || null

    const caseNumber =
      request.nextUrl.searchParams
        .get("caseNumber")
        ?.trim() || null

    /*
     * =====================================================
     * SINGLE REQUEST HISTORY
     * =====================================================
     *
     * Preserve the existing behaviour when a requestId
     * or caseNumber is supplied.
     */

    if (requestId || caseNumber) {
      let requestResult

      if (requestId) {
        requestResult = await query(
          `
            SELECT
              id,
              case_number,
              title,
              status,
              created_at,
              updated_at
            FROM requests
            WHERE id = $1
            LIMIT 1
          `,
          [requestId],
        )
      } else {
        requestResult = await query(
          `
            SELECT
              id,
              case_number,
              title,
              status,
              created_at,
              updated_at
            FROM requests
            WHERE case_number = $1
            LIMIT 1
          `,
          [caseNumber],
        )
      }

      if (requestResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Request not found" },
          { status: 404 },
        )
      }

      const requestRecord = requestResult.rows[0]

      const historyResult = await query(
        `
          SELECT
            rae.id,
            rae.request_id,
            rae.action,
            rae.actor_user_id,

            au.username AS actor_username,
            au.email AS actor_email,
            au.role AS actor_role,

            rae.details,
            rae.created_at

          FROM request_audit_events rae

          LEFT JOIN app_users au
            ON au.id = rae.actor_user_id

          WHERE rae.request_id = $1

          ORDER BY
            rae.created_at ASC,
            rae.id ASC
        `,
        [requestRecord.id],
      )

      const history = historyResult.rows.map(
        (event: Record<string, any>) => {
          let details = event.details

          if (typeof details === "string") {
            try {
              details = JSON.parse(details)
            } catch {
              details = {
                raw: details,
              }
            }
          }

          return {
            id: String(event.id),
            request_id: String(event.request_id),
            action: String(event.action ?? ""),
            actor: {
              id:
                event.actor_user_id != null
                  ? String(event.actor_user_id)
                  : null,
              username:
                event.actor_username ?? null,
              email:
                event.actor_email ?? null,
              role:
                event.actor_role ?? null,
            },
            details,
            created_at:
              event.created_at,
          }
        },
      )

      return NextResponse.json({
        success: true,
        request: requestRecord,
        total: history.length,
        history,
      })
    }

    /*
     * =====================================================
     * REQUEST HISTORY LIST
     * =====================================================
     *
     * This is the important part.
     *
     * We do NOT use current status to determine history.
     *
     * A request can be:
     *
     *   approved
     *   rejected
     *   completed
     *   closed
     *   active
     *   archived
     *
     * and still belong in history if this role already
     * reviewed it.
     */

    let result

    if (user.role === "administrator") {
      result = await query(
        `
          SELECT
            r.id,
            r.case_number,
            r.title,
            CASE
  WHEN LOWER(COALESCE(r.service_type, '')) LIKE '%osint%'
    OR LOWER(COALESCE(r.service_type, '')) LIKE '%digital identity%'
    OR LOWER(COALESCE(r.service_type, '')) LIKE '%background%'
    OR LOWER(COALESCE(r.service_type, '')) LIKE '%device%'
    OR LOWER(COALESCE(r.service_type, '')) LIKE '%investigation%'
  THEN 'osint'

  WHEN LOWER(COALESCE(r.service_type, '')) LIKE '%cyber%'
    OR LOWER(COALESCE(r.service_type, '')) LIKE '%security%'
  THEN 'cybersecurity'

  WHEN LOWER(COALESCE(r.service_type, '')) LIKE '%training%'
  THEN 'training'

  ELSE 'other'
END AS category,
            r.service_type,
            r.status,
            r.priority,

            r.admin_quote_action,
            r.admin_quote_notes,
            r.admin_reviewed_by,
            r.admin_reviewed_at,

            r.super_admin_quote_action,
            r.super_admin_reviewed_at,

            r.created_at,
            r.updated_at,

            u.username AS client_username,
            u.email AS account_email,

            COALESCE(
              r.client_email,
              u.email
            ) AS client_email

          FROM requests r

          LEFT JOIN app_users u
            ON u.id = r.user_id

          WHERE r.admin_reviewed_by IS NOT NULL

          ORDER BY
            r.admin_reviewed_at DESC NULLS LAST,
            r.updated_at DESC NULLS LAST,
            r.created_at DESC
        `,
      )
    } else {
      result = await query(
        `
          SELECT
            r.id,
            r.case_number,
            r.title,
            CASE
  WHEN LOWER(COALESCE(r.service_type, '')) LIKE '%osint%'
    OR LOWER(COALESCE(r.service_type, '')) LIKE '%digital identity%'
    OR LOWER(COALESCE(r.service_type, '')) LIKE '%background%'
    OR LOWER(COALESCE(r.service_type, '')) LIKE '%device%'
    OR LOWER(COALESCE(r.service_type, '')) LIKE '%investigation%'
  THEN 'osint'

  WHEN LOWER(COALESCE(r.service_type, '')) LIKE '%cyber%'
    OR LOWER(COALESCE(r.service_type, '')) LIKE '%security%'
  THEN 'cybersecurity'

  WHEN LOWER(COALESCE(r.service_type, '')) LIKE '%training%'
  THEN 'training'

  ELSE 'other'
END AS category,
            r.service_type,
            r.status,
            r.priority,

            r.admin_quote_action,
            r.admin_quote_notes,
            r.admin_reviewed_by,
            r.admin_reviewed_at,

            r.super_admin_quote_action,
            r.super_admin_quote_notes,
            r.super_admin_reviewed_by,
            r.super_admin_reviewed_at,

            r.created_at,
            r.updated_at,

            u.username AS client_username,
            u.email AS account_email,

            COALESCE(
              r.client_email,
              u.email
            ) AS client_email

          FROM requests r

          LEFT JOIN app_users u
            ON u.id = r.user_id

          WHERE r.super_admin_reviewed_by IS NOT NULL

          ORDER BY
            r.super_admin_reviewed_at DESC NULLS LAST,
            r.updated_at DESC NULLS LAST,
            r.created_at DESC
        `,
      )
    }

    return NextResponse.json({
      success: true,
      role: user.role,
      total: result.rows.length,
      requests: result.rows,
    })
  } catch (error) {
    console.error(
      "ADMIN REQUEST HISTORY GET ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to fetch request history",
      },
      {
        status: 500,
      },
    )
  }
}