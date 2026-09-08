import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"

import {
  listSessions,
  createSession,
  updateSession,
  deleteSession,
  ensureAccess,
} from "@/lib/services/training-operations-service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function isSuperAdministrator(
  role: string | null | undefined,
): boolean {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

function isTrainerCapableRole(
  role: string | null | undefined,
): boolean {
  return (
    role === "investigator" ||
    role === "analyst" ||
    role === "administrator" ||
    isSuperAdministrator(role)
  )
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : String(error || "Unknown error")
}

function getErrorStatus(
  error: unknown,
): number {
  const message =
    errorMessage(error)

  if (
    message ===
      "Unauthorized" ||
    message.toLowerCase().includes(
      "unauthorized",
    )
  ) {
    return 401
  }

  if (
    message === "Forbidden" ||
    message.toLowerCase().includes(
      "forbidden",
    ) ||
    message.toLowerCase().includes(
      "not the approved trainer",
    ) ||
    message.toLowerCase().includes(
      "not authorized",
    )
  ) {
    return 403
  }

  if (
    message ===
      "Training engagement not found" ||
    message ===
      "Session not found" ||
    message ===
      "Training session not found" ||
    message.toLowerCase().includes(
      "does not belong to this training engagement",
    )
  ) {
    return 404
  }

  if (
    message.toLowerCase().includes(
      "required",
    ) ||
    message.toLowerCase().includes(
      "invalid",
    ) ||
    message.toLowerCase().includes(
      "must be",
    )
  ) {
    return 400
  }

  return 500
}

async function parseJsonBody(
  request: NextRequest,
): Promise<Record<string, unknown> | null> {
  const raw = await request.text()

  if (!raw.trim()) {
    return null
  }

  try {
    const parsed =
      JSON.parse(raw)

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return null
    }

    return parsed as Record<
      string,
      unknown
    >
  } catch {
    throw new Error(
      "Request body must contain valid JSON.",
    )
  }
}

/* =======================================================
   GET
   List training sessions
   ======================================================= */

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
     * Viewing sessions is not trainer-only.
     *
     * Access is still enforced against the
     * engagement relationship.
     */
    await ensureAccess(
      id,
      {
        id: user.id,
        role: user.role,
      },
      false,
    )

    const sessions =
      await listSessions(id)

    return NextResponse.json(
      {
        success: true,
        sessions,
      },
      {
        status: 200,
      },
    )
  } catch (error: unknown) {
    console.error(
      "TRAINING SESSION GET ERROR:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error: errorMessage(error),
      },
      {
        status: getErrorStatus(error),
      },
    )
  }
}

/* =======================================================
   POST
   Create training session
   ======================================================= */

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

    if (
      !isTrainerCapableRole(
        user.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to schedule training sessions.",
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
     * Super Administrator can operate across
     * training engagements.
     *
     * Other trainer-capable users must be
     * approved for this specific engagement.
     */
    const access =
      await ensureAccess(
        id,
        {
          id: user.id,
          role: user.role,
        },
        !isSuperAdministrator(
          user.role,
        ),
      )

    const body =
      await parseJsonBody(
        request,
      )

    if (!body) {
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

    const created =
      await createSession(
        id,
        body,
        access.profileId,
      )

    return NextResponse.json(
      {
        success: true,
        session: created,
      },
      {
        status: 201,
      },
    )
  } catch (error: unknown) {
    console.error(
      "TRAINING SESSION CREATE ERROR:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error: errorMessage(error),
      },
      {
        status: getErrorStatus(error),
      },
    )
  }
}

/* =======================================================
   PUT
   Update training session
   ======================================================= */

export async function PUT(
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

    if (
      !isTrainerCapableRole(
        user.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to manage training sessions.",
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
     * For normal trainer-capable users this
     * requires approved trainer access.
     *
     * Super Administrator remains able to
     * manage the engagement without being
     * assigned as its trainer.
     */
    const access =
      await ensureAccess(
        id,
        {
          id: user.id,
          role: user.role,
        },
        !isSuperAdministrator(
          user.role,
        ),
      )

    const body =
      await parseJsonBody(
        request,
      )

    if (!body) {
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

    const sessionId =
      typeof body.sessionId ===
      "string"
        ? body.sessionId.trim()
        : ""

    if (!sessionId) {
      return NextResponse.json(
        {
          error:
            "sessionId is required.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      !body.updates ||
      typeof body.updates !==
        "object" ||
      Array.isArray(
        body.updates,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "updates must be a valid object.",
        },
        {
          status: 400,
        },
      )
    }

    const updates =
      body.updates as Record<
        string,
        unknown
      >

    /*
     * IMPORTANT:
     *
     * Verify that the session being modified
     * actually belongs to this engagement.
     *
     * The service should also enforce this,
     * but the route should never trust a
     * session ID supplied by the browser.
     */
    const sessions =
      await listSessions(id)

    const sessionExists =
      sessions.some(
        (session) =>
          String(
            session.id,
          ) === sessionId,
      )

    if (!sessionExists) {
      return NextResponse.json(
        {
          error:
            "Training session not found for this engagement.",
        },
        {
          status: 404,
        },
      )
    }

    const updated =
      await updateSession(
        sessionId,
        updates,
        access.profileId,
      )

    if (!updated) {
      return NextResponse.json(
        {
          error:
            "The training session could not be updated.",
        },
        {
          status: 500,
        },
      )
    }

    return NextResponse.json(
      {
        success: true,
        session: updated,
      },
      {
        status: 200,
      },
    )
  } catch (error: unknown) {
    console.error(
      "TRAINING SESSION UPDATE ERROR:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error: errorMessage(error),
      },
      {
        status: getErrorStatus(error),
      },
    )
  }
}

/* =======================================================
   DELETE
   Cancel training session
   ======================================================= */

export async function DELETE(
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

    if (
      !isTrainerCapableRole(
        user.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to manage training sessions.",
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

    const access =
      await ensureAccess(
        id,
        {
          id: user.id,
          role: user.role,
        },
        !isSuperAdministrator(
          user.role,
        ),
      )

    const body =
      await parseJsonBody(
        request,
      )

    if (!body) {
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

    const sessionId =
      typeof body.sessionId ===
      "string"
        ? body.sessionId.trim()
        : ""

    if (!sessionId) {
      return NextResponse.json(
        {
          error:
            "sessionId is required.",
        },
        {
          status: 400,
        },
      )
    }

    const result =
      await deleteSession(
        sessionId,
        access.profileId,
      )

    return NextResponse.json(
      {
        success: true,
        result,
      },
      {
        status: 200,
      },
    )
  } catch (error: unknown) {
    console.error(
      "TRAINING SESSION DELETE ERROR:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error: errorMessage(error),
      },
      {
        status: getErrorStatus(error),
      },
    )
  }
}