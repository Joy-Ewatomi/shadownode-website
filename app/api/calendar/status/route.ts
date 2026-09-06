import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import {
  getCalendarStatus,
} from "@/lib/services/calendar-service"

export async function GET() {
  const user =
    await getCurrentUser()

  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    )
  }

  if (user.role !== "client") {
    return NextResponse.json({
      connected: false,
      provider: null,
      email: null,
      calendarId: null,
    })
  }

  try {
    const status =
      await getCalendarStatus(
        user.id,
      )

    return NextResponse.json(status)
  } catch (error) {
    console.error(
      "GOOGLE CALENDAR STATUS ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to load calendar status",
      },
      { status: 500 },
    )
  }
}