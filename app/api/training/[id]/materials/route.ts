import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"

import {
  listMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  ensureAccess,
  requireTrainingOperatorForEngagement,
} from "@/lib/services/training-operations-service"

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error)
}

function isTrainerCapableRole(
  role: string | null | undefined,
) {
  return (
    role === "investigator" ||
    role === "analyst" ||
    role === "administrator" ||
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
      {
        error: "Unauthorized",
      },
      { status: 401 },
    )
  }

  try {
    const { id } = await context.params

    /*
     * Viewing materials is separate from managing materials.
     *
     * The engagement-level access check determines whether
     * this user is allowed to see the training engagement.
     */
    await ensureAccess(
      id,
      user,
      false,
    )

    const materials =
      await listMaterials(id)

    return NextResponse.json({
      success: true,
      materials,
    })
  } catch (error: unknown) {
    console.error(
      "TRAINING MATERIALS GET ERROR:",
      error,
    )

    const message =
      errorMessage(error)

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          message === "Unauthorized"
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

  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    )
  }

  try {
    if (!isTrainerCapableRole(user.role)) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to manage training materials.",
        },
        { status: 403 },
      )
    }

    const { id } = await context.params

    /*
     * ============================================================
     * TRAINING OPERATOR AUTHORIZATION
     * ============================================================
     *
     * Super Administrator:
     *   Always allowed.
     *
     * Approved assigned trainer:
     *   Allowed.
     *
     * Normal Administrator:
     *   NOT allowed merely because they are an administrator.
     *
     * Investigator / Analyst:
     *   NOT allowed unless approved as the trainer for
     *   this specific engagement.
     */
    const access =
      await ensureAccess(
        id,
        user,
        false,
      )

    await requireTrainingOperatorForEngagement(
      id,
      user,
      access.profileId,
    )

    const body =
      await req.json()

    if (
      !body ||
      typeof body !== "object"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid request body",
        },
        { status: 400 },
      )
    }

    const created =
      await createMaterial(
        id,
        body,
        access.profileId,
      )

    return NextResponse.json(
      {
        success: true,
        material: created,
      },
      { status: 201 },
    )
  } catch (error: unknown) {
    console.error(
      "TRAINING MATERIAL CREATE ERROR:",
      error,
    )

    const message =
      errorMessage(error)

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          message === "Unauthorized"
            ? 401
            : 403,
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

  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    )
  }

  try {
    if (!isTrainerCapableRole(user.role)) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to manage training materials.",
        },
        { status: 403 },
      )
    }

    const { id } = await context.params

    /*
     * The user must have access to this engagement.
     */
    const access =
      await ensureAccess(
        id,
        user,
        false,
      )

    /*
     * Managing materials requires either:
     *
     * - Super Administrator
     * - Approved trainer assigned to this engagement
     */
    await requireTrainingOperatorForEngagement(
      id,
      user,
      access.profileId,
    )

    const body =
      await req.json()

    if (
      !body ||
      typeof body !== "object"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid request body",
        },
        { status: 400 },
      )
    }

    const materialId =
      typeof body.materialId ===
      "string"
        ? body.materialId.trim()
        : ""

    if (!materialId) {
      return NextResponse.json(
        {
          error:
            "materialId is required",
        },
        { status: 400 },
      )
    }

    const updates =
      body.updates &&
      typeof body.updates ===
        "object"
        ? body.updates
        : {}

    const updated =
      await updateMaterial(
        materialId,
        updates,
        access.profileId,
      )

    return NextResponse.json({
      success: true,
      material: updated,
    })
  } catch (error: unknown) {
    console.error(
      "TRAINING MATERIAL UPDATE ERROR:",
      error,
    )

    const message =
      errorMessage(error)

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          message === "Unauthorized"
            ? 401
            : 403,
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

  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    )
  }

  try {
    if (!isTrainerCapableRole(user.role)) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to manage training materials.",
        },
        { status: 403 },
      )
    }

    const { id } = await context.params

    /*
     * The user must have access to this engagement.
     */
    const access =
      await ensureAccess(
        id,
        user,
        false,
      )

    /*
     * Only Super Administrator or the approved
     * engagement trainer can delete materials.
     */
    await requireTrainingOperatorForEngagement(
      id,
      user,
      access.profileId,
    )

    const body =
      await req.json()

    if (
      !body ||
      typeof body !== "object"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid request body",
        },
        { status: 400 },
      )
    }

    const materialId =
      typeof body.materialId ===
      "string"
        ? body.materialId.trim()
        : ""

    if (!materialId) {
      return NextResponse.json(
        {
          error:
            "materialId is required",
        },
        { status: 400 },
      )
    }

    const result =
      await deleteMaterial(
        materialId,
        access.profileId,
      )

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error: unknown) {
    console.error(
      "TRAINING MATERIAL DELETE ERROR:",
      error,
    )

    const message =
      errorMessage(error)

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          message === "Unauthorized"
            ? 401
            : 403,
      },
    )
  }
}