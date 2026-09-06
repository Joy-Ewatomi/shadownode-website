import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"

import {
  getUserProfileId,
  isApprovedTrainerForEngagement,
} from "@/lib/services/training-operations-service"

import { completeTrainingEngagement } from "@/lib/services/training-completion-service"

function isSuperAdminRole(
  role: string | null | undefined,
) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

export async function POST(
  req: NextRequest,
  context: {
    params: Promise<{ id: string }>
  },
) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    )
  }

  try {
    const { id } = await context.params

    if (!id?.trim()) {
      return NextResponse.json(
        {
          error:
            "Training engagement ID is required",
        },
        { status: 400 },
      )
    }

    const profileId =
      await getUserProfileId(user.id)

    if (!profileId) {
      return NextResponse.json(
        {
          error: "User profile not found",
        },
        { status: 400 },
      )
    }

    /*
     * Completion is an engagement-level trainer
     * operation.
     *
     * Super Administrator:
     *   Always authorized.
     *
     * Approved trainer:
     *   Authorized only for this engagement.
     *
     * Everyone else:
     *   Forbidden.
     */
    let canComplete = false

    if (isSuperAdminRole(user.role)) {
      canComplete = true
    } else {
      canComplete =
        await isApprovedTrainerForEngagement(
          id,
          user,
          profileId,
        )
    }

    if (!canComplete) {
      return NextResponse.json(
        {
          error:
            "Only the approved trainer or a Super Administrator can complete this training engagement.",
        },
        { status: 403 },
      )
    }

    /*
     * The completion service currently accepts the
     * actor profile ID and verifies that it matches
     * the assigned trainer.
     *
     * Super Administrator therefore needs to be
     * handled explicitly by the completion service.
     */
    const result =
      await completeTrainingEngagement(
        id,
        profileId,
        user.role,
      )

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error: unknown) {
    console.error(
      "TRAINING COMPLETION ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to complete training engagement",
      },
      { status: 400 },
    )
  }
}