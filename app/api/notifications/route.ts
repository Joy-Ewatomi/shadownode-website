import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET() {
  const startedAt = performance.now()

  try {
    const authStartedAt = performance.now()
    const user = await getCurrentUser()
    const authMs = Math.round(performance.now() - authStartedAt)

    if (!user) {
      if (authMs > 1000) {
        console.warn(
          `[notifications] slow auth=${authMs}ms unauthorized`,
        )
      }

      return NextResponse.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      )
    }

    const isSuperAdministrator =
      user.role === "super_administrator" ||
      user.role === "super-administrator"

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
          LEFT JOIN app_users u
            ON u.id = n.user_id
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
            n.user_id AS recipient_id
          FROM notifications n
          WHERE n.user_id = $1
          ORDER BY n.created_at DESC
          `,
          [user.id],
        )

    const queryMs = Math.round(
      performance.now() - queryStartedAt,
    )

    const rows = notifications.rows.map(
      (row: Record<string, unknown>) => {
        const metadata = row.metadata

        let parsedMetadata:
          | Record<string, unknown>
          | null = null

        if (typeof metadata === "string") {
          try {
            const parsed = JSON.parse(metadata)

            if (
              parsed &&
              typeof parsed === "object" &&
              !Array.isArray(parsed)
            ) {
              parsedMetadata =
                parsed as Record<string, unknown>
            }
          } catch {
            parsedMetadata = null
          }
        } else if (
          metadata &&
          typeof metadata === "object" &&
          !Array.isArray(metadata)
        ) {
          parsedMetadata =
            metadata as Record<string, unknown>
        }

        return {
          ...row,
          metadata: parsedMetadata,
        }
      },
    )

    const totalMs = Math.round(
      performance.now() - startedAt,
    )

    if (totalMs > 1000) {
      console.warn(
        `[notifications] slow user=${user.id} role=${user.role} auth=${authMs}ms query=${queryMs}ms total=${totalMs}ms rows=${rows.length}`,
      )
    }

    return NextResponse.json(rows, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    const totalMs = Math.round(
      performance.now() - startedAt,
    )

    console.error(
      `[notifications] GET failed after ${totalMs}ms`,
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to load notifications",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      )
    }

    let body: unknown

    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      )
    }

    const id =
      body &&
      typeof body === "object" &&
      "id" in body &&
      typeof body.id === "string"
        ? body.id.trim()
        : ""

    if (!id) {
      return NextResponse.json(
        { error: "Missing notification id" },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
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
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      )
    }

    const row = updated.rows[0] as Record<
      string,
      unknown
    >

    let metadata: Record<string, unknown> | null = null

    if (typeof row.metadata === "string") {
      try {
        const parsed = JSON.parse(row.metadata)

        if (
          parsed &&
          typeof parsed === "object" &&
          !Array.isArray(parsed)
        ) {
          metadata =
            parsed as Record<string, unknown>
        }
      } catch {
        metadata = null
      }
    } else if (
      row.metadata &&
      typeof row.metadata === "object" &&
      !Array.isArray(row.metadata)
    ) {
      metadata =
        row.metadata as Record<string, unknown>
    }

    return NextResponse.json(
      {
        ...row,
        metadata,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  } catch (error) {
    console.error(
      "NOTIFICATIONS PATCH ERROR",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to update notification",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  }
}