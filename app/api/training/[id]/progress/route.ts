import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

import {
  ensureAccess,
  isApprovedTrainerForEngagement,
  listModuleProgress,
  upsertModuleProgress,
} from "@/lib/services/training-operations-service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type EngagementOwnerRow = {
  client_profile_id:
    | string
    | null
}

function isSuperAdminRole(
  role: string | null | undefined,
): boolean {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

function errorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : String(
        error ||
          "Unable to process training progress.",
      )
}

async function getEngagementClientProfileId(
  engagementId: string,
): Promise<string> {
  const result =
    await query<EngagementOwnerRow>(
      `
        SELECT
          client_profile_id
        FROM public.training_engagements
        WHERE id = $1
        LIMIT 1
      `,
      [engagementId],
    )

  if (!result.rows.length) {
    throw new Error(
      "Training engagement not found",
    )
  }

  const clientProfileId =
    result.rows[0]
      ?.client_profile_id

  if (!clientProfileId) {
    throw new Error(
      "Training engagement does not have an associated client profile.",
    )
  }

  return clientProfileId
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
     * Establish engagement-level authorization.
     */
    await ensureAccess(
      id,
      user,
      false,
    )

    /*
     * Always calculate progress against the
     * CLIENT belonging to this engagement.
     *
     * We must NOT use access.profileId here
     * for administrators/trainers because that
     * would represent their own profile rather
     * than the client's training progress.
     */
    const clientProfileId =
      await getEngagementClientProfileId(
        id,
      )

    const progress =
      await listModuleProgress(
        id,
        clientProfileId,
      )

    return NextResponse.json(
      {
        success: true,
        progress,
      },
      {
        status: 200,
      },
    )
  } catch (error: unknown) {
    console.error(
      "TRAINING PROGRESS GET ERROR:",
      error,
    )

    const message =
      errorMessage(error)

    let status = 500

    if (
      message ===
      "Unauthorized"
    ) {
      status = 401
    } else if (
      message ===
        "Forbidden" ||
      message.toLowerCase().includes(
        "not the approved trainer",
      )
    ) {
      status = 403
    } else if (
      message ===
        "Training engagement not found" ||
      message.toLowerCase().includes(
        "does not have an associated client profile",
      )
    ) {
      status = 404
    }

    return NextResponse.json(
      {
        error: message,
      },
      {
        status,
      },
    )
  }
}

/* =======================================================
   POST
   Recalculate one module
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
     * Trainer/super-admin authorization.
     */
    const access =
      await ensureAccess(
        id,
        user,
        true,
      )

    let canManageProgress =
      false

    if (
      isSuperAdminRole(
        user.role,
      )
    ) {
      canManageProgress =
        true
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
            "You are not authorized to manage progress for this training engagement.",
        },
        {
          status: 403,
        },
      )
    }

    let body: {
      moduleId?: string
      trainer_notes?: string

      /*
       * Retained only for compatibility so
       * old clients receive a clear error.
       */
      clientProfileId?: unknown

      status?: unknown
      completion_percentage?: unknown
    }

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

    const moduleId =
      typeof body.moduleId ===
      "string"
        ? body.moduleId.trim()
        : ""

    if (!moduleId) {
      return NextResponse.json(
        {
          error:
            "moduleId is required.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * SECURITY:
     *
     * Never accept clientProfileId from the
     * frontend. The engagement determines
     * which client owns the training.
     */
    const clientProfileId =
      await getEngagementClientProfileId(
        id,
      )

    /*
     * Progress and status are calculated
     * by the backend.
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "completion_percentage",
      )
    ) {
      return NextResponse.json(
        {
          error:
            "completion_percentage is system-calculated and cannot be manually changed.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "status",
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Module status is system-calculated and cannot be manually changed.",
        },
        {
          status: 400,
        },
      )
    }

    const trainerNotes =
      typeof body.trainer_notes ===
      "string"
        ? body.trainer_notes.trim()
        : undefined

    /*
     * The actual module calculation occurs
     * inside the training operations service.
     */
    const updated =
      await upsertModuleProgress(
        id,
        moduleId,
        clientProfileId,
        {
          trainer_notes:
            trainerNotes,
        },
        access.profileId,
      )

    return NextResponse.json(
      {
        success: true,
        progress: updated,
      },
      {
        status: 200,
      },
    )
  } catch (error: unknown) {
    console.error(
      "TRAINING PROGRESS POST ERROR:",
      error,
    )

    const message =
      errorMessage(error)

    let status = 500

    if (
      message ===
      "Unauthorized"
    ) {
      status = 401
    } else if (
      message ===
        "Forbidden" ||
      message.toLowerCase().includes(
        "not the approved trainer",
      )
    ) {
      status = 403
    } else if (
      message ===
        "Training engagement not found" ||
      message.toLowerCase().includes(
        "does not have an associated client profile",
      )
    ) {
      status = 404
    } else {
      status = 400
    }

    return NextResponse.json(
      {
        error: message,
      },
      {
        status,
      },
    )
  }
}