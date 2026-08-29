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
 *
 * Administrator must see every request that currently
 * requires Administrator work:
 *
 *   pending_admin_review
 *   negotiation_requested
 *   negotiating
 *   under_negotiation
 *
 * These requests remain in the active request list.
 *
 * The Administrator does NOT make the final quote decision.
 * The Administrator only prepares/submits the quote to the
 * Super Administrator.
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
          WHEN r.status IN (
            'pending_admin_review',
            'negotiation_requested',
            'negotiating',
            'under_negotiation'
          )
          THEN true
          ELSE false
        END AS action_required,

        /*
         * Administrators must not receive the final
         * client-facing quote fields from this endpoint.
         */
        NULL::numeric AS client_quote_amount,
        NULL::text AS client_quote_currency,
        NULL::text AS client_quote_notes,
        NULL::text AS client_estimated_completion

      FROM requests r

      LEFT JOIN app_users u
        ON u.id = r.user_id

      /*
       * ==================================================
       * ACTIVE ADMINISTRATOR WORK
       * ==================================================
       *
       * A request stays visible here while it requires
       * Administrator action.
       *
       * This includes a new request and a later
       * negotiation cycle.
       */
      WHERE r.status IN (
        'pending_admin_review',
        'negotiation_requested',
        'negotiating',
        'under_negotiation'
      )

      ORDER BY
        CASE
          WHEN r.status = 'negotiation_requested'
            THEN 0

          WHEN r.status = 'negotiating'
            THEN 1

          WHEN r.status = 'under_negotiation'
            THEN 2

          WHEN r.status = 'pending_admin_review'
            THEN 3

          ELSE 4
        END,

        r.updated_at DESC NULLS LAST,
        r.created_at DESC
    `,
  )

  return NextResponse.json(
    requests.rows,
  )
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