import { NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET() {
  try {
    /*
     * =====================================================
     * AUTHENTICATION
     * =====================================================
     */

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
     * ROLE VALIDATION
     * =====================================================
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
     * belongs to the Administrator workflow.
     *
     * ACTIVE ADMIN STATES:
     *
     *   pending_admin_review
     *   negotiation_requested
     *   negotiating
     *   under_negotiation
     *
     * This is important because a client negotiation must
     * appear in the normal Requests page.
     *
     * History is separate and is not used to surface active
     * requests.
     *
     * Administrators do not receive client-facing quote
     * fields from this endpoint.
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

            /*
             * =================================================
             * CURRENT ADMINISTRATOR ACTION STATE
             * =================================================
             */

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
             * =================================================
             * CLIENT-FACING QUOTE PROTECTION
             * =================================================
             *
             * These fields are deliberately hidden from
             * Administrators.
             */

            NULL::numeric AS client_quote_amount,
            NULL::text AS client_quote_currency,
            NULL::text AS client_quote_notes,
            NULL::text AS client_estimated_completion

          FROM requests r

          LEFT JOIN app_users u
            ON u.id = r.user_id

          /*
           * =================================================
           * ACTIVE ADMINISTRATOR WORKFLOW
           * =================================================
           *
           * IMPORTANT:
           *
           * Negotiation states are included here so the
           * negotiation response form appears from the
           * normal Request List.
           */

          WHERE r.status IN (
            'pending_admin_review',
            'negotiation_requested',
            'negotiating',
            'under_negotiation'
          )

          ORDER BY
            CASE
              WHEN r.status = 'pending_admin_review'
                THEN 1

              WHEN r.status = 'negotiation_requested'
                THEN 2

              WHEN r.status = 'negotiating'
                THEN 3

              WHEN r.status = 'under_negotiation'
                THEN 4

              ELSE 5
            END,

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
     * Super Administrators need the governance lifecycle,
     * including requests waiting for final quote approval.
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

          /*
           * =================================================
           * CURRENT SUPER ADMIN ACTION STATE
           * =================================================
           */

          CASE
            WHEN r.status = 'pending_super_admin_review'
            THEN true
            ELSE false
          END AS action_required

        FROM requests r

        LEFT JOIN app_users u
          ON u.id = r.user_id

        /*
         * =================================================
         * GOVERNANCE WORKFLOW VISIBILITY
         * =================================================
         */

        WHERE r.status IN (
          'pending_super_admin_review',
          'quote_sent',
          'revised_quote_sent',
          'client_decision_pending',
          'awaiting_client_acceptance',
          'awaiting_payment',
          'approved',
          'rejected',
          'declined',
          'completed',
          'closed',
          'archived'
        )

        ORDER BY
          CASE
            WHEN r.status = 'pending_super_admin_review'
              THEN 1

            WHEN r.status = 'client_decision_pending'
              THEN 2

            WHEN r.status = 'awaiting_client_acceptance'
              THEN 3

            WHEN r.status = 'awaiting_payment'
              THEN 4

            WHEN r.status = 'quote_sent'
              THEN 5

            WHEN r.status = 'revised_quote_sent'
              THEN 6

            ELSE 7
          END,

          r.created_at DESC
      `,
    )

    return NextResponse.json(
      requests.rows,
    )
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