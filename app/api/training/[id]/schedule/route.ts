import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  listSessions,
  createSession,
  updateSession,
  deleteSession,
  ensureAccess,
} from "@/lib/services/training-operations-service"

function isSuperAdministrator(
  role: string | null | undefined,
) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

function isTrainerCapableRole(
  role: string | null | undefined,
) {
  return (
    role === "investigator" ||
    role === "analyst" ||
    role === "administrator" ||
    isSuperAdministrator(role)
  )
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error)
}

export async function GET(
  req: NextRequest,
  context: {
    params: Promise<{ id: string }>
  },
) {
  const user = await getCurrentUser()

  try {
    const { id } = await context.params

    /*
     * Viewing sessions is not a trainer-only operation.
     *
     * Administrators can view.
     * Super Administrators can view.
     * Assigned trainers can view.
     * Clients can view their own engagement.
     */
    await ensureAccess(id, user, false)

    const sessions = await listSessions(id)

    return NextResponse.json({
      success: true,
      sessions,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: errorMessage(error),
      },
      {
        status:
          errorMessage(error) === "Unauthorized"
            ? 401
            : 403,
      },
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

  try {
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    if (!isTrainerCapableRole(user.role)) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to schedule training sessions.",
        },
        { status: 403 },
      )
    }

    const { id } = await context.params

    /*
     * IMPORTANT:
     *
     * For an Administrator, ensureAccess(..., true)
     * will only succeed if that Administrator is the
     * APPROVED trainer for this specific engagement.
     *
     * Super Administrator remains able to manage training
     * without being assigned as the trainer.
     */
    const access = await ensureAccess(
      id,
      user,
      !isSuperAdministrator(user.role),
    )

    const body = await req.json()

    const created = await createSession(
      id,
      body,
      access.profileId,
    )

    return NextResponse.json({
      success: true,
      session: created,
    })
  } catch (error: unknown) {
    console.error(
      "TRAINING SESSION CREATE ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error: errorMessage(error),
      },
      {
        status: 403,
      },
    )
  }
}

export async function PUT(
  req: NextRequest,
  context: {
    params: Promise<{ id: string }>
  },
) {
  const user = await getCurrentUser()

  try {
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    if (!isTrainerCapableRole(user.role)) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to manage training sessions.",
        },
        { status: 403 },
      )
    }

    const { id } = await context.params

    const access = await ensureAccess(
      id,
      user,
      !isSuperAdministrator(user.role),
    )

    const body = await req.json()

    const sessionId =
      typeof body?.sessionId === "string"
        ? body.sessionId.trim()
        : ""

    if (!sessionId) {
      return NextResponse.json(
        {
          error: "sessionId is required",
        },
        { status: 400 },
      )
    }

    const updates =
      body?.updates &&
      typeof body.updates === "object"
        ? body.updates
        : {}

    const updated = await updateSession(
      sessionId,
      updates,
      access.profileId,
    )

    return NextResponse.json({
      success: true,
      session: updated,
    })
  } catch (error: unknown) {
    console.error(
      "TRAINING SESSION UPDATE ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error: errorMessage(error),
      },
      {
        status: 403,
      },
    )
  }
}

export async function DELETE(
  req: NextRequest,
  context: {
    params: Promise<{ id: string }>
  },
) {
  const user = await getCurrentUser()

  try {
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    if (!isTrainerCapableRole(user.role)) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to manage training sessions.",
        },
        { status: 403 },
      )
    }

    const { id } = await context.params

    const access = await ensureAccess(
      id,
      user,
      !isSuperAdministrator(user.role),
    )

    const body = await req.json()

    const sessionId =
      typeof body?.sessionId === "string"
        ? body.sessionId.trim()
        : ""

    if (!sessionId) {
      return NextResponse.json(
        {
          error: "sessionId is required",
        },
        { status: 400 },
      )
    }

    const result = await deleteSession(
      sessionId,
      access.profileId,
    )

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error: unknown) {
    console.error(
      "TRAINING SESSION DELETE ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error: errorMessage(error),
      },
      {
        status: 403,
      },
    )
  }
}