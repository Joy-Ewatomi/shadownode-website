import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import {
  ensureAccess,
} from "@/lib/services/training-operations-service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type TrainingEngagementRow = {
  id: string
  progress: number | string | null
  status: string | null
  client_profile_id: string | null
}

type FeedbackRow = {
  id: string
  client_profile_id: string
  rating: number | string
  comments: string | null
  certificate_recipient_name: string | null
  public_testimonial_allowed: boolean | null
  created_at: string | null
}

function errorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : String(
        error ||
          "Unable to process training feedback.",
      )
}

function isSuperAdminRole(
  role: string | null | undefined,
): boolean {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

function isOperationalRole(
  role: string | null | undefined,
): boolean {
  return (
    role === "investigator" ||
    role === "analyst" ||
    role === "administrator" ||
    isSuperAdminRole(role)
  )
}

async function getTrainingEngagement(
  engagementId: string,
): Promise<TrainingEngagementRow> {
  const result =
    await query<TrainingEngagementRow>(
      `
        SELECT
          id,
          progress,
          status,
          client_profile_id
        FROM training_engagements
        WHERE id = $1
        LIMIT 1
      `,
      [engagementId],
    )

  if (!result.rows[0]) {
    throw new Error(
      "Training engagement not found",
    )
  }

  return result.rows[0]
}

async function listFeedbackForEngagement(
  engagementId: string,
): Promise<FeedbackRow[]> {
  const result =
    await query<FeedbackRow>(
      `
        SELECT
          id,
          client_profile_id,
          rating,
          feedback AS comments,
          certificate_recipient_name,
          public_testimonial_allowed,
          created_at
        FROM training_feedback
        WHERE training_engagement_id = $1
        ORDER BY created_at DESC
      `,
      [engagementId],
    )

  return result.rows
}

/* ============================================================
   GET
   ============================================================ */

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const user =
      await getCurrentUser()

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

    const { id } =
      await context.params

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Training engagement ID is required.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * Engagement-level authorization.
     */
    const access =
      await ensureAccess(
        id,
        user,
        false,
      )

    const engagement =
      await getTrainingEngagement(id)

    /*
     * Clients receive only their own feedback.
     */
    if (
      user.role === "client"
    ) {
      const clientProfileId =
        access.profileId ||
        engagement.client_profile_id

      if (!clientProfileId) {
        return NextResponse.json(
          {
            error:
              "Client profile could not be determined.",
          },
          {
            status: 403,
          },
        )
      }

      const result =
        await query<FeedbackRow>(
          `
            SELECT
              id,
              client_profile_id,
              rating,
              feedback AS comments,
              certificate_recipient_name,
              public_testimonial_allowed,
              created_at
            FROM training_feedback
            WHERE training_engagement_id = $1
              AND client_profile_id = $2
            ORDER BY created_at DESC
          `,
          [
            id,
            clientProfileId,
          ],
        )

      return NextResponse.json(
        {
          success: true,
          feedback:
            result.rows,
          progress: Number(
            engagement.progress || 0,
          ),
          feedbackSubmitted:
            result.rows.length > 0,
          feedbackUnlocked:
            Number(
              engagement.progress || 0,
            ) >= 100,
        },
        {
          status: 200,
        },
      )
    }

    /*
     * Operational users can review feedback only
     * after passing engagement-level authorization.
     */
    if (
      isOperationalRole(
        user.role,
      )
    ) {
      const feedback =
        await listFeedbackForEngagement(
          id,
        )

      return NextResponse.json(
        {
          success: true,
          feedback,
          progress: Number(
            engagement.progress || 0,
          ),
          feedbackUnlocked:
            Number(
              engagement.progress || 0,
            ) >= 100,
        },
        {
          status: 200,
        },
      )
    }

    return NextResponse.json(
      {
        error: "Forbidden",
      },
      {
        status: 403,
      },
    )
  } catch (error: unknown) {
    console.error(
      "TRAINING FEEDBACK GET ERROR:",
      error,
    )

    const message =
      errorMessage(error)

    const normalized =
      message.toLowerCase()

    let status = 500

    if (
      normalized.includes(
        "unauthorized",
      )
    ) {
      status = 401
    } else if (
      normalized.includes(
        "forbidden",
      ) ||
      normalized.includes(
        "not authorized",
      )
    ) {
      status = 403
    } else if (
      normalized.includes(
        "not found",
      )
    ) {
      status = 404
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status,
      },
    )
  }
}

/* ============================================================
   POST
   One-time client feedback submission
   ============================================================ */

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const user =
      await getCurrentUser()

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
     * Only the client may submit feedback.
     */
    if (
      user.role !== "client"
    ) {
      return NextResponse.json(
        {
          error:
            "Only the client can submit training feedback.",
        },
        {
          status: 403,
        },
      )
    }

    const { id } =
      await context.params

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Training engagement ID is required.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * Client must own this engagement.
     */
    const access =
      await ensureAccess(
        id,
        user,
        false,
      )

    if (!access.profileId) {
      return NextResponse.json(
        {
          error:
            "Client profile could not be determined.",
        },
        {
          status: 403,
        },
      )
    }

    const engagement =
      await getTrainingEngagement(id)

    /*
     * --------------------------------------------------------
     * COMPLETION GATE
     * --------------------------------------------------------
     */

    const progress =
      Number(
        engagement.progress || 0,
      )

    if (
      !Number.isFinite(progress) ||
      progress < 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Training feedback is locked until overall training progress reaches 100%.",
          feedbackUnlocked: false,
          progress,
        },
        {
          status: 403,
        },
      )
    }

    /*
     * --------------------------------------------------------
     * PARSE REQUEST
     * --------------------------------------------------------
     */

    let body: Record<
      string,
      unknown
    >

    try {
      body =
        await request.json()
    } catch {
      return NextResponse.json(
        {
          error:
            "Request body must contain valid JSON.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * --------------------------------------------------------
     * RATING
     * --------------------------------------------------------
     */

    const rating =
      Number(body.rating)

    if (
      !Number.isFinite(rating) ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return NextResponse.json(
        {
          error:
            "rating must be an integer between 1 and 5.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * --------------------------------------------------------
     * COMMENTS
     * --------------------------------------------------------
     *
     * Accept both:
     *
     * feedback
     * comments
     *
     * The database column is "feedback".
     */

    const rawComments =
      typeof body.feedback ===
      "string"
        ? body.feedback
        : typeof body.comments ===
            "string"
          ? body.comments
          : ""

    const comments =
      rawComments.trim()

    if (!comments) {
      return NextResponse.json(
        {
          error:
            "Feedback comments are required.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * --------------------------------------------------------
     * CERTIFICATE RECIPIENT NAME
     * --------------------------------------------------------
     *
     * This is the authoritative name that will appear
     * on the Certificate of Completion.
     *
     * It is intentionally NOT taken from:
     *
     * - username
     * - email
     * - account display name
     * - client profile nickname
     */

    const certificateRecipientName =
      typeof body
        .certificate_recipient_name ===
      "string"
        ? body.certificate_recipient_name.trim()
        : ""

    if (
      !certificateRecipientName
    ) {
      return NextResponse.json(
        {
          error:
            "Full Name for Certificate is required.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      certificateRecipientName.length >
      160
    ) {
      return NextResponse.json(
        {
          error:
            "Full Name for Certificate must be 160 characters or fewer.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * --------------------------------------------------------
     * PUBLIC TESTIMONIAL PERMISSION
     * --------------------------------------------------------
     */

    const publicTestimonialAllowed =
      body.public_testimonial_allowed ===
      true

    /*
     * --------------------------------------------------------
     * ONE-TIME SUBMISSION
     * --------------------------------------------------------
     */

    const existing =
      await query<{
        id: string
      }>(
        `
          SELECT id
          FROM training_feedback
          WHERE training_engagement_id = $1
            AND client_profile_id = $2
          LIMIT 1
        `,
        [
          id,
          access.profileId,
        ],
      )

    if (existing.rows[0]) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Feedback has already been submitted for this training engagement.",
          feedbackSubmitted: true,
          feedbackId:
            existing.rows[0].id,
          feedbackUnlocked: true,
        },
        {
          status: 409,
        },
      )
    }

    /*
     * --------------------------------------------------------
     * INSERT FEEDBACK
     * --------------------------------------------------------
     */

    const result =
      await query<FeedbackRow>(
        `
          INSERT INTO training_feedback (
            training_engagement_id,
            client_profile_id,
            rating,
            feedback,
            certificate_recipient_name,
            public_testimonial_allowed,
            created_at,
            updated_at,
            submitted_at
          )
          SELECT
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            NOW(),
            NOW(),
            NOW()
          WHERE NOT EXISTS (
            SELECT 1
            FROM training_feedback
            WHERE training_engagement_id = $1
              AND client_profile_id = $2
          )
          RETURNING
            id,
            client_profile_id,
            rating,
            feedback AS comments,
            certificate_recipient_name,
            public_testimonial_allowed,
            created_at
        `,
        [
          id,
          access.profileId,
          rating,
          comments,
          certificateRecipientName,
          publicTestimonialAllowed,
        ],
      )

    /*
     * If another request inserted the feedback between
     * our existence check and insert, RETURNING is empty.
     */

    if (!result.rows[0]) {
      const alreadySubmitted =
        await query<{
          id: string
        }>(
          `
            SELECT id
            FROM training_feedback
            WHERE training_engagement_id = $1
              AND client_profile_id = $2
            LIMIT 1
          `,
          [
            id,
            access.profileId,
          ],
        )

      return NextResponse.json(
        {
          success: false,
          error:
            "Feedback has already been submitted for this training engagement.",
          feedbackSubmitted: true,
          feedbackId:
            alreadySubmitted.rows[0]
              ?.id || null,
          feedbackUnlocked: true,
        },
        {
          status: 409,
        },
      )
    }

    const submitted =
      result.rows[0]

    /*
     * --------------------------------------------------------
     * TRAINING ACTIVITY
     * --------------------------------------------------------
     */

    try {
      await query(
        `
          INSERT INTO training_updates (
            training_engagement_id,
            updated_by,
            update_type,
            title,
            content
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5
          )
        `,
        [
          id,
          access.profileId,
          "feedback_submitted",
          "Feedback Submitted",
          "The client submitted training feedback after completing the training engagement.",
        ],
      )
    } catch (updateError) {
      /*
       * Feedback submission itself must remain successful
       * even if the activity ledger fails.
       */
      console.error(
        "TRAINING FEEDBACK ACTIVITY ERROR:",
        updateError,
      )
    }

    /*
     * --------------------------------------------------------
     * RESPONSE
     * --------------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,
        feedback: submitted,
        feedbackSubmitted: true,
        feedbackUnlocked: true,
        certificateUnlocked:
          true,
      },
      {
        status: 201,
      },
    )
  } catch (error: unknown) {
    console.error(
      "TRAINING FEEDBACK POST ERROR:",
      error,
    )

    const message =
      errorMessage(error)

    const normalized =
      message.toLowerCase()

    let status = 400

    if (
      normalized.includes(
        "unauthorized",
      )
    ) {
      status = 401
    } else if (
      normalized.includes(
        "forbidden",
      ) ||
      normalized.includes(
        "not authorized",
      )
    ) {
      status = 403
    } else if (
      normalized.includes(
        "not found",
      )
    ) {
      status = 404
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status,
      },
    )
  }
}