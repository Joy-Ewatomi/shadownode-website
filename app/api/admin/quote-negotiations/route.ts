import { NextRequest, NextResponse } from "next/server"

import {
  getCurrentUser,
  isAdminRole,
} from "@/lib/auth"

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

function isSuperAdministrator(
  role: Role,
): boolean {
  return [
    "super-administrator",
    "super_administrator",
    "super_admin",
  ].includes(role)
}

function isAdministrator(
  role: Role,
): boolean {
  return role === "administrator"
}

/*
 * =========================================================
 * GET
 * =========================================================
 *
 * Administrator:
 * - Current negotiation
 * - Client's requested budget
 * - Client reason
 * - Client notes
 * - Current/original quote information
 * - Administrator workflow information
 *
 * Super Administrator:
 * - Everything above
 * - Complete negotiation history
 * - Administrator recommendation
 * - Owner decision information
 *
 * IMPORTANT
 *
 * The API itself controls visibility.
 * The frontend does not receive fields that it should not see.
 */
export async function GET() {
  try {
    /*
     * =======================================================
     * AUTHENTICATION
     * =======================================================
     */

    const user =
      await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        },
      )
    }

    /*
     * =======================================================
     * ADMIN ACCESS
     * =======================================================
     */

    if (!isAdminRole(user.role)) {
      return NextResponse.json(
        {
          error:
            "Forbidden",
        },
        {
          status: 403,
        },
      )
    }

    const superAdmin =
      isSuperAdministrator(
        user.role,
      )

    /*
     * =======================================================
     * SUPER ADMINISTRATOR VIEW
     * =======================================================
     */

    if (superAdmin) {
      const reviews =
        await query(
          `
            SELECT
              qn.*,

              /*
               * -------------------------------------------------
               * REQUEST
               * -------------------------------------------------
               */

              r.case_number,

              r.title AS request_title,

              r.description AS request_description,

              r.priority,

              r.timeline,

              r.service_type,

              r.status AS request_status,

              /*
               * -------------------------------------------------
               * AI
               * -------------------------------------------------
               */

              r.ai_price_estimate,

              r.ai_reasoning,

              /*
               * -------------------------------------------------
               * CURRENT CLIENT-FACING QUOTE
               * -------------------------------------------------
               */

              r.approved_quote_amount,

              r.approved_quote_currency,

              r.approved_quote_notes,

              r.approved_estimated_start,

              r.approved_estimated_completion,

              /*
               * -------------------------------------------------
               * ADMINISTRATOR RECORD
               * -------------------------------------------------
               */

              r.admin_quote_action,

              r.admin_quote_notes,

              r.admin_reviewed_by,

              r.admin_reviewed_at,

              /*
               * -------------------------------------------------
               * SUPER ADMINISTRATOR RECORD
               * -------------------------------------------------
               */

              r.super_admin_quote_action,

              r.super_admin_quote_notes,

              r.super_admin_reviewed_by,

              r.super_admin_reviewed_at,

              /*
               * -------------------------------------------------
               * CLIENT
               * -------------------------------------------------
               */

              au.username AS client_username,

              au.email AS client_email,

              /*
               * -------------------------------------------------
               * ASSIGNED ADMINISTRATOR
               * -------------------------------------------------
               */

              reviewer.email AS reviewer_email,

              /*
               * -------------------------------------------------
               * COMPLETE NEGOTIATION HISTORY
               * -------------------------------------------------
               */

              COALESCE(
                (
                  SELECT
                    json_agg(
                      json_build_object(

                        'id',
                        history.id,

                        'round_number',
                        history.round_number,

                        'status',
                        history.status,

                        'original_ai_estimate',
                        history.original_ai_estimate,

                        'original_quote_amount',
                        history.original_quote_amount,

                        'requested_budget',
                        history.requested_budget,

                        'quote_currency',
                        history.quote_currency,

                        'client_reason',
                        history.client_reason,

                        'client_notes',
                        history.client_notes,

                        'administrator_recommendation',
                        history.administrator_recommendation,

                        'revised_quote_amount',
                        history.revised_quote_amount,

                        'owner_decision',
                        history.owner_decision,

                        'owner_decision_notes',
                        history.owner_decision_notes,

                        'assigned_reviewer_id',
                        history.assigned_reviewer_id,

                        'decided_at',
                        history.decided_at,

                        'created_at',
                        history.created_at,

                        'updated_at',
                        history.updated_at
                      )
                      ORDER BY
                        history.created_at ASC
                    )
                  )
                  FROM quote_negotiations history
                  WHERE
                    history.request_id =
                      qn.request_id
                ),
                '[]'::json
              ) AS history

            FROM quote_negotiations qn

            INNER JOIN requests r
              ON r.id =
                qn.request_id

            LEFT JOIN app_users au
              ON au.id =
                qn.client_id

            LEFT JOIN app_users reviewer
              ON reviewer.id =
                qn.assigned_reviewer_id

            /*
             * =================================================
             * CURRENT NEGOTIATION FOR EACH REQUEST
             * =================================================
             */

            WHERE qn.id IN (
              SELECT DISTINCT ON (request_id)
                id

              FROM quote_negotiations

              ORDER BY
                request_id,
                created_at DESC
            )

            ORDER BY
              qn.created_at DESC
          `,
        )

      return NextResponse.json({
        success: true,

        role:
          "super_administrator",

        reviews:
          reviews.rows,
      })
    }

    /*
     * =======================================================
     * ADMINISTRATOR VIEW
     * =======================================================
     *
     * IMPORTANT:
     *
     * The Administrator MUST receive the client's current
     * negotiation request.
     *
     * This includes:
     *
     * V4:
     * - requested_budget
     * - quote_currency
     * - client_reason
     * - client_notes
     *
     * The Administrator does NOT receive:
     *
     * - complete negotiation history
     * - owner decision
     * - owner decision notes
     * - Super Administrator governance history
     */

    if (isAdministrator(user.role)) {
      const reviews =
        await query(
          `
            SELECT
              /*
               * -------------------------------------------------
               * NEGOTIATION
               * -------------------------------------------------
               */

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

              /*
               * -------------------------------------------------
               * REQUEST
               * -------------------------------------------------
               */

              r.case_number,

              r.title AS request_title,

              r.description AS request_description,

              r.priority,

              r.timeline,

              r.service_type,

              r.status AS request_status,

              /*
               * -------------------------------------------------
               * CLIENT REQUEST CURRENCY
               * -------------------------------------------------
               */

              r.preferred_currency,

              /*
               * -------------------------------------------------
               * CURRENT QUOTE
               * -------------------------------------------------
               */

              r.approved_quote_amount,

              r.approved_quote_currency,

              r.approved_quote_notes,

              r.approved_estimated_start,

              r.approved_estimated_completion,

              /*
               * -------------------------------------------------
               * AI
               * -------------------------------------------------
               */

              r.ai_price_estimate,

              /*
               * -------------------------------------------------
               * CLIENT
               * -------------------------------------------------
               */

              au.username AS client_username,

              au.email AS client_email,

              /*
               * -------------------------------------------------
               * ASSIGNED ADMINISTRATOR
               * -------------------------------------------------
               */

              reviewer.email AS reviewer_email

            FROM quote_negotiations qn

            INNER JOIN requests r
              ON r.id =
                qn.request_id

            LEFT JOIN app_users au
              ON au.id =
                qn.client_id

            LEFT JOIN app_users reviewer
              ON reviewer.id =
                qn.assigned_reviewer_id

            /*
             * =================================================
             * ONLY CURRENT NEGOTIATION PER REQUEST
             * =================================================
             */

            WHERE qn.id IN (
              SELECT DISTINCT ON (request_id)
                id

              FROM quote_negotiations

              ORDER BY
                request_id,
                created_at DESC
            )

            ORDER BY
              qn.created_at DESC
          `,
        )

      return NextResponse.json({
        success: true,

        role:
          "administrator",

        reviews:
          reviews.rows,
      })
    }

    /*
     * =======================================================
     * FALLBACK
     * =======================================================
     */

    return NextResponse.json(
      {
        error:
          "Forbidden",
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
        error:
          "Failed to fetch quote reviews",
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
 * =========================================================
 */

export async function PATCH(
  request: NextRequest,
) {
  try {
    /*
     * =======================================================
     * AUTHENTICATION
     * =======================================================
     */

    const user =
      await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        },
      )
    }

    /*
     * =======================================================
     * ADMIN ACCESS
     * =======================================================
     */

    if (!isAdminRole(user.role)) {
      return NextResponse.json(
        {
          error:
            "Forbidden",
        },
        {
          status: 403,
        },
      )
    }

    /*
     * =======================================================
     * REQUEST BODY
     * =======================================================
     */

    let body: Record<
      string,
      unknown
    >

    try {
      body =
        await request.json()
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid JSON request body",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * =======================================================
     * ID
     * =======================================================
     */

    const id =
      String(
        body.id ?? "",
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
     * ACTION
     * =======================================================
     */

    const action =
      String(
        body.action ?? "",
      ).trim().toLowerCase()

    /*
     * =======================================================
     * ADMINISTRATOR
     * =======================================================
     */

    if (
      action ===
      "submit_for_super_admin"
    ) {
      /*
       * -----------------------------------------------------
       * ROLE
       * -----------------------------------------------------
       */

      if (
        !isAdministrator(
          user.role,
        )
      ) {
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

      /*
       * -----------------------------------------------------
       * AMOUNT
       * -----------------------------------------------------
       */

      const revisedAmount =
        body.revised_quote_amount ===
          undefined ||
        body.revised_quote_amount ===
          null ||
        body.revised_quote_amount ===
          ""
          ? null
          : Number(
              body.revised_quote_amount,
            )

      if (
        revisedAmount !== null &&
        (
          !Number.isFinite(
            revisedAmount,
          ) ||
          revisedAmount <= 0
        )
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
       * -----------------------------------------------------
       * RECOMMENDATION
       * -----------------------------------------------------
       */

      const recommendation =
        String(
          body.administrator_recommendation ??
            body.reason ??
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

      /*
       * -----------------------------------------------------
       * NOTES
       * -----------------------------------------------------
       */

      const notes =
        String(
          body.owner_decision_notes ??
            body.notes ??
            "",
        ).trim() || null

      /*
       * -----------------------------------------------------
       * SERVICE
       * -----------------------------------------------------
       */

      try {
        const result =
          await administratorReviewNegotiation(
            {
              negotiationId:
                id,

              administratorId:
                user.id,

              recommendation,

              revisedQuoteAmount:
                revisedAmount,

              notes,
            },
          )

        return NextResponse.json({
          success: true,

          negotiation:
            result,
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
     * SUPER ADMINISTRATOR
     * =======================================================
     */

    if (
      action ===
      "super_admin_decision"
    ) {
      /*
       * -----------------------------------------------------
       * ROLE
       * -----------------------------------------------------
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

      /*
       * -----------------------------------------------------
       * DECISION
       * -----------------------------------------------------
       */

      const decision =
        String(
          body.decision ?? "",
        ).trim().toLowerCase() as
          | "approve"
          | "reject"
          | "modify"

      if (
        ![
          "approve",
          "reject",
          "modify",
        ].includes(
          decision,
        )
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

      /*
       * -----------------------------------------------------
       * AMOUNT
       * -----------------------------------------------------
       */

      const revisedAmount =
        body.revised_quote_amount ===
          undefined ||
        body.revised_quote_amount ===
          null ||
        body.revised_quote_amount ===
          ""
          ? null
          : Number(
              body.revised_quote_amount,
            )

      if (
        revisedAmount !== null &&
        (
          !Number.isFinite(
            revisedAmount,
          ) ||
          revisedAmount <= 0
        )
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
       * -----------------------------------------------------
       * MODIFY REQUIRES AMOUNT
       * -----------------------------------------------------
       */

      if (
        decision ===
          "modify" &&
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

      /*
       * -----------------------------------------------------
       * NOTES
       * -----------------------------------------------------
       */

      const notes =
        String(
          body.owner_decision_notes ??
            body.notes ??
            "",
        ).trim() || null

      /*
       * -----------------------------------------------------
       * SERVICE
       * -----------------------------------------------------
       */

      try {
        const result =
          await superAdminDecideNegotiation(
            {
              negotiationId:
                id,

              superAdminId:
                user.id,

              decision,

              revisedQuoteAmount:
                revisedAmount,

              notes,
            },
          )

        return NextResponse.json({
          success: true,

          negotiation:
            result,
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