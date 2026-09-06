import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"

import {
  exchangeGoogleCalendarCode,
  getGoogleCalendarProfile,
  saveGoogleCalendarConnection,
} from "@/lib/services/calendar-service"

export async function GET(
  request: NextRequest,
) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"

  const url =
    new URL(request.url)

  const code =
    url.searchParams.get("code")

  const state =
    url.searchParams.get("state")

  const error =
    url.searchParams.get("error")

  if (error) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/training?calendar=denied",
        appUrl,
      ),
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/training?calendar=invalid",
        appUrl,
      ),
    )
  }

  const user =
    await getCurrentUser()

  if (!user) {
    return NextResponse.redirect(
      new URL(
        "/login",
        appUrl,
      ),
    )
  }

  if (user.role !== "client") {
    return NextResponse.redirect(
      new URL(
        "/dashboard?calendar=forbidden",
        appUrl,
      ),
    )
  }

  const cookieStore =
    await cookies()

  const savedState =
    cookieStore.get(
      "shadownode_google_calendar_state",
    )?.value

  cookieStore.delete(
    "shadownode_google_calendar_state",
  )

  if (
    !savedState ||
    savedState !== state
  ) {
    console.error(
      "GOOGLE CALENDAR STATE MISMATCH",
    )

    return NextResponse.redirect(
      new URL(
        "/dashboard/training?calendar=invalid_state",
        appUrl,
      ),
    )
  }

  try {
    const tokens =
      await exchangeGoogleCalendarCode(
        code,
      )

    const profile =
      await getGoogleCalendarProfile(
        tokens.accessToken,
      )

    await saveGoogleCalendarConnection({
      userId: user.id,

      providerAccountId:
        profile.id,

      email:
        profile.email ||
        user.email ||
        null,

      accessToken:
        tokens.accessToken,

      refreshToken:
        tokens.refreshToken,

      expiryDate:
        tokens.expiryDate,
    })

    return NextResponse.redirect(
      new URL(
        "/dashboard/training?calendar=connected",
        appUrl,
      ),
    )
  } catch (error) {
    console.error(
      "GOOGLE CALENDAR CALLBACK ERROR:",
      error,
    )

    return NextResponse.redirect(
      new URL(
        "/dashboard/training?calendar=error",
        appUrl,
      ),
    )
  }
}