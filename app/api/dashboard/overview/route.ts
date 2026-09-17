import { NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { getAdminDashboardCounts } from "@/lib/dashboard-counts"
import { profileIdForUser } from "@/lib/investigation-workspace"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdminRole(user.role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const profileId = await profileIdForUser(user.id)
    const counts = await getAdminDashboardCounts({
      userId: user.id,
      profileId,
    })

    const stats = {
      ...counts,
      total_cases: counts.requests_awaiting_review ?? 0,
      active_investigations: counts.active_cases ?? 0,
      pending_assignments: counts.cases_awaiting_assignment ?? 0,
      total_training: counts.training_requiring_action ?? 0,
      unresolved_alerts: counts.unread_notifications ?? 0,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error(
      "DASHBOARD OVERVIEW ERROR",
      error
    )

    return NextResponse.json(
      {
        error: "Failed to load dashboard",
      },
      {
        status: 500,
      }
    )
  }
}
