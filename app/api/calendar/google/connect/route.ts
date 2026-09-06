import crypto from "crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import {
  getGoogleCalendarAuthorizationUrl,
} from "@/lib/services/calendar-service"

export async function GET() {
  const user =
    await getCurrentUser()

  if (!user) {
    return NextResponse.redirect(
      new URL(
        "/login",
        process.env.NEXT_PUBLIC_APP_URL ||
          "http://localhost:3000",
      ),
    )
  }

  if (user.role !== "client") {
    return NextResponse.json(
      {
        error:
          "Only clients can connect their Google Calendar",
      },
      { status: 403 },
    )
  }

  const state =
    crypto.randomBytes(32).toString(
      "base64url",
    )

  const cookieStore =
    await cookies()

  cookieStore.set(
    "shadownode_google_calendar_state",
    state,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    },
  )

  try {
    const authorizationUrl =
      getGoogleCalendarAuthorizationUrl(
        state,
      )

    return NextResponse.redirect(
      authorizationUrl,
    )
  } catch (error) {
    console.error(
      "GOOGLE CALENDAR CONNECT ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Google Calendar is not configured",
      },
      { status: 503 },
    )
  }
}