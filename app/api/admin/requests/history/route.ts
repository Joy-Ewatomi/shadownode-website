import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

type HistoryActor = {
  id: string | null
  username: string | null
  email: string | null
  role: string | null
}

type HistoryEvent = {
  id: string
  request_id: string
  action: string
  actor: HistoryActor
  details: unknown
  created_at: string
}

type RequestHistoryItem = {
  id: string
  case_number: string | null
  title: string | null
  category: string | null
  service_type: string | null
  status: string | null
  priority: string | null

  admin_quote_action: string | null
  admin_quote_notes: string | null
  admin_reviewed_by: string | null
  admin_reviewed_at: string | null

  super_admin_quote_action: string | null
  super_admin_quote_notes: string | null
  super_admin_reviewed_by: string | null
  super_admin_reviewed_at: string | null

  client_username: string | null
  client_email: string | null

  /*
   * Most recent action performed by the current role.
   *
   * These fields are historical and are NOT used to
   * determine whether the current request form is open.
   */
  latest_role_action: string | null
  latest_role_action_at: string | null

  /*
   * Total number of historical actions performed by
   * the current role on this request.
   */
  role_action_count: number

  created_at: string
  updated_at: string
}

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function normalizeRole(
  role: string | null | undefined,
): "administrator" | "super_administrator" | null {
  const normalized =
    String(role ?? "")
      .trim()
      .toLowerCase()

  if (normalized === "administrator") {
    return "administrator"
  }

  if (
    normalized === "super_administrator" ||
    normalized === "super-administrator"
  ) {
    return "super_administrator"
  }

  return null
}

function deriveCategory(
  serviceType: string | null | undefined,
): string {
  const value =
    String(serviceType ?? "")
      .trim()
      .toLowerCase()

  if (
    value.includes("osint") ||
    value.includes("digital identity") ||
    value.includes("background") ||
    value.includes("device") ||
    value.includes("investigation") ||
    value.includes("open source intelligence") ||
    value.includes("digital investigation") ||
    value.includes("digital intelligence")
  ) {
    return "osint"
  }

  if (
    value.includes("cyber") ||
    value.includes("security") ||
    value.includes("penetration") ||
    value.includes("vulnerability")
  ) {
    return "cybersecurity"
  }

  if (
    value.includes("training") ||
    value.includes("professional training")
  ) {
    return "training"
  }

  return "other"
}

function parseDetails(
  value: unknown,
): unknown {
  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  if (typeof value !== "string") {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return {
      raw: value,
    }
  }
}

/*
 * ============================================================
 * GET
 * ============================================================
 */

export async function GET(
  request: NextRequest,
) {
  try {
    /*
     * ========================================================
     * AUTHENTICATION
     * ========================================================
     */

    const user =
      await getCurrentUser()

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

    /*
     * ========================================================
     * ROLE
     * ========================================================
     */

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

    const currentRole =
      normalizeRole(user.role)

    if (!currentRole) {
      return NextResponse.json(
        {
          error: "Unsupported administrator role",
        },
        {
          status: 403,
        },
      )
    }

    /*
     * ========================================================
     * QUERY PARAMETERS
     * ========================================================
     */

    const requestId =
      request.nextUrl.searchParams
        .get("requestId")
        ?.trim() || null

    const caseNumber =
      request.nextUrl.searchParams
        .get("caseNumber")
        ?.trim() || null

    /*
     * ========================================================
     * SINGLE REQUEST HISTORY
     * ========================================================
     *
     * This endpoint continues to support:
     *
     * /api/admin/requests/history?requestId=...
     *
     * or
     *
     * /api/admin/requests/history?caseNumber=...
     *
     * This returns the complete audit history of the
     * request.
     *
     * IMPORTANT:
     *
     * This is HISTORY.
     *
     * It does not determine whether the request currently
     * needs an administrator or super administrator form.
     * ========================================================
     */

    if (requestId || caseNumber) {
      let requestResult

      if (requestId) {
        requestResult =
          await query<{
            id: string
            case_number: string | null
            title: string | null
            status: string | null
            created_at: string
            updated_at: string
          }>(
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
        requestResult =
          await query<{
            id: string
            case_number: string | null
            title: string | null
            status: string | null
            created_at: string
            updated_at: string
          }>(
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

      if (
        requestResult.rows.length ===
        0
      ) {
        return NextResponse.json(
          {
            error: "Request not found",
          },
          {
            status: 404,
          },
        )
      }

      const requestRecord =
        requestResult.rows[0]

      /*
       * ======================================================
       * COMPLETE AUDIT HISTORY
       * ======================================================
       */

      const historyResult =
        await query(
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

      const history: HistoryEvent[] =
        historyResult.rows.map(
          (
            event: Record<string, unknown>,
          ) => ({
            id:
              String(
                event.id,
              ),

            request_id:
              String(
                event.request_id,
              ),

            action:
              String(
                event.action ?? "",
              ),

            actor: {
              id:
                event.actor_user_id !=
                null
                  ? String(
                      event.actor_user_id,
                    )
                  : null,

              username:
                event.actor_username !=
                null
                  ? String(
                      event.actor_username,
                    )
                  : null,

              email:
                event.actor_email !=
                null
                  ? String(
                      event.actor_email,
                    )
                  : null,

              role:
                event.actor_role !=
                null
                  ? String(
                      event.actor_role,
                    )
                  : null,
            },

            details:
              parseDetails(
                event.details,
              ),

            created_at:
              String(
                event.created_at,
              ),
          }),
        )

      return NextResponse.json({
        success: true,

        role: currentRole,

        request: requestRecord,

        total:
          history.length,

        history,
      })
    }

    /*
     * ========================================================
     * REQUEST HISTORY LIST
     * ========================================================
     *
     * The history list is ROLE-SPECIFIC.
     *
     * Administrator:
     *
     *   show requests where an Administrator has actually
     *   performed at least one historical action.
     *
     * Super Administrator:
     *
     *   show requests where a Super Administrator has actually
     *   performed at least one historical action.
     *
     * This is intentionally independent from requests.status.
     *
     * Therefore:
     *
     *   quote_sent
     *   negotiation_requested
     *   pending_super_admin_review
     *   active
     *   completed
     *   archived
     *
     * can all coexist with history.
     *
     * A request can also return to an active workflow later.
     * Its old history remains intact.
     * ========================================================
     */

    /*
     * ========================================================
     * ADMINISTRATOR HISTORY
     * ========================================================
     */

    if (
      currentRole ===
      "administrator"
    ) {
      const result =
        await query(
          `
            SELECT
              r.id,
              r.case_number,
              r.title,

              CASE
                WHEN LOWER(
                  COALESCE(
                    r.service_type,
                    ''
                  )
                ) LIKE '%osint%'
                  OR LOWER(
                    COALESCE(
                      r.service_type,
                      ''
                    )
                  ) LIKE '%digital identity%'
                  OR LOWER(
                    COALESCE(
                      r.service_type,
                      ''
                    )
                  ) LIKE '%background%'
                  OR LOWER(
                    COALESCE(
                      r.service_type,
                      ''
                    )
                  ) LIKE '%device%'
                  OR LOWER(
                    COALESCE(
                      r.service_type,
                      ''
                    )
                  ) LIKE '%investigation%'
                  OR LOWER(
                    COALESCE(
                      r.service_type,
                      ''
                    )
                  ) LIKE '%open source intelligence%'
                  OR LOWER(
                    COALESCE(
                      r.service_type,
                      ''
                    )
                  ) LIKE '%digital investigation%'
                  OR LOWER(
                    COALESCE(
                      r.service_type,
                      ''
                    )
                  ) LIKE '%digital intelligence%'
                THEN 'osint'

                WHEN LOWER(
                  COALESCE(
                    r.service_type,
                    ''
                  )
                ) LIKE '%cyber%'
                  OR LOWER(
                    COALESCE(
                      r.service_type,
                      ''
                    )
                  ) LIKE '%security%'
                  OR LOWER(
                    COALESCE(
                      r.service_type,
                      ''
                    )
                  ) LIKE '%penetration%'
                  OR LOWER(
                    COALESCE(
                      r.service_type,
                      ''
                    )
                  ) LIKE '%vulnerability%'
                THEN 'cybersecurity'

                WHEN LOWER(
                  COALESCE(
                    r.service_type,
                    ''
                  )
                ) LIKE '%training%'
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
              ) AS client_email,

              role_history.latest_action
                AS latest_role_action,

              role_history.latest_action_at
                AS latest_role_action_at,

              COALESCE(
                role_history.role_action_count,
                0
              ) AS role_action_count

            FROM requests r

            LEFT JOIN app_users u
              ON u.id = r.user_id

            /*
             * ==================================================
             * LATEST ADMINISTRATOR HISTORY
             * ==================================================
             *
             * This finds the most recent request_audit_events
             * action performed by an Administrator.
             */

            LEFT JOIN LATERAL (
              SELECT
                rae.action AS latest_action,
                rae.created_at AS latest_action_at,

                (
                  SELECT COUNT(*)
                  FROM request_audit_events rae_count
                  INNER JOIN app_users au_count
                    ON au_count.id =
                       rae_count.actor_user_id
                  WHERE rae_count.request_id =
                        r.id
                    AND au_count.role =
                        'administrator'
                ) AS role_action_count

              FROM request_audit_events rae

              INNER JOIN app_users au
                ON au.id =
                   rae.actor_user_id

              WHERE rae.request_id =
                    r.id

                AND au.role =
                    'administrator'

              ORDER BY
                rae.created_at DESC,
                rae.id DESC

              LIMIT 1
            ) role_history
              ON true

            /*
             * ==================================================
             * HISTORY MEMBERSHIP
             * ==================================================
             *
             * At least one actual Administrator action.
             */

            WHERE EXISTS (
              SELECT 1
              FROM request_audit_events rae_history

              INNER JOIN app_users au_history
                ON au_history.id =
                   rae_history.actor_user_id

              WHERE rae_history.request_id =
                    r.id

                AND au_history.role =
                    'administrator'
            )

            ORDER BY
              role_history.latest_action_at
                DESC NULLS LAST,

              r.updated_at
                DESC NULLS LAST,

              r.created_at
                DESC
          `,
        )

      const requests: RequestHistoryItem[] =
        result.rows.map(
          (
            row: Record<string, unknown>,
          ) => ({
            id:
              String(
                row.id,
              ),

            case_number:
              row.case_number !=
              null
                ? String(
                    row.case_number,
                  )
                : null,

            title:
              row.title !=
              null
                ? String(
                    row.title,
                  )
                : null,

            category:
              row.category !=
              null
                ? String(
                    row.category,
                  )
                : deriveCategory(
                    row.service_type !=
                    null
                      ? String(
                          row.service_type,
                        )
                      : null,
                  ),

            service_type:
              row.service_type !=
              null
                ? String(
                    row.service_type,
                  )
                : null,

            status:
              row.status !=
              null
                ? String(
                    row.status,
                  )
                : null,

            priority:
              row.priority !=
              null
                ? String(
                    row.priority,
                  )
                : null,

            admin_quote_action:
              row.admin_quote_action !=
              null
                ? String(
                    row.admin_quote_action,
                  )
                : null,

            admin_quote_notes:
              row.admin_quote_notes !=
              null
                ? String(
                    row.admin_quote_notes,
                  )
                : null,

            admin_reviewed_by:
              row.admin_reviewed_by !=
              null
                ? String(
                    row.admin_reviewed_by,
                  )
                : null,

            admin_reviewed_at:
              row.admin_reviewed_at !=
              null
                ? String(
                    row.admin_reviewed_at,
                  )
                : null,

            super_admin_quote_action:
              row.super_admin_quote_action !=
              null
                ? String(
                    row.super_admin_quote_action,
                  )
                : null,

            super_admin_quote_notes:
              row.super_admin_quote_notes !=
              null
                ? String(
                    row.super_admin_quote_notes,
                  )
                : null,

            super_admin_reviewed_by:
              row.super_admin_reviewed_by !=
              null
                ? String(
                    row.super_admin_reviewed_by,
                  )
                : null,

            super_admin_reviewed_at:
              row.super_admin_reviewed_at !=
              null
                ? String(
                    row.super_admin_reviewed_at,
                  )
                : null,

            client_username:
              row.client_username !=
              null
                ? String(
                    row.client_username,
                  )
                : null,

            client_email:
              row.client_email !=
              null
                ? String(
                    row.client_email,
                  )
                : null,

            latest_role_action:
              row.latest_role_action !=
              null
                ? String(
                    row.latest_role_action,
                  )
                : null,

            latest_role_action_at:
              row.latest_role_action_at !=
              null
                ? String(
                    row.latest_role_action_at,
                  )
                : null,

            role_action_count:
              Number(
                row.role_action_count ??
                0,
              ),

            created_at:
              String(
                row.created_at,
              ),

            updated_at:
              String(
                row.updated_at,
              ),
          }),
        )

      return NextResponse.json({
        success: true,
        role: currentRole,
        total:
          requests.length,
        requests,
      })
    }

    /*
     * ========================================================
     * SUPER ADMINISTRATOR HISTORY
     * ========================================================
     */

    const result =
      await query(
        `
          SELECT
            r.id,
            r.case_number,
            r.title,

            CASE
              WHEN LOWER(
                COALESCE(
                  r.service_type,
                  ''
                )
              ) LIKE '%osint%'
                OR LOWER(
                  COALESCE(
                    r.service_type,
                    ''
                  )
                ) LIKE '%digital identity%'
                OR LOWER(
                  COALESCE(
                    r.service_type,
                    ''
                  )
                ) LIKE '%background%'
                OR LOWER(
                  COALESCE(
                    r.service_type,
                    ''
                  )
                ) LIKE '%device%'
                OR LOWER(
                  COALESCE(
                    r.service_type,
                    ''
                  )
                ) LIKE '%investigation%'
                OR LOWER(
                  COALESCE(
                    r.service_type,
                    ''
                  )
                ) LIKE '%open source intelligence%'
                OR LOWER(
                  COALESCE(
                    r.service_type,
                    ''
                  )
                ) LIKE '%digital investigation%'
                OR LOWER(
                  COALESCE(
                    r.service_type,
                    ''
                  )
                ) LIKE '%digital intelligence%'
              THEN 'osint'

              WHEN LOWER(
                COALESCE(
                  r.service_type,
                  ''
                )
              ) LIKE '%cyber%'
                OR LOWER(
                  COALESCE(
                    r.service_type,
                    ''
                  )
                ) LIKE '%security%'
                OR LOWER(
                  COALESCE(
                    r.service_type,
                    ''
                  )
                ) LIKE '%penetration%'
                OR LOWER(
                  COALESCE(
                    r.service_type,
                    ''
                  )
                ) LIKE '%vulnerability%'
              THEN 'cybersecurity'

              WHEN LOWER(
                COALESCE(
                  r.service_type,
                  ''
                )
              ) LIKE '%training%'
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
            ) AS client_email,

            role_history.latest_action
              AS latest_role_action,

            role_history.latest_action_at
              AS latest_role_action_at,

            COALESCE(
              role_history.role_action_count,
              0
            ) AS role_action_count

          FROM requests r

          LEFT JOIN app_users u
            ON u.id = r.user_id

          /*
           * ==================================================
           * LATEST SUPER ADMIN HISTORY
           * ==================================================
           */

          LEFT JOIN LATERAL (
            SELECT
              rae.action AS latest_action,
              rae.created_at AS latest_action_at,

              (
                SELECT COUNT(*)
                FROM request_audit_events rae_count
                INNER JOIN app_users au_count
                  ON au_count.id =
                     rae_count.actor_user_id
                WHERE rae_count.request_id =
                      r.id

                  AND (
                    au_count.role =
                      'super_administrator'

                    OR au_count.role =
                      'super-administrator'
                  )
              ) AS role_action_count

            FROM request_audit_events rae

            INNER JOIN app_users au
              ON au.id =
                 rae.actor_user_id

            WHERE rae.request_id =
                  r.id

              AND (
                au.role =
                  'super_administrator'

                OR au.role =
                  'super-administrator'
              )

            ORDER BY
              rae.created_at DESC,
              rae.id DESC

            LIMIT 1
          ) role_history
            ON true

          /*
           * ==================================================
           * HISTORY MEMBERSHIP
           * ==================================================
           */

          WHERE EXISTS (
            SELECT 1
            FROM request_audit_events rae_history

            INNER JOIN app_users au_history
              ON au_history.id =
                 rae_history.actor_user_id

            WHERE rae_history.request_id =
                  r.id

              AND (
                au_history.role =
                  'super_administrator'

                OR au_history.role =
                  'super-administrator'
              )
          )

          ORDER BY
            role_history.latest_action_at
              DESC NULLS LAST,

            r.updated_at
              DESC NULLS LAST,

            r.created_at
              DESC
        `,
      )

    const requests: RequestHistoryItem[] =
      result.rows.map(
        (
          row: Record<string, unknown>,
        ) => ({
          id:
            String(
              row.id,
            ),

          case_number:
            row.case_number !=
            null
              ? String(
                  row.case_number,
                )
              : null,

          title:
            row.title !=
            null
              ? String(
                  row.title,
                )
              : null,

          category:
            row.category !=
            null
              ? String(
                  row.category,
                )
              : deriveCategory(
                  row.service_type !=
                  null
                    ? String(
                        row.service_type,
                      )
                    : null,
                ),

          service_type:
            row.service_type !=
            null
              ? String(
                  row.service_type,
                )
              : null,

          status:
            row.status !=
            null
              ? String(
                  row.status,
                )
              : null,

          priority:
            row.priority !=
            null
              ? String(
                  row.priority,
                )
              : null,

          admin_quote_action:
            row.admin_quote_action !=
            null
              ? String(
                  row.admin_quote_action,
                )
              : null,

          admin_quote_notes:
            row.admin_quote_notes !=
            null
              ? String(
                  row.admin_quote_notes,
                )
              : null,

          admin_reviewed_by:
            row.admin_reviewed_by !=
            null
              ? String(
                  row.admin_reviewed_by,
                )
              : null,

          admin_reviewed_at:
            row.admin_reviewed_at !=
            null
              ? String(
                  row.admin_reviewed_at,
                )
              : null,

          super_admin_quote_action:
            row.super_admin_quote_action !=
            null
              ? String(
                  row.super_admin_quote_action,
                )
              : null,

          super_admin_quote_notes:
            row.super_admin_quote_notes !=
            null
              ? String(
                  row.super_admin_quote_notes,
                )
              : null,

          super_admin_reviewed_by:
            row.super_admin_reviewed_by !=
            null
              ? String(
                  row.super_admin_reviewed_by,
                )
              : null,

          super_admin_reviewed_at:
            row.super_admin_reviewed_at !=
            null
              ? String(
                  row.super_admin_reviewed_at,
                )
              : null,

          client_username:
            row.client_username !=
            null
              ? String(
                  row.client_username,
                )
              : null,

          client_email:
            row.client_email !=
            null
              ? String(
                  row.client_email,
                )
              : null,

          latest_role_action:
            row.latest_role_action !=
            null
              ? String(
                  row.latest_role_action,
                )
              : null,

          latest_role_action_at:
            row.latest_role_action_at !=
            null
              ? String(
                  row.latest_role_action_at,
                )
              : null,

          role_action_count:
            Number(
              row.role_action_count ??
              0,
            ),

          created_at:
            String(
              row.created_at,
            ),

          updated_at:
            String(
              row.updated_at,
            ),
        }),
      )

    return NextResponse.json({
      success: true,
      role: currentRole,
      total:
        requests.length,
      requests,
    })
  } catch (error) {
    console.error(
      "ADMIN REQUEST HISTORY GET ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to fetch request history",
      },
      {
        status: 500,
      },
    )
  }
}