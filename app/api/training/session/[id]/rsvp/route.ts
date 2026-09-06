import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { getUserProfileId } from "@/lib/services/training-operations-service"

const CLIENT_RSVP_VALUES = [
  "ACCEPTED",
  "DECLINED",
  "TENTATIVE",
] as const

type ClientRsvp = (typeof CLIENT_RSVP_VALUES)[number]

export async function POST(
  req: NextRequest,
  context: {
    params: Promise<{
      id: string
    }>
  },
) {
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

  /*
   * ================================================================
   * CLIENT-ONLY RSVP
   * ================================================================
   */

  if (user.role !== "client") {
    return NextResponse.json(
      {
        error:
          "Only the client can respond to a training session.",
      },
      {
        status: 403,
      },
    )
  }

  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        {
          error: "Session ID is required",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * ================================================================
     * REQUEST BODY
     * ================================================================
     */

    let body: {
      partstat?: unknown
    }

    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request body",
        },
        {
          status: 400,
        },
      )
    }

    const partstat = String(
      body?.partstat || "",
    ).toUpperCase() as ClientRsvp | ""

    if (
      !CLIENT_RSVP_VALUES.includes(
        partstat as ClientRsvp,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid RSVP. Choose ACCEPTED, TENTATIVE, or DECLINED.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * ================================================================
     * LOAD SESSION
     * ================================================================
     */

    const sessionRes = await query<{
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
      [id],
    )

    const session = sessionRes.rows[0]

    if (!session) {
      return NextResponse.json(
        {
          error: "Session not found",
        },
        {
          status: 404,
        },
      )
    }

    const engagementId =
      session.training_engagement_id

    /*
     * ================================================================
     * IDENTIFY CLIENT PROFILE
     * ================================================================
     */

    const profileId =
      await getUserProfileId(user.id)

    if (!profileId) {
      return NextResponse.json(
        {
          error:
            "Your client profile could not be identified.",
        },
        {
          status: 403,
        },
      )
    }

    /*
     * ================================================================
     * VERIFY ENGAGEMENT OWNERSHIP
     * ================================================================
     */

    const engagementRes = await query<{
      id: string
      client_profile_id: string | null
      status: string | null
    }>(
      `
        SELECT
          id,
          client_profile_id,
          status
        FROM training_engagements
        WHERE id = $1
        LIMIT 1
      `,
      [engagementId],
    )

    const engagement =
      engagementRes.rows[0]

    if (!engagement) {
      return NextResponse.json(
        {
          error:
            "Training engagement not found.",
        },
        {
          status: 404,
        },
      )
    }

    if (
      engagement.client_profile_id !==
      profileId
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to respond to this training session.",
        },
        {
          status: 403,
        },
      )
    }

    /*
     * ================================================================
     * SESSION STATUS
     * ================================================================
     */

    if (
      session.status &&
      session.status.toLowerCase() ===
        "cancelled"
    ) {
      return NextResponse.json(
        {
          error:
            "This training session has been cancelled.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * ================================================================
     * CHECK EXISTING RESPONSE
     * ================================================================
     *
     * Once the client has responded, we do not allow another RSVP
     * through this endpoint.
     *
     * This prevents:
     *
     * ACCEPTED -> DECLINED
     * ACCEPTED -> TENTATIVE
     * DECLINED -> ACCEPTED
     *
     * unless you later explicitly build a "Change Response" feature.
     */

    const existingRes = await query<{
      partstat: ClientRsvp
    }>(
      `
        SELECT
          partstat
        FROM training_session_attendees
        WHERE session_id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [
        id,
        user.id,
      ],
    )

    const existingResponse =
      existingRes.rows[0]

    if (existingResponse) {
      return NextResponse.json(
        {
          error:
            "You have already responded to this training session.",
          partstat:
            existingResponse.partstat,
        },
        {
          status: 409,
        },
      )
    }

    /*
     * ================================================================
     * SAVE CLIENT RESPONSE
     * ================================================================
     */

    const now =
      new Date().toISOString()

    await query(
      `
        INSERT INTO training_session_attendees (
          session_id,
          training_engagement_id,
          profile_id,
          user_id,
          email,
          partstat,
          responded_at,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          NOW(),
          NOW()
        )
        ON CONFLICT (
          session_id,
          user_id
        )
        DO UPDATE SET
          profile_id = EXCLUDED.profile_id,
          email = EXCLUDED.email,
          partstat = EXCLUDED.partstat,
          responded_at = EXCLUDED.responded_at,
          updated_at = NOW()
      `,
      [
        id,
        engagementId,
        profileId,
        user.id,
        user.email || null,
        partstat,
        now,
      ],
    )

    return NextResponse.json({
      success: true,
      partstat,
      locked: true,
    })
  } catch (error: unknown) {
    console.error(
      "TRAINING SESSION RSVP ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update RSVP",
      },
      {
        status: 500,
      },
    )
  }
}