import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"

import {
  listModules,
  createModule,
  updateModule,
  deleteModule,
  ensureAccess,
  isApprovedTrainerForEngagement,
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
    role === "staff" ||
    role === "administrator"
  )
}

function forbiddenResponse(
  message = "Forbidden",
) {
  return NextResponse.json(
    { error: message },
    { status: 403 },
  )
}

/**
 * Verify that the current user is allowed to manage
 * modules for THIS specific training engagement.
 *
 * Super Administrator:
 *   Full training authority.
 *
 * Administrator / Investigator / Analyst:
 *   Must be the approved trainer for this engagement.
 *
 * Client:
 *   View only.
 */
async function requireModuleManager(
  engagementId: string,
  user: {
    id: string
    role: string
  } | null,
) {
  if (!user) {
    throw new Error("Unauthorized")
  }

  const isSuperAdmin =
    isSuperAdministrator(user.role)

  /*
   * Super Administrator can manage any training
   * engagement.
   */
  if (isSuperAdmin) {
    const access = await ensureAccess(
      engagementId,
      user,
      false,
    )

    return {
      profileId: access.profileId,
      isSuperAdmin: true,
    }
  }

  /*
   * Every non-Super-Admin manager must have a
   * trainer-capable account role.
   */
  if (!isTrainerCapableRole(user.role)) {
    throw new Error(
      "You are not authorized to manage training modules.",
    )
  }

  /*
   * Engagement-level access check.
   *
   * This also prevents an unrelated user from
   * accessing another engagement.
   */
  const access = await ensureAccess(
    engagementId,
    user,
    true,
  )

  const profileId = access.profileId

  if (!profileId) {
    throw new Error(
      "A trainer profile is required.",
    )
  }

  /*
   * Role alone is NOT enough.
   *
   * The user must actually be the approved trainer
   * for this specific engagement.
   */
  const approvedTrainer =
    await isApprovedTrainerForEngagement(
      engagementId,
      user,
      profileId,
    )

  if (!approvedTrainer) {
    throw new Error(
      "You are not the approved trainer for this engagement.",
    )
  }

  return {
    profileId,
    isSuperAdmin: false,
  }
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

    if (!user) {
      return forbiddenResponse("Unauthorized")
    }

    /*
     * GET is view access, not management access.
     *
     * Clients can view their own training.
     * Administrators can view training.
     * Super Administrators can view all training.
     * Approved trainers can view their engagement.
     */
    await ensureAccess(
      id,
      user,
      false,
    )

    const modules = await listModules(id)

    return NextResponse.json({
      success: true,
      modules,
    })
  } catch (error: unknown) {
    console.error(
      "TRAINING MODULE LIST ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load training modules",
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

  try {
    const { id } = await context.params

    if (!user) {
      return forbiddenResponse("Unauthorized")
    }

    /*
     * Only the approved trainer or Super Administrator
     * can create a module.
     */
    const manager =
      await requireModuleManager(id, user)

    const body = await req.json()

    const title =
      typeof body?.title === "string"
        ? body.title.trim()
        : ""

    if (!title) {
      return NextResponse.json(
        {
          error:
            "Module title is required",
        },
        { status: 400 },
      )
    }

    if (title.length < 3) {
      return NextResponse.json(
        {
          error:
            "Module title must be at least 3 characters.",
        },
        { status: 400 },
      )
    }

    if (title.length > 200) {
      return NextResponse.json(
        {
          error:
            "Module title must be 200 characters or less.",
        },
        { status: 400 },
      )
    }

    const created = await createModule(
      id,
      {
        title,

        description:
          typeof body?.description ===
          "string"
            ? body.description
            : undefined,

        objectives:
          typeof body?.objectives ===
          "string"
            ? body.objectives
            : undefined,

        module_order:
          typeof body?.module_order ===
          "number"
            ? body.module_order
            : undefined,
      },
      manager.profileId,
    )

    return NextResponse.json(
      {
        success: true,
        module: created,
      },
      { status: 201 },
    )
  } catch (error: unknown) {
    console.error(
      "TRAINING MODULE CREATE ERROR:",
      error,
    )

    const message =
      error instanceof Error
        ? error.message
        : "Failed to create training module"

    const status =
      message === "Unauthorized"
        ? 401
        : 403

    return NextResponse.json(
      { error: message },
      { status },
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
    const { id } = await context.params

    if (!user) {
      return forbiddenResponse("Unauthorized")
    }

    /*
     * Only the approved trainer or Super Administrator
     * can update a module.
     */
    const manager =
      await requireModuleManager(id, user)

    const body = await req.json()

    const moduleId =
      typeof body?.moduleId === "string"
        ? body.moduleId.trim()
        : ""

    if (!moduleId) {
      return NextResponse.json(
        {
          error:
            "moduleId is required",
        },
        { status: 400 },
      )
    }

    const updates =
      body?.updates &&
      typeof body.updates === "object" &&
      !Array.isArray(body.updates)
        ? body.updates
        : {}

    /*
     * The service should enforce the module's
     * engagement relationship as well.
     *
     * We pass the authenticated profile rather than
     * trusting a profile ID supplied by the client.
     */
    const updated = await updateModule(
      moduleId,
      updates,
      manager.profileId,
    )

    return NextResponse.json({
      success: true,
      module: updated,
    })
  } catch (error: unknown) {
    console.error(
      "TRAINING MODULE UPDATE ERROR:",
      error,
    )

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update training module"

    const status =
      message === "Unauthorized"
        ? 401
        : 403

    return NextResponse.json(
      { error: message },
      { status },
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
    const { id } = await context.params

    if (!user) {
      return forbiddenResponse("Unauthorized")
    }

    /*
     * Only the approved trainer or Super Administrator
     * can delete a module.
     */
    const manager =
      await requireModuleManager(id, user)

    const body = await req.json()

    const moduleId =
      typeof body?.moduleId === "string"
        ? body.moduleId.trim()
        : ""

    if (!moduleId) {
      return NextResponse.json(
        {
          error:
            "moduleId is required",
        },
        { status: 400 },
      )
    }

    const result = await deleteModule(
      moduleId,
      manager.profileId,
    )

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error: unknown) {
    console.error(
      "TRAINING MODULE DELETE ERROR:",
      error,
    )

    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete training module"

    const status =
      message === "Unauthorized"
        ? 401
        : 403

    return NextResponse.json(
      { error: message },
      { status },
    )
  }
}
