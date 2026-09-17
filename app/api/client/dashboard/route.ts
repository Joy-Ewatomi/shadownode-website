import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getClientDashboardCounts } from "@/lib/dashboard-counts"
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
      getClientDashboardCounts({
        userId: user.id,
        profileId,
      }),

    ])

    const dashboardStats = {
      ...stats,
      pending_requests: stats.requests_total ?? 0,
      quote_actions: stats.requests_requiring_action ?? 0,
      reports_available: stats.reports ?? 0,
      unread_notifications: stats.unread_notifications ?? 0,
    }

    return NextResponse.json({

      stats: dashboardStats,

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
