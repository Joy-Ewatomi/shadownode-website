import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

function parseMetadata(metadata: unknown): Record<string, unknown> | null {
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata)

      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null
    } catch {
      return null
    }
  }

  if (metadata && typeof metadata === "object") {
    return metadata as Record<string, unknown>
  }

  return null
}

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>
  },
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    const { id } = await params

    /*
     * Super Administrator can inspect ANY notification.
     *
     * This is visibility only.
     *
     * Whether the notification is actionable is determined
     * by recipient_role on the client and by the destination
     * route's own authorization.
     */
    const result = await query(
      `
      SELECT
        n.id,
        n.title,
        n.message,
        n.type,
        n.is_read AS read,
        n.created_at,
        n.case_id,
        n.metadata,
        n.user_id AS recipient_id,
        u.username AS recipient_name,
        u.email AS recipient_email,
        u.role AS recipient_role
      FROM notifications n
      LEFT JOIN app_users u
        ON u.id = n.user_id
      WHERE
        n.id = $1
        AND (
          n.user_id = $2
          OR $3 = 'super_administrator'
        )
      LIMIT 1
      `,
      [id, user.id, user.role],
    )

    if (!result.rows[0]) {
      return NextResponse.json(
        {
          error: "Notification not found",
        },
        { status: 404 },
      )
    }

    const row = result.rows[0]

    return NextResponse.json({
      ...row,
      metadata: parseMetadata(row.metadata),
    })
  } catch (error) {
    console.error(
      "NOTIFICATION DETAIL ERROR",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to load notification",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>
  },
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    /*
     * Super Administrator notification stream is immutable
     * from the notification UI.
     */
    if (user.role === "super_administrator") {
      return NextResponse.json(
        {
          error:
            "Super Administrator notifications are read-only",
        },
        { status: 403 },
      )
    }

    const { id } = await params

    const result = await query(
      `
      DELETE FROM notifications
      WHERE id = $1
        AND user_id = $2
      RETURNING id
      `,
      [id, user.id],
    )

    if (!result.rows[0]) {
      return NextResponse.json(
        {
          error: "Notification not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(
      "NOTIFICATION DELETE ERROR",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to delete notification",
      },
      { status: 500 },
    )
  }
}