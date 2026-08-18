import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const startedAt = performance.now()

    const authStartedAt = performance.now()
    const user = await getCurrentUser()
    const authMs = Math.round(performance.now() - authStartedAt)

    if (!user) {
      console.log(`[notifications] auth=${authMs}ms unauthorized`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isSuperAdministrator = user.role === "super_administrator"
    const queryStartedAt = performance.now()

    const notifications = isSuperAdministrator
      ? await query(
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
          LEFT JOIN app_users u ON u.id = n.user_id
          ORDER BY n.created_at DESC
          `,
        )
      : await query(
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
          LEFT JOIN app_users u ON u.id = n.user_id
          WHERE n.user_id = $1
          ORDER BY n.created_at DESC
          `,
          [user.id],
        )

    const rows = notifications.rows.map((row: Record<string, unknown>) => {
      const metadata = row.metadata
      let parsedMetadata: Record<string, unknown> | null = null

      if (typeof metadata === "string") {
        try {
          parsedMetadata = JSON.parse(metadata)
        } catch {
          parsedMetadata = null
        }
      } else if (metadata && typeof metadata === "object") {
        parsedMetadata = metadata as Record<string, unknown>
      }

      return {
        ...row,
        metadata: parsedMetadata,
      }
    })

    const queryMs = Math.round(performance.now() - queryStartedAt)
    const totalMs = Math.round(performance.now() - startedAt)

    console.log(
      `[notifications] user=${user.id} auth=${authMs}ms query=${queryMs}ms total=${totalMs}ms rows=${notifications.rows.length}`
    )

    return NextResponse.json(rows)
  } catch (error) {
    console.error("NOTIFICATIONS GET ERROR", error)
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    // Super Administrator is strictly read-only.
    if (user.role === "super_administrator") {
      return NextResponse.json(
        {
          error:
            "Super Administrator notifications are read-only",
        },
        { status: 403 },
      )
    }

    const { id } = await req.json()

    if (!id) {
      return NextResponse.json(
        { error: "Missing notification id" },
        { status: 400 },
      )
    }

    const updated = await query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1
        AND user_id = $2
      RETURNING
        id,
        title,
        message,
        type,
        is_read AS read,
        created_at,
        case_id,
        metadata
      `,
      [id, user.id],
    )

    if (!updated.rows.length) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 },
      )
    }

    return NextResponse.json(updated.rows[0])
  } catch (error) {
    console.error(
      "NOTIFICATIONS PATCH ERROR",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to update notification",
      },
      { status: 500 },
    )
  }
}