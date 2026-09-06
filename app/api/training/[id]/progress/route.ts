import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"

import {
  ensureAccess,
  isApprovedTrainerForEngagement,
  listModuleProgress,
  upsertModuleProgress,
} from "@/lib/services/training-operations-service"

function isSuperAdminRole(
  role: string | null | undefined,
) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

export async function GET(
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

    const access = await ensureAccess(
      id,
      user,
      true,
    )

    const profileId = access.profileId

    const progress = await listModuleProgress(
      id,
      profileId || undefined,
    )

    return NextResponse.json({
      success: true,
      progress,
    })
  } catch (error: unknown) {
    console.error(
      "TRAINING PROGRESS GET ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load training progress",
      },
      { status: 403 },
    )
  }
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

    const access = await ensureAccess(
      id,
      user,
      true,
    )

    /*
     * Progress management is engagement-specific.
     *
     * Super Administrator:
     *   Always allowed.
     *
     * Approved trainer:
     *   Allowed only when the user is the
     *   approved trainer for this engagement.
     *
     * Administrator without trainer approval:
     *   Forbidden.
     *
     * Investigator/Analyst without assignment:
     *   Forbidden.
     *
     * Client:
     *   Forbidden.
     */
    let canManageProgress = false

    if (isSuperAdminRole(user.role)) {
      canManageProgress = true
    } else {
      canManageProgress =
        await isApprovedTrainerForEngagement(
          id,
          user,
          access.profileId,
        )
    }

    if (!canManageProgress) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to update progress for this training engagement.",
        },
        { status: 403 },
      )
    }

    let body: {
      moduleId?: string
      clientProfileId?: string
      status?: string
      completion_percentage?: number
      trainer_notes?: string
    }

    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request body",
        },
        { status: 400 },
      )
    }

    const moduleId =
      typeof body.moduleId === "string"
        ? body.moduleId.trim()
        : ""

    const clientProfileId =
      typeof body.clientProfileId === "string"
        ? body.clientProfileId.trim()
        : ""

    if (!moduleId || !clientProfileId) {
      return NextResponse.json(
        {
          error:
            "moduleId and clientProfileId are required",
        },
        { status: 400 },
      )
    }

    const rawCompletion =
      body.completion_percentage

    const completion =
      typeof rawCompletion === "number"
        ? rawCompletion
        : Number(rawCompletion)

    if (
      !Number.isFinite(completion) ||
      completion < 0 ||
      completion > 100
    ) {
      return NextResponse.json(
        {
          error:
            "completion_percentage must be a number between 0 and 100",
        },
        { status: 400 },
      )
    }

    const status =
      typeof body.status === "string"
        ? body.status.trim()
        : undefined

    const trainerNotes =
      typeof body.trainer_notes === "string"
        ? body.trainer_notes.trim()
        : undefined

    const updated =
      await upsertModuleProgress(
        id,
        moduleId,
        clientProfileId,
        {
          status,
          completion_percentage:
            completion,
          trainer_notes: trainerNotes,
        },
        access.profileId,
      )

    return NextResponse.json({
      success: true,
      progress: updated,
    })
  } catch (error: unknown) {
    console.error(
      "TRAINING PROGRESS POST ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update training progress",
      },
      { status: 400 },
    )
  }
}