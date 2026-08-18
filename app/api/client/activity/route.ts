import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
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

    const activities = await query(
      `
      SELECT
        id,
        type,
        case_number,
        title,
        detail,
        status,
        created_at
      FROM (

        SELECT
          r.id::text AS id,
          'request' AS type,
          r.case_number,
          r.title,
          CONCAT(
            'Investigation request ',
            COALESCE(r.case_number, ''),
            ' is currently ',
            r.status
          ) AS detail,
          r.status,
          r.created_at

        FROM requests r

        WHERE r.user_id = $1


        UNION ALL


        SELECT
          n.id::text AS id,
          'activity' AS type,
          NULL AS case_number,
          n.title,
          COALESCE(n.message, n.title) AS detail,
          CASE
            WHEN n.is_read = false THEN 'Unread'
            ELSE 'Read'
          END AS status,
          n.created_at

        FROM notifications n

        WHERE n.user_id = $1


        UNION ALL


        SELECT
          c.id::text AS id,
          'case' AS type,
          c.case_number,
          c.title,
          CONCAT(
            'Case ',
            c.case_number,
            ' status: ',
            c.status
          ) AS detail,
          c.status,
          c.created_at

        FROM cases c

        WHERE c.client_profile_id IN (
          SELECT id
          FROM user_profiles
          WHERE user_id = $1
        )

      ) activity

      ORDER BY created_at DESC

      LIMIT 10
      `,
      [user.id],
    )

    return NextResponse.json(
      activities.rows.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        detail: item.detail,
        status: item.status || "Update",
      })),
    )
  } catch (error) {
    console.error(
      "CLIENT ACTIVITY ERROR",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to load activity",
      },
      {
        status: 500,
      },
    )
  }
}