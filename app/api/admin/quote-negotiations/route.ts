import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"
import {
  administratorReviewNegotiation,
  superAdminDecideNegotiation,
} from "@/lib/services/quote-workflow-service"

type Role =
  | "administrator"
  | "super-administrator"
  | "super_administrator"
  | "super_admin"
  | string

function isSuperAdministrator(role: Role) {
  return [
    "super-administrator",
    "super_administrator",
    "super_admin",
  ].includes(role)
}

function isAdministrator(role: Role) {
  return role === "administrator"
}

/*
 * =========================================================
 * GET
 * =========================================================
 *
 * ROLE VISIBILITY
 *
 * Administrator:
 *   - Current negotiation
 *   - Request information needed for review
 *   - Current quote
 *   - Client identity needed for operations
 *   - Administrator's own workflow information
 *
 * Super Administrator:
 *   - Everything above
 *   - Full negotiation history
 *   - Administrator recommendation
 *   - Previous quote rounds
 *   - Final decision information
 *
 * IMPORTANT:
 * The API enforces this separation.
 * The frontend is not trusted to hide sensitive information.
 */

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      )
    }

    if (!isAdminRole(user.role)) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        },
      )
    }

    const superAdmin = isSuperAdministrator(
      user.role,
    )

    /*
     * =======================================================
     * SUPER ADMINISTRATOR
     * =======================================================
     *
     * Full negotiation intelligence is available here.
     */

    if (superAdmin) {
      const reviews = await query(
        `
        SELECT
          qn.*,

          r.case_number,
          r.title AS request_title,
          r.description AS request_description,
          r.priority,
          r.timeline,
          r.service_type,
          r.status AS request_status,

          r.ai_price_estimate,
          r.ai_reasoning,

          r.approved_quote_amount,
          r.approved_quote_currency,
          r.approved_quote_notes,
          r.approved_estimated_completion,

          r.admin_quote_action,
          r.admin_quote_notes,
          r.admin_reviewed_by,
          r.admin_reviewed_at,

          r.super_admin_reviewed_by,
          r.super_admin_reviewed_at,

          au.email AS client_email,
          reviewer.email AS reviewer_email,

          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', history.id,

                  'round_number',
                    history.round_number,

                  'status',
                    history.status,

                  'requested_budget',
                    history.requested_budget,

                  'client_reason',
                    history.client_reason,

                  'client_notes',
                    history.client_notes,

                  'administrator_recommendation',
                    history.administrator_recommendation,

                  'revised_quote_amount',
                    history.revised_quote_amount,

                  'quote_currency',
                    history.quote_currency,

                  'owner_decision',
                    history.owner_decision,

                  'owner_decision_notes',
                    history.owner_decision_notes,

                  'assigned_reviewer_id',
                    history.assigned_reviewer_id,

                  'created_at',
                    history.created_at,

                  'updated_at',
                    history.updated_at,

                  'decided_at',
                    history.decided_at
                )
                ORDER BY history.created_at ASC
              )
              FROM quote_negotiations history
              WHERE history.request_id = qn.request_id
            ),
            '[]'::json
          ) AS history

        FROM quote_negotiations qn

        JOIN requests r
          ON r.id = qn.request_id

        LEFT JOIN app_users au
          ON au.id = qn.client_id

        LEFT JOIN app_users reviewer
          ON reviewer.id = qn.assigned_reviewer_id

        WHERE qn.id IN (
          SELECT DISTINCT ON (request_id)
            id
          FROM quote_negotiations
          ORDER BY
            request_id,
            created_at DESC
        )

        ORDER BY qn.created_at DESC
        `,
      )

      return NextResponse.json({
        success: true,
        role: "super_administrator",
        reviews: reviews.rows,
      })
    }

    /*
     * =======================================================
     * ADMINISTRATOR
     * =======================================================
     *
     * Administrators intentionally receive a reduced payload.
     *
     * They do NOT receive:
     *
     * - Full negotiation history
     * - Previous negotiation rounds
     * - Super Administrator decision history
     * - Internal owner decision notes
     * - Full governance information
     */

    if (isAdministrator(user.role)) {
      const reviews = await query(
        `
        SELECT
          qn.id,
          qn.request_id,
          qn.client_id,
          qn.assigned_reviewer_id,

          qn.round_number,
          qn.status,

          qn.original_ai_estimate,
          qn.original_quote_amount,
          qn.quote_currency,

          qn.requested_budget,
          qn.client_reason,
          qn.client_notes,

          qn.administrator_recommendation,
          qn.revised_quote_amount,

          qn.created_at,
          qn.updated_at,

          r.case_number,
          r.title AS request_title,
          r.description AS request_description,

          r.priority,
          r.timeline,
          r.service_type,
          r.status AS request_status,

          r.ai_price_estimate,

          r.approved_quote_amount,
          r.approved_quote_currency,
          r.approved_quote_notes,
          r.approved_estimated_completion,

          au.email AS client_email,
          reviewer.email AS reviewer_email

        FROM quote_negotiations qn

        JOIN requests r
          ON r.id = qn.request_id

        LEFT JOIN app_users au
          ON au.id = qn.client_id

        LEFT JOIN app_users reviewer
          ON reviewer.id = qn.assigned_reviewer_id

        WHERE qn.id IN (
          SELECT DISTINCT ON (request_id)
            id
          FROM quote_negotiations
          ORDER BY
            request_id,
            created_at DESC
        )

        ORDER BY qn.created_at DESC
        `,
      )

      return NextResponse.json({
        success: true,
        role: "administrator",
        reviews: reviews.rows,
      })
    }

    return NextResponse.json(
      {
        error: "Forbidden",
      },
      {
        status: 403,
      },
    )
  } catch (error) {
    console.error(
      "ADMIN QUOTE NEGOTIATIONS GET ERROR",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to fetch quote reviews",
      },
      {
        status: 500,
      },
    )
  }
}

/*
 * =========================================================
 * PATCH
 * =========================================================
 *
 * Administrator:
 *
 *   submit_for_super_admin
 *
 * Super Administrator:
 *
 *   super_admin_decision
 *
 * The role is checked before the action is processed.
 */

export async function PATCH(
  request: NextRequest,
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      )
    }

    if (!isAdminRole(user.role)) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        },
      )
    }

    const body = await request.json()

    const id = String(
      body.id || "",
    ).trim()

    const action = String(
      body.action || "",
    ).trim()

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Negotiation id is required",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * =======================================================
     * ADMINISTRATOR → SUPER ADMINISTRATOR
     * =======================================================
     */

    if (
      action ===
      "submit_for_super_admin"
    ) {
      /*
       * Only Administrator can perform this action.
       */

      if (!isAdministrator(user.role)) {
        return NextResponse.json(
          {
            error:
              "Only an Administrator can submit a negotiation for Super Administrator review.",
          },
          {
            status: 403,
          },
        )
      }

      const revisedAmount =
        body.revised_quote_amount ===
          undefined ||
        body.revised_quote_amount ===
          ""
          ? null
          : Number(
              body.revised_quote_amount,
            )

      if (
        revisedAmount !== null &&
        (!Number.isFinite(
          revisedAmount,
        ) ||
          revisedAmount <= 0)
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid revised quote amount",
          },
          {
            status: 400,
          },
        )
      }

      const recommendation =
        String(
          body.administrator_recommendation ||
            "",
        ).trim()

      if (!recommendation) {
        return NextResponse.json(
          {
            error:
              "Administrator recommendation is required",
          },
          {
            status: 400,
          },
        )
      }

      try {
        const result =
          await administratorReviewNegotiation(
            {
              negotiationId: id,

              administratorId:
                user.id,

              recommendation,

              revisedQuoteAmount:
                revisedAmount,

              notes:
                body.owner_decision_notes
                  ? String(
                      body.owner_decision_notes,
                    ).trim()
                  : null,
            },
          )

        return NextResponse.json({
          success: true,
          negotiation: result,
        })
      } catch (error) {
        console.error(
          "ADMIN SUBMIT NEGOTIATION ERROR",
          error,
        )

        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Failed to submit negotiation",
          },
          {
            status: 400,
          },
        )
      }
    }

    /*
     * =======================================================
     * SUPER ADMINISTRATOR DECISION
     * =======================================================
     */

    if (
      action ===
      "super_admin_decision"
    ) {
      /*
       * Only Super Administrator can
       * make the final decision.
       */

      if (
        !isSuperAdministrator(
          user.role,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Only a Super Administrator can make the final negotiation decision.",
          },
          {
            status: 403,
          },
        )
      }

      const decision = String(
        body.decision || "",
      ) as
        | "approve"
        | "reject"
        | "modify"

      if (
        ![
          "approve",
          "reject",
          "modify",
        ].includes(decision)
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid Super Administrator decision",
          },
          {
            status: 400,
          },
        )
      }

      const revisedAmount =
        body.revised_quote_amount ===
          undefined ||
        body.revised_quote_amount ===
          ""
          ? null
          : Number(
              body.revised_quote_amount,
            )

      if (
        revisedAmount !== null &&
        (!Number.isFinite(
          revisedAmount,
        ) ||
          revisedAmount <= 0)
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid revised quote amount",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * MODIFY requires an actual amount.
       */

      if (
        decision === "modify" &&
        revisedAmount === null
      ) {
        return NextResponse.json(
          {
            error:
              "A revised quote amount is required when modifying the quote.",
          },
          {
            status: 400,
          },
        )
      }

      try {
        const result =
          await superAdminDecideNegotiation(
            {
              negotiationId: id,

              superAdminId:
                user.id,

              decision,

              revisedQuoteAmount:
                revisedAmount,

              notes:
                body.owner_decision_notes
                  ? String(
                      body.owner_decision_notes,
                    ).trim()
                  : null,
            },
          )

        return NextResponse.json({
          success: true,
          negotiation: result,
        })
      } catch (error) {
        console.error(
          "SUPER ADMIN NEGOTIATION ERROR",
          error,
        )

        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Failed to process negotiation",
          },
          {
            status: 400,
          },
        )
      }
    }

    /*
     * =======================================================
     * INVALID ACTION
     * =======================================================
     */

    return NextResponse.json(
      {
        error:
          action
            ? `Invalid negotiation action: ${action}`
            : "No action was supplied.",
      },
      {
        status: 400,
      },
    )
  } catch (error) {
    console.error(
      "ADMIN QUOTE NEGOTIATION PATCH ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to update quote negotiation",
      },
      {
        status: 500,
      },
    )
  }
}