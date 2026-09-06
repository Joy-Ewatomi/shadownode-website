import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import {
  ensureAccess,
  syncTrainingSessionToGoogle,
} from "@/lib/services/training-operations-service"
import { query } from "@/lib/db"

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error)
}

export async function POST(
  _request: Request,
  context: {
    params: Promise<{
      id: string
    }>
  },
) {
  try {
    const user = await getCurrentUser()

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

    const { id: sessionId } =
      await context.params

    if (!sessionId) {
      return NextResponse.json(
        {
          error: "Training session ID is required.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * Load the session and its engagement.
     */
    const sessionResult =
      await query<{
        id: string
        training_engagement_id: string
        status: string | null
      }>(
        `
        SELECT
          id,
          training_engagement_id,
          status
        FROM training_sessions
        WHERE id = $1
        LIMIT 1
        `,
        [sessionId],
      )

    const session =
      sessionResult.rows[0]

    if (!session) {
      return NextResponse.json(
        {
          error: "Training session not found.",
        },
        {
          status: 404,
        },
      )
    }

    if (session.status === "cancelled") {
      return NextResponse.json(
        {
          error:
            "Cancelled training sessions cannot be added to Google Calendar.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * This route is intentionally client-facing.
     *
     * ensureAccess(..., false) verifies that the
     * authenticated client belongs to this engagement.
     *
     * It also allows authorized training staff to access
     * the engagement, but the explicit role check below
     * prevents staff from accidentally using this endpoint
     * to connect the client's calendar.
     */
    const access = await ensureAccess(
      session.training_engagement_id,
      user,
      false,
    )

    if (user.role !== "client") {
      return NextResponse.json(
        {
          error:
            "Only the client can add this training session to their Google Calendar.",
        },
        {
          status: 403,
        },
      )
    }

    /*
     * Make sure the resolved profile is actually the
     * engagement's client profile.
     */
    const engagementResult =
      await query<{
        client_profile_id: string | null
      }>(
        `
        SELECT client_profile_id
        FROM training_engagements
        WHERE id = $1
        LIMIT 1
        `,
        [session.training_engagement_id],
      )

    const clientProfileId =
      engagementResult.rows[0]
        ?.client_profile_id || null

    if (
      !clientProfileId ||
      access.profileId !== clientProfileId
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to add this session to your calendar.",
        },
        {
          status: 403,
        },
      )
    }

    /*
     * The calendar service:
     *
     * 1. Finds the client's Google Calendar connection.
     * 2. Refreshes the Google access token when needed.
     * 3. Creates or updates the Google event.
     * 4. Saves the Google event ID.
     */
    const result =
      await syncTrainingSessionToGoogle(
        sessionId,
      )

    if (!result.synced) {
      return NextResponse.json(
        {
          success: false,
          synced: false,
          reason:
            result.reason ||
            "Google Calendar is not connected.",
        },
        {
          status: 409,
        },
      )
    }

    return NextResponse.json({
      success: true,
      synced: true,
      eventId: result.eventId,
      message:
        "Training session added to Google Calendar.",
    })
  } catch (error) {
    console.error(
      "TRAINING GOOGLE CALENDAR SYNC ERROR:",
      error,
    )

    const message =
      errorMessage(error)

    if (
      message === "Unauthorized"
    ) {
      return NextResponse.json(
        {
          error: message,
        },
        {
          status: 401,
        },
      )
    }

    return NextResponse.json(
      {
        error:
          message ||
          "Failed to add training session to Google Calendar.",
      },
      {
        status: 500,
      },
    )
  }
}