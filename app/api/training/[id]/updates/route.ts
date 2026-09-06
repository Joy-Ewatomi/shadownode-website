import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import {
  ensureAccess,
  requireTrainingOperatorForEngagement,
} from "@/lib/services/training-operations-service"
import { query } from "@/lib/db"

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

    /*
     * Reading updates only requires access to the
     * training engagement.
     *
     * Clients can see their own updates.
     * Approved trainers can see updates.
     * Super Administrators can see all updates.
     */
    await ensureAccess(
      id,
      user,
      false,
    )

    const res = await query(
      `
        SELECT
          id,
          updated_by,
          update_type,
          title,
          content,
          created_at
        FROM training_updates
        WHERE training_engagement_id = $1
        ORDER BY created_at DESC
      `,
      [id],
    )

    return NextResponse.json({
      success: true,
      updates: res.rows,
    })
  } catch (err: unknown) {
    console.error(
      "TRAINING UPDATES GET ERROR:",
      err,
    )

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to load training updates",
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

    /*
     * First establish normal engagement access.
     */
    const access = await ensureAccess(
      id,
      user,
      false,
    )

    /*
     * Posting a training update is an operational
     * training action.
     *
     * Super Administrator:
     *   Always allowed.
     *
     * Everyone else:
     *   Must be the approved trainer assigned to
     *   THIS engagement.
     */
    await requireTrainingOperatorForEngagement(
      id,
      user,
      access.profileId,
    )

    let body: {
      title?: string
      content?: string
      update_type?: string
    }

    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      )
    }

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : ""

    const content =
      typeof body.content === "string"
        ? body.content.trim()
        : ""

    const updateType =
      typeof body.update_type === "string" &&
      body.update_type.trim()
        ? body.update_type.trim()
        : "note"

    if (!title || !content) {
      return NextResponse.json(
        {
          error:
            "title and content are required",
        },
        { status: 400 },
      )
    }

    if (title.length > 255) {
      return NextResponse.json(
        {
          error:
            "Title must be 255 characters or less",
        },
        { status: 400 },
      )
    }

    const res = await query(
      `
        INSERT INTO training_updates (
          training_engagement_id,
          updated_by,
          update_type,
          title,
          content,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          NOW(),
          NOW()
        )
        RETURNING *
      `,
      [
        id,
        access.profileId,
        updateType,
        title,
        content,
      ],
    )

    return NextResponse.json({
      success: true,
      update: res.rows[0],
    })
  } catch (err: unknown) {
    console.error(
      "TRAINING UPDATE POST ERROR:",
      err,
    )

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to create training update",
      },
      { status: 400 },
    )
  }
}