import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"

import {
  ensureAccess,
  getUserProfileId,
  listMaterialProgress,
  updateMaterialProgress,
  recordMaterialOpened,
  recordMaterialVisited,
  recordVideoProgress,
  recordDocumentProgress,
} from "@/lib/services/training-operations-service"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function isSuperAdminRole(
  role: string | null | undefined,
): boolean {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

function isTrainerOrAdminRole(
  role: string | null | undefined,
): boolean {
  return [
    "investigator",
    "analyst",
    "staff",
    "administrator",
  ].includes(role || "")
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : String(error || "Unknown error")
}

/* =======================================================
   GET
   List material consumption/progress
   ======================================================= */

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: engagementId } = await context.params

    if (!engagementId) {
      return NextResponse.json(
        {
          error:
            "Training engagement ID is required.",
        },
        { status: 400 },
      )
    }

    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 },
      )
    }

    /*
     * Establish engagement-level authorization first.
     *
     * Client:
     *   - Own engagement only.
     *
     * Approved trainer:
     *   - Assigned engagement only.
     *
     * Administrator:
     *   - Operational oversight according to
     *     the existing access model.
     *
     * Super administrator:
     *   - System-level training access.
     */
    const access = await ensureAccess(
      engagementId,
      {
        id: user.id,
        role: user.role,
      },
      false,
    )

    /*
     * Clients must only receive their own
     * material consumption records.
     */
    if (user.role === "client") {
      if (!access.profileId) {
        return NextResponse.json(
          {
            error:
              "Client profile could not be determined.",
          },
          { status: 403 },
        )
      }

      const progress =
        await listMaterialProgress(
          engagementId,
          access.profileId,
        )

      return NextResponse.json({
        success: true,
        progress,
      })
    }

    /*
     * Operational training users can inspect
     * material progress for the engagement.
     */
    if (
      isSuperAdminRole(user.role) ||
      isTrainerOrAdminRole(user.role)
    ) {
      const progress =
        await listMaterialProgress(
          engagementId,
        )

      return NextResponse.json({
        success: true,
        progress,
      })
    }

    return NextResponse.json(
      {
        error: "Forbidden",
      },
      { status: 403 },
    )
  } catch (error) {
    console.error(
      "TRAINING MATERIAL PROGRESS GET ERROR:",
      error,
    )

    const message = errorMessage(error)

    if (message === "Unauthorized") {
      return NextResponse.json(
        {
          error: message,
        },
        { status: 401 },
      )
    }

    if (
      message === "Forbidden" ||
      message.includes(
        "not the approved trainer",
      )
    ) {
      return NextResponse.json(
        {
          error: message,
        },
        { status: 403 },
      )
    }

    if (
      message ===
      "Training engagement not found"
    ) {
      return NextResponse.json(
        {
          error: message,
        },
        { status: 404 },
      )
    }

    return NextResponse.json(
      {
        error:
          "Failed to load material progress.",
      },
      { status: 500 },
    )
  }
}

/* =======================================================
   POST
   Record material consumption/progress
   ======================================================= */

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: engagementId } =
      await context.params

    if (!engagementId) {
      return NextResponse.json(
        {
          error:
            "Training engagement ID is required.",
        },
        { status: 400 },
      )
    }

    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 },
      )
    }

    /*
     * Material consumption is a client action.
     *
     * Trainers/admins manage materials.
     * Clients consume materials and record
     * their own learning activity.
     */
    if (user.role !== "client") {
      return NextResponse.json(
        {
          error:
            "Only the client can record material consumption.",
        },
        { status: 403 },
      )
    }

    const access = await ensureAccess(
      engagementId,
      {
        id: user.id,
        role: user.role,
      },
      false,
    )

    const clientProfileId =
      access.profileId ||
      (await getUserProfileId(user.id))

    if (!clientProfileId) {
      return NextResponse.json(
        {
          error:
            "Client profile could not be determined.",
        },
        { status: 403 },
      )
    }

    let body: Record<string, unknown>

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          error:
            "Request body must contain valid JSON.",
        },
        { status: 400 },
      )
    }

    const materialId =
      typeof body.materialId === "string"
        ? body.materialId.trim()
        : ""

    if (!materialId) {
      return NextResponse.json(
        {
          error:
            "materialId is required.",
        },
        { status: 400 },
      )
    }

    const action =
      typeof body.action === "string"
        ? body.action.trim().toLowerCase()
        : ""

    /* ===================================================
       MATERIAL OPENED
       =================================================== */

    if (action === "opened") {
      const progress =
        await recordMaterialOpened(
          engagementId,
          materialId,
          clientProfileId,
        )

      return NextResponse.json({
        success: true,
        progress,
      })
    }

    /* ===================================================
       MATERIAL VISITED
       =================================================== */

    if (action === "visited") {
      const progress =
        await recordMaterialVisited(
          engagementId,
          materialId,
          clientProfileId,
        )

      return NextResponse.json({
        success: true,
        progress,
      })
    }

    /* ===================================================
       VIDEO PROGRESS
       =================================================== */

    if (action === "video_progress") {
      const watchedSeconds =
        Number(body.watchedSeconds)

      const durationSeconds =
        Number(body.durationSeconds)

      if (
        !Number.isFinite(watchedSeconds) ||
        !Number.isFinite(durationSeconds)
      ) {
        return NextResponse.json(
          {
            error:
              "watchedSeconds and durationSeconds must be valid numbers.",
          },
          { status: 400 },
        )
      }

      if (
        watchedSeconds < 0 ||
        durationSeconds < 0
      ) {
        return NextResponse.json(
          {
            error:
              "Video progress values cannot be negative.",
          },
          { status: 400 },
        )
      }

      if (durationSeconds === 0) {
        return NextResponse.json(
          {
            error:
              "durationSeconds must be greater than zero for video tracking.",
          },
          { status: 400 },
        )
      }

      const progress =
        await recordVideoProgress(
          engagementId,
          materialId,
          clientProfileId,
          watchedSeconds,
          durationSeconds,
        )

      return NextResponse.json({
        success: true,
        progress,
      })
    }

    /* ===================================================
       DOCUMENT / PDF PROGRESS
       =================================================== */

    if (action === "document_progress") {
      const pagesViewed =
        Number(body.pagesViewed)

      const totalPages =
        Number(body.totalPages)

      if (
        !Number.isFinite(pagesViewed) ||
        !Number.isFinite(totalPages)
      ) {
        return NextResponse.json(
          {
            error:
              "pagesViewed and totalPages must be valid numbers.",
          },
          { status: 400 },
        )
      }

      if (
        pagesViewed < 0 ||
        totalPages < 0
      ) {
        return NextResponse.json(
          {
            error:
              "Document progress values cannot be negative.",
          },
          { status: 400 },
        )
      }

      if (totalPages === 0) {
        return NextResponse.json(
          {
            error:
              "totalPages must be greater than zero for document tracking.",
          },
          { status: 400 },
        )
      }

      const progress =
        await recordDocumentProgress(
          engagementId,
          materialId,
          clientProfileId,
          pagesViewed,
          totalPages,
        )

      return NextResponse.json({
        success: true,
        progress,
      })
    }

    /* ===================================================
       GENERIC PROGRESS UPDATE
       =================================================== */

    const updates: {
      status?: string
      progress_percentage?: number
      watched_seconds?: number
      duration_seconds?: number
      pages_viewed?: number
      total_pages?: number
      completed?: boolean
    } = {}

    /* ---------------------------------------------------
       Status
       --------------------------------------------------- */

    if (body.status !== undefined) {
      if (typeof body.status !== "string") {
        return NextResponse.json(
          {
            error:
              "status must be a string.",
          },
          { status: 400 },
        )
      }

      updates.status = body.status
    }

    /* ---------------------------------------------------
       Progress percentage
       --------------------------------------------------- */

    if (
      body.progress_percentage !==
      undefined
    ) {
      const value = Number(
        body.progress_percentage,
      )

      if (!Number.isFinite(value)) {
        return NextResponse.json(
          {
            error:
              "progress_percentage must be a valid number.",
          },
          { status: 400 },
        )
      }

      if (value < 0 || value > 100) {
        return NextResponse.json(
          {
            error:
              "progress_percentage must be between 0 and 100.",
          },
          { status: 400 },
        )
      }

      updates.progress_percentage = value
    }

    /* ---------------------------------------------------
       Watched seconds
       --------------------------------------------------- */

    if (
      body.watched_seconds !==
      undefined
    ) {
      const value = Number(
        body.watched_seconds,
      )

      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
        return NextResponse.json(
          {
            error:
              "watched_seconds must be a valid non-negative number.",
          },
          { status: 400 },
        )
      }

      updates.watched_seconds = value
    }

    /* ---------------------------------------------------
       Duration
       --------------------------------------------------- */

    if (
      body.duration_seconds !==
      undefined
    ) {
      const value = Number(
        body.duration_seconds,
      )

      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
        return NextResponse.json(
          {
            error:
              "duration_seconds must be a valid non-negative number.",
          },
          { status: 400 },
        )
      }

      updates.duration_seconds = value
    }

    /* ---------------------------------------------------
       Pages viewed
       --------------------------------------------------- */

    if (
      body.pages_viewed !==
      undefined
    ) {
      const value = Number(
        body.pages_viewed,
      )

      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
        return NextResponse.json(
          {
            error:
              "pages_viewed must be a valid non-negative number.",
          },
          { status: 400 },
        )
      }

      updates.pages_viewed =
        Math.floor(value)
    }

    /* ---------------------------------------------------
       Total pages
       --------------------------------------------------- */

    if (
      body.total_pages !==
      undefined
    ) {
      const value = Number(
        body.total_pages,
      )

      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
        return NextResponse.json(
          {
            error:
              "total_pages must be a valid non-negative number.",
          },
          { status: 400 },
        )
      }

      updates.total_pages =
        Math.floor(value)
    }

    /* ---------------------------------------------------
       Completed
       --------------------------------------------------- */

    if (
      body.completed !==
      undefined
    ) {
      if (
        typeof body.completed !==
        "boolean"
      ) {
        return NextResponse.json(
          {
            error:
              "completed must be a boolean.",
          },
          { status: 400 },
        )
      }

      /*
       * Generic completion is intentionally
       * supported for resources where completion
       * can be explicitly recorded, such as
       * external links, assignments, references,
       * or documents without page tracking.
       *
       * Controlled video completion must use
       * `video_progress`.
       */
      updates.completed = body.completed
    }

    if (
      Object.keys(updates).length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No material progress updates were provided.",
        },
        { status: 400 },
      )
    }

    /*
     * IMPORTANT:
     *
     * Video completion must come through
     * `video_progress`, which uses the service's
     * watched-time threshold.
     *
     * Therefore the generic endpoint must not
     * be used to claim video completion.
     *
     * We intentionally reject generic video-style
     * completion claims when the request contains
     * watched_seconds / duration_seconds without
     * the dedicated action.
     *
     * The actual material type should remain
     * authoritative inside the service layer.
     */
    if (
      updates.completed === true &&
      (
        updates.watched_seconds !== undefined ||
        updates.duration_seconds !== undefined
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Video completion must be recorded using the video_progress action.",
        },
        { status: 400 },
      )
    }

    const progress =
      await updateMaterialProgress(
        engagementId,
        materialId,
        clientProfileId,
        updates,
      )

    return NextResponse.json({
      success: true,
      progress,
    })
  } catch (error) {
    console.error(
      "TRAINING MATERIAL PROGRESS POST ERROR:",
      error,
    )

    const message = errorMessage(error)

    if (message === "Unauthorized") {
      return NextResponse.json(
        {
          error: message,
        },
        { status: 401 },
      )
    }

    if (
      message === "Forbidden" ||
      message.includes(
        "not the approved trainer",
      )
    ) {
      return NextResponse.json(
        {
          error: message,
        },
        { status: 403 },
      )
    }

    if (
      message === "Material not found" ||
      message.includes(
        "does not belong to this training engagement",
      )
    ) {
      return NextResponse.json(
        {
          error: message,
        },
        { status: 404 },
      )
    }

    return NextResponse.json(
      {
        error:
          message ||
          "Failed to update material progress.",
      },
      { status: 500 },
    )
  }
}
