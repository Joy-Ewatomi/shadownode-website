import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()

console.log("CLIENT DASHBOARD USER:", user)

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    if (user.role !== "client") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      )
    }

    const profile = await query<{ id: string }>(
  `
  SELECT id
  FROM user_profiles
  WHERE user_id = $1
  LIMIT 1
  `,
  [user.id],
);

let profileId = profile.rows[0]?.id ?? null;

if (!profileId) {
  const createdProfile = await query<{ id: string }>(
    `
    INSERT INTO user_profiles
      (id, user_id, full_name, is_anonymous)
    VALUES
      ($1, $1, $2, false)
    ON CONFLICT (user_id)
    DO UPDATE SET updated_at = NOW()
    RETURNING id
    `,
    [user.id, user.username],
  );

  profileId = createdProfile.rows[0]?.id ?? null;
}

if (!profileId) {
  return NextResponse.json(
    { error: "Unable to initialize client profile" },
    { status: 500 },
  );
}

    const [
      requests,
      cases,
      reports,
      notifications,
      stats,
    ] = await Promise.all([


      // =====================================================
      // REQUESTS
      // =====================================================
      query(
        `
        SELECT
          id,
          case_number,
          title,
          service_type,
          status,
          priority,
          created_at
        FROM requests
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 6
        `,
        [user.id],
      ),



      // =====================================================
      // CASES
      // =====================================================
      query(
        `
        SELECT
          id,
          case_number,
          title,
          status,
          priority,
          progress,
          estimated_completion,
          created_at
        FROM cases
        WHERE client_profile_id = $1
        ORDER BY created_at DESC
        LIMIT 6
        `,
        [profileId],
      ),



      // =====================================================
      // REPORTS
      // =====================================================
      query(
        `
        SELECT
          r.id,
          r.title,
          r.summary,
          r.created_at,
          c.case_number
        FROM case_reports r
        JOIN cases c
          ON c.id = r.case_id
        WHERE c.client_profile_id = $1
          AND COALESCE(r.status, 'published') IN ('approved', 'delivered', 'final', 'published')
        ORDER BY r.created_at DESC
        LIMIT 6
        `,
        [profileId],
      ),



      // =====================================================
      // NOTIFICATIONS
      // =====================================================
      query(
        `
        SELECT
          id,
          type,
          title,
          message,
          is_read,
          created_at,
          case_id
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 6
        `,
        [user.id],
      ).catch(() => ({
        rows: [],
      })),



      // =====================================================
      // STATS
      // =====================================================
      query<{
        active_cases: string
        pending_requests: string
        quote_actions: string
        reports_available: string
        unread_notifications: string
      }>(
        `
        SELECT


          (
            SELECT COUNT(*)
            FROM cases
            WHERE client_profile_id = $2
              AND payment_status = 'paid'
              AND status <> 'archived'
          ) AS active_cases,



          (
            SELECT COUNT(*)
            FROM requests
            WHERE user_id = $1
              AND status IN (
  'pending_admin_review',
  'pending_super_admin_review'
)
          ) AS pending_requests,



          (
            SELECT COUNT(*)
            FROM requests
            WHERE user_id = $1
              AND status IN (
                'quote_sent',
                'revised_quote_sent',
                'awaiting_client_acceptance',
                'negotiation_requested'
              )
          ) AS quote_actions,



          (
            SELECT COUNT(*)
            FROM case_reports r
            JOIN cases c
              ON c.id = r.case_id
            WHERE c.client_profile_id = $2
              AND COALESCE(r.status, 'published') IN ('approved', 'delivered', 'final', 'published')
          ) AS reports_available,



        (
  SELECT COUNT(*)::int
  FROM notifications
  WHERE user_id = $1
    AND is_read = false
) AS unread_notifications

        `,
        [
          user.id,
          profileId,
        ],
      ),

    ])


    return NextResponse.json({

      stats: stats.rows[0],

      requests: requests.rows,

      cases: cases.rows,

      reports: reports.rows,

      notifications: notifications.rows,

    })


  } catch (error) {

    console.error(
      "CLIENT DASHBOARD ERROR",
      error,
    )


    return NextResponse.json(
      {
        error:
          "Failed to load client dashboard",
      },
      {
        status: 500,
      },
    )
  }
}
