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

function errorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : String(error || "Unknown error")
}

function getErrorStatus(
  error: unknown,
): number {
  const message =
    errorMessage(error)

  const normalized =
    message.toLowerCase()

  if (
    normalized === "unauthorized" ||
    normalized.includes(
      "unauthorized",
    )
  ) {
    return 401
  }

  if (
    normalized === "forbidden" ||
    normalized.includes(
      "forbidden",
    ) ||
    normalized.includes(
      "not the approved trainer",
    ) ||
    normalized.includes(
      "not authorized",
    )
  ) {
    return 403
  }

  if (
    normalized ===
      "training engagement not found" ||
    normalized ===
      "session not found" ||
    normalized ===
      "training session not found" ||
    normalized.includes(
      "does not belong to this training engagement",
    ) ||
    normalized.includes(
      "not found for this engagement",
    )
  ) {
    return 404
  }

  if (
    normalized.includes(
      "required",
    ) ||
    normalized.includes(
      "invalid",
    ) ||
    normalized.includes(
      "must be",
    ) ||
    normalized.includes(
      "cannot be empty",
    )
  ) {
    return 400
  }

  return 500
}

async function parseJsonBody(
  request: NextRequest,
): Promise<
  Record<string, unknown> | null
> {
  const raw =
    await request.text()

  if (!raw.trim()) {
    return null
  }

  try {
    const parsed =
      JSON.parse(raw)

    if (
      !parsed ||
      typeof parsed !==
        "object" ||
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
     * Session viewing is engagement-specific.
     *
     * Clients may view their own engagement.
     * Administrators may oversee engagements.
     * Approved trainers may view assigned engagements.
     * Super Administrators may view all engagements.
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
        status:
          getErrorStatus(error),
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

    /*
     * Only trainer-capable roles may create sessions.
     *
     * Actual engagement-level trainer authorization
     * is enforced again by ensureAccess() and the
     * training operations service.
     */
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
     * Non-Super-Administrators must be an approved
     * trainer for this specific engagement.
     *
     * Super Administrator has system-wide training
     * authority and does not need engagement assignment.
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

    /*
     * Every session must now belong to a
     * curriculum module.
     */
    const moduleId =
      typeof body.module_id ===
      "string"
        ? body.module_id.trim()
        : ""

    if (!moduleId) {
      return NextResponse.json(
        {
          error:
            "module_id is required. Every training session must belong to a curriculum module.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * Pass the authenticated actor profile into
     * the service.
     *
     * The service performs the authoritative module
     * ownership and trainer validation.
     */
    const created =
      await createSession(
        id,
        {
          ...body,
          module_id: moduleId,
        },
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
        status:
          getErrorStatus(error),
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
     * Verify that the target session belongs
     * to the engagement represented by the URL.
     *
     * This prevents:
     *
     * /api/training/ENGAGEMENT-A/schedule
     *
     * from modifying a session belonging to
     * ENGAGEMENT-B by supplying its session ID.
     */
    const sessions =
      await listSessions(id)

    const session =
      sessions.find(
        (item) =>
          String(item.id) ===
          sessionId,
      )

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Training session not found for this engagement.",
        },
        {
          status: 404,
        },
      )
    }

    /*
     * When changing a session's module,
     * explicitly require a non-empty module ID.
     *
     * The service then verifies that the module
     * belongs to the same engagement.
     */
    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "module_id",
      )
    ) {
      const updatedModuleId =
        typeof updates.module_id ===
        "string"
          ? updates.module_id.trim()
          : ""

      if (!updatedModuleId) {
        return NextResponse.json(
          {
            error:
              "module_id cannot be empty. Every training session must belong to a curriculum module.",
          },
          {
            status: 400,
          },
        )
      }

      updates.module_id =
        updatedModuleId
    }

    /*
     * Session management remains server-side
     * and engagement-specific.
     */
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
        status:
          getErrorStatus(error),
      },
    )
  }
}

/* =======================================================
   DELETE
   Delete/cancel training session
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

    /*
     * Verify the session belongs to the
     * engagement in the URL before deletion.
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
          success: false,
          error:
            "Training session not found for this engagement.",
        },
        {
          status: 404,
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
        status:
          getErrorStatus(error),
      },
    )
  }
}