import { NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET() {
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

    /*
     * =====================================================
     * ROLE-BASED REQUEST VISIBILITY
     * =====================================================
     *
     * ADMINISTRATOR
     * ----------------
     * Can see requests that are:
     *
     *   1. Waiting for administrator review
     *   2. Already submitted by the administrator
     *      and waiting for Super Administrator review
     *   3. Completed historical requests belonging to
     *      the administrator workflow
     *
     * However, Administrator does NOT receive the
     * client-facing quote information.
     *
     *
     * SUPER ADMINISTRATOR
     * -------------------
     * Can see the full governance workflow:
     *
     *   - request details
     *   - AI analysis
     *   - administrator submission
     *   - quote information
     *   - final decision
     *   - historical workflow states
     *
     * Only pending_super_admin_review requires action.
     */

    if (
      user.role !== "administrator" &&
      user.role !== "super_administrator"
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      )
    }

    /*
     * =====================================================
     * ADMINISTRATOR VIEW
     * =====================================================
     */

    if (user.role === "administrator") {
      const requests = await query(
        `
          SELECT
            r.*,

            u.username AS client_username,
            u.email AS account_email,

            COALESCE(
              r.client_email,
              u.email
            ) AS client_email,

            CASE
              WHEN r.status = 'pending_admin_review'
              THEN true
              ELSE false
            END AS action_required,

            /*
             * Client-facing quote information must not
             * be exposed to Administrators.
             */
            NULL::numeric AS client_quote_amount,
            NULL::text AS client_quote_currency,
            NULL::text AS client_quote_notes,
            NULL::text AS client_estimated_completion

          FROM requests r

          LEFT JOIN app_users u
            ON u.id = r.user_id

          /*
           * Administrator should retain visibility of the
           * request after submitting it.
           *
           * We intentionally do NOT expose every possible
           * workflow state forever. These are the states
           * belonging to the administrator-side lifecycle.
           */
         WHERE r.status = 'pending_admin_review'

          ORDER BY r.created_at DESC
        `,
      )

      return NextResponse.json(requests.rows)
    }

    /*
     * =====================================================
     * SUPER ADMINISTRATOR VIEW
     * =====================================================
     *
     * Super Administrators receive the complete request
     * because they are the final governance authority.
     */

    const requests = await query(
      `
        SELECT
          r.*,

          u.username AS client_username,
          u.email AS account_email,

          COALESCE(
            r.client_email,
            u.email
          ) AS client_email,

          CASE
            WHEN r.status = 'pending_super_admin_review'
            THEN true
            ELSE false
          END AS action_required

        FROM requests r

        LEFT JOIN app_users u
          ON u.id = r.user_id

        /*
         * Super Administrator retains visibility of the
         * entire governance lifecycle.
         */
        WHERE r.status IN (
          'pending_super_admin_review',
          'approved',
          'rejected',
          'completed',
          'closed'
        )

        ORDER BY r.created_at DESC
      `,
    )

    return NextResponse.json(requests.rows)
  } catch (error) {
    console.error(
      "ADMIN REQUESTS GET ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to fetch requests",
      },
      {
        status: 500,
      },
    )
  }
}