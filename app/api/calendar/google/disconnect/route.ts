import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import {
  disconnectGoogleCalendar,
} from "@/lib/services/calendar-service"

export async function POST() {
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
    return NextResponse.json(
      {
        error:
          "Only clients can manage their Google Calendar connection",
      },
      { status: 403 },
    )
  }

  try {
    await disconnectGoogleCalendar(
      user.id,
    )

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(
      "GOOGLE CALENDAR DISCONNECT ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to disconnect Google Calendar",
      },
      { status: 500 },
    )
  }
}