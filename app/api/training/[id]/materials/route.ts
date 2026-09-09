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

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function errorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : String(error || "Unknown error")
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
      "not authorized",
    ) ||
    normalized.includes(
      "not the approved trainer",
    )
  ) {
    return 403
  }

  if (
    normalized.includes(
      "not found",
    ) ||
    normalized.includes(
      "does not belong to this training engagement",
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
      "cannot be",
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
     * Material visibility is governed by
     * engagement-level authorization.
     */
    await ensureAccess(
      id,
      user,
      false,
    )

    const materials =
      await listMaterials(id)

    return NextResponse.json(
      {
        success: true,
        materials,
      },
      {
        status: 200,
      },
    )
  } catch (error: unknown) {
    console.error(
      "TRAINING MATERIALS GET ERROR:",
      error,
    )

    const status =
      getErrorStatus(error)

    return NextResponse.json(
      {
        success: false,
        error: errorMessage(error),
      },
      {
        status,
      },
    )
  }
}

/* =======================================================
   POST
   Create material
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
            "You are not authorized to manage training materials.",
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
     * Super Administrator:
     *   Can manage all training engagements.
     *
     * Approved trainer:
     *   Can manage only engagements where they
     *   are actually approved.
     *
     * Administrator without trainer assignment:
     *   Cannot manage materials simply because
     *   they are an administrator.
     */
    const access =
      await ensureAccess(
        id,
        user,
        true,
      )

    await requireTrainingOperatorForEngagement(
      id,
      user,
      access.profileId,
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
     * Every material must belong to a curriculum
     * module. This is now part of the training
     * architecture because material completion
     * contributes to module progress.
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
            "module_id is required. Every training material must belong to a curriculum module.",
        },
        {
          status: 400,
        },
      )
    }

    const title =
      typeof body.title ===
      "string"
        ? body.title.trim()
        : ""

    const externalUrl =
      typeof body.external_url ===
      "string"
        ? body.external_url.trim()
        : ""

    const fileUrl =
      typeof body.file_url ===
      "string"
        ? body.file_url.trim()
        : ""

    if (
      !title &&
      !externalUrl &&
      !fileUrl
    ) {
      return NextResponse.json(
        {
          error:
            "Material title or resource URL is required.",
        },
        {
          status: 400,
        },
      )
    }

    const created =
      await createMaterial(
        id,
        {
          ...body,

          title:
            title ||
            "Training Resource",

          module_id:
            moduleId,

          external_url:
            externalUrl ||
            null,

          file_url:
            fileUrl ||
            null,
        },
        access.profileId,
      )

    return NextResponse.json(
      {
        success: true,
        material: created,
      },
      {
        status: 201,
      },
    )
  } catch (error: unknown) {
    console.error(
      "TRAINING MATERIAL CREATE ERROR:",
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
   Update material
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
            "You are not authorized to manage training materials.",
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
        user,
        true,
      )

    await requireTrainingOperatorForEngagement(
      id,
      user,
      access.profileId,
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

    const materialId =
      typeof body.materialId ===
      "string"
        ? body.materialId.trim()
        : ""

    if (!materialId) {
      return NextResponse.json(
        {
          error:
            "materialId is required.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * Verify the material belongs to the engagement
     * represented by the URL.
     */
    const materials =
      await listMaterials(id)

    const materialExists =
      materials.some(
        (material) =>
          String(
            material.id,
          ) === materialId,
      )

    if (!materialExists) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Training material not found for this engagement.",
        },
        {
          status: 404,
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
     * If moving the material to another module,
     * the module cannot be empty.
     *
     * The service performs the authoritative
     * engagement ownership validation.
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
              "module_id cannot be empty. Every training material must belong to a curriculum module.",
          },
          {
            status: 400,
          },
        )
      }

      updates.module_id =
        updatedModuleId
    }

    const updated =
      await updateMaterial(
        materialId,
        updates,
        access.profileId,
      )

    return NextResponse.json(
      {
        success: true,
        material: updated,
      },
      {
        status: 200,
      },
    )
  } catch (error: unknown) {
    console.error(
      "TRAINING MATERIAL UPDATE ERROR:",
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
            "You are not authorized to manage training materials.",
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
        user,
        true,
      )

    await requireTrainingOperatorForEngagement(
      id,
      user,
      access.profileId,
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

    const materialId =
      typeof body.materialId ===
      "string"
        ? body.materialId.trim()
        : ""

    if (!materialId) {
      return NextResponse.json(
        {
          error:
            "materialId is required.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * Prevent deleting a material from another
     * engagement by supplying its ID directly.
     */
    const materials =
      await listMaterials(id)

    const materialExists =
      materials.some(
        (material) =>
          String(
            material.id,
          ) === materialId,
      )

    if (!materialExists) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Training material not found for this engagement.",
        },
        {
          status: 404,
        },
      )
    }

    const result =
      await deleteMaterial(
        materialId,
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
      "TRAINING MATERIAL DELETE ERROR:",
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