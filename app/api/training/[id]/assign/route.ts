import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  assignTrainer,
  getUserProfileId,
} from "@/lib/services/training-operations-service"
import { query } from "@/lib/db"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()

  if (
    !user ||
    ![
      "administrator",
      "super_administrator",
      "super-administrator",
    ].includes(user.role)
  ) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    )
  }

  let body: {
    trainerProfileId?: string
    reason?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    )
  }

  const { id } = await context.params

  const trainerProfileId =
    typeof body.trainerProfileId === "string"
      ? body.trainerProfileId.trim()
      : ""

  const reason =
    typeof body.reason === "string"
      ? body.reason.trim()
      : ""

  if (!trainerProfileId) {
    return NextResponse.json(
      { error: "trainerProfileId is required" },
      { status: 400 },
    )
  }

  if (!reason) {
    return NextResponse.json(
      {
        error:
          "A reason for the trainer assignment is required",
      },
      { status: 400 },
    )
  }

  if (reason.length < 20) {
    return NextResponse.json(
      {
        error:
          "Please provide a more detailed reason for the trainer assignment.",
      },
      { status: 400 },
    )
  }

  if (reason.length > 2000) {
    return NextResponse.json(
      {
        error:
          "The assignment reason must be 2000 characters or less.",
      },
      { status: 400 },
    )
  }

  /*
   * Verify the selected profile belongs to an active
   * trainer-capable user.
   */
  const validRes = await query(
    `
      SELECT
        au.role,
        au.status,
        up.full_name
      FROM user_profiles up
      JOIN app_users au
        ON au.id = up.user_id
      WHERE up.id = $1
      LIMIT 1
    `,
    [trainerProfileId],
  )

  const profileRow = validRes.rows[0] as
    | {
        role: string | null
        status: string | null
        full_name: string | null
      }
    | undefined

  if (!profileRow) {
    return NextResponse.json(
      { error: "Trainer profile not found" },
      { status: 404 },
    )
  }

  const allowedRoles = [
    "investigator",
    "analyst",
    "administrator",
    "super_administrator",
    "super-administrator",
  ]

  if (
    !profileRow.role ||
    !allowedRoles.includes(profileRow.role) ||
    profileRow.status !== "active"
  ) {
    return NextResponse.json(
      {
        error:
          "Target profile is not authorized to act as a trainer",
      },
      { status: 403 },
    )
  }

  /*
   * Verify the engagement exists before attempting assignment.
   */
  const engagementRes = await query(
    `
      SELECT
        id,
        engagement_number,
        assigned_trainer,
        pending_trainer_id,
        trainer_approval_status
      FROM training_engagements
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  )

  const engagement = engagementRes.rows[0]

  if (!engagement) {
    return NextResponse.json(
      { error: "Training engagement not found" },
      { status: 404 },
    )
  }

  try {
    const actorProfileId =
      await getUserProfileId(user.id)

    /*
     * Administrator proposals require Super Admin approval.
     *
     * We store the proposed trainer and reason on the
     * engagement before the approval process.
     */
    if (user.role === "administrator") {
      await query(
        `
          UPDATE training_engagements
          SET
            pending_trainer_id = $1,
            trainer_approval_status = 'pending',
            trainer_approval_requested_by = $2,
            trainer_approval_approved_by = NULL,
            trainer_approval_reason = $3,
            updated_at = NOW()
          WHERE id = $4
        `,
        [
          trainerProfileId,
          actorProfileId,
          reason,
          id,
        ],
      )

      return NextResponse.json({
        success: true,
        pending_approval: true,
        approval_status:
          "pending_super_admin_approval",
        trainer: {
          id: trainerProfileId,
          name: profileRow.full_name,
          role: profileRow.role,
        },
      })
    }

    /*
     * Super Administrator can directly assign the trainer.
     */
    await assignTrainer(
      id,
      trainerProfileId,
      actorProfileId,
      user.role,
    )

    await query(
      `
        UPDATE training_engagements
        SET
          trainer_approval_reason = $1,
          trainer_approval_status = 'approved',
          trainer_approval_approved_by = $2,
          pending_trainer_id = NULL,
          updated_at = NOW()
        WHERE id = $3
      `,
      [
        reason,
        actorProfileId,
        id,
      ],
    )

    return NextResponse.json({
      success: true,
      pending_approval: false,
      approval_status: "approved",
      trainer: {
        id: trainerProfileId,
        name: profileRow.full_name,
        role: profileRow.role,
      },
    })
  } catch (err: unknown) {
    console.error(
      "TRAINER ASSIGNMENT ERROR:",
      err,
    )

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to assign trainer",
      },
      { status: 400 },
    )
  }
}