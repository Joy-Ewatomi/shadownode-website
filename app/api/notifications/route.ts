import {
  NextRequest,
  NextResponse,
} from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

function parseMetadata(
  value: unknown,
): Record<string, unknown> | null {
  if (
    typeof value === "string"
  ) {
    try {
      const parsed =
        JSON.parse(value)

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<
          string,
          unknown
        >
      }
    } catch {
      return null
    }

    return null
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<
      string,
      unknown
    >
  }

  return null
}

function getCacheHeaders() {
  return {
    "Cache-Control":
      "private, no-store, max-age=0",
  }
}

export async function GET(
  req: NextRequest,
) {
  const startedAt =
    performance.now()

  try {
    const user =
      await getCurrentUser()

    const authMs = Math.round(
      performance.now() -
        startedAt,
    )

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
          headers:
            getCacheHeaders(),
        },
      )
    }

    const scope =
      req.nextUrl.searchParams.get(
        "scope",
      )

    const queryStartedAt =
      performance.now()

    /*
     * Bell scope:
     *
     * The bell only needs the current
     * user's notification stream.
     *
     * This is intentionally independent
     * of administrator/super-administrator
     * dashboard-wide notification views.
     */
    if (scope === "bell") {
      const result =
        await query(
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
          WHERE n.user_id = $1
          ORDER BY n.created_at DESC
          LIMIT 50
          `,
          [user.id],
        )

      const queryMs =
        Math.round(
          performance.now() -
            queryStartedAt,
        )

      const rows =
        result.rows.map(
          (
            row: Record<
              string,
              unknown
            >,
          ) => ({
            ...row,
            metadata:
              parseMetadata(
                row.metadata,
              ),
          }),
        )

      const totalMs =
        Math.round(
          performance.now() -
            startedAt,
        )

      if (totalMs > 1000) {
        console.warn(
          `[notifications] slow bell user=${user.id} role=${user.role} auth=${authMs}ms query=${queryMs}ms total=${totalMs}ms rows=${rows.length}`,
        )
      }

      return NextResponse.json(
        {
          notifications: rows,
          user: {
            id: user.id,
            role: user.role,
          },
        },
        {
          headers:
            getCacheHeaders(),
        },
      )
    }

    /*
     * Existing dashboard behavior.
     *
     * Super administrators can see the
     * bureau-wide notification stream.
     * Other users see only their own.
     */
    const isSuperAdministrator =
      user.role ===
        "super_administrator" ||
      user.role ===
        "super-administrator"

    const result =
      isSuperAdministrator
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
            LIMIT 100
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
            LIMIT 50
            `,
            [user.id],
          )

    const queryMs =
      Math.round(
        performance.now() -
          queryStartedAt,
      )

    const rows =
      result.rows.map(
        (
          row: Record<
            string,
            unknown
          >,
        ) => ({
          ...row,
          metadata:
            parseMetadata(
              row.metadata,
            ),
        }),
      )

    const totalMs =
      Math.round(
        performance.now() -
          startedAt,
      )

    if (totalMs > 1000) {
      console.warn(
        `[notifications] slow user=${user.id} role=${user.role} auth=${authMs}ms query=${queryMs}ms total=${totalMs}ms rows=${rows.length}`,
      )
    }

    return NextResponse.json(
      rows,
      {
        headers:
          getCacheHeaders(),
      },
    )
  } catch (error) {
    const totalMs =
      Math.round(
        performance.now() -
          startedAt,
      )

    console.error(
      `[notifications] GET failed after ${totalMs}ms`,
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to load notifications",
      },
      {
        status: 500,
        headers:
          getCacheHeaders(),
      },
    )
  }
}

export async function PATCH(
  req: NextRequest,
) {
  try {
    const user =
      await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
          headers:
            getCacheHeaders(),
        },
      )
    }

    let body: unknown

    try {
      body =
        await req.json()
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid JSON body",
        },
        {
          status: 400,
          headers:
            getCacheHeaders(),
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
        {
          error:
            "Missing notification id",
        },
        {
          status: 400,
          headers:
            getCacheHeaders(),
        },
      )
    }

    const updated =
      await query(
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
          metadata,
          user_id AS recipient_id
        `,
        [
          id,
          user.id,
        ],
      )

    if (!updated.rows.length) {
      return NextResponse.json(
        {
          error:
            "Notification not found",
        },
        {
          status: 404,
          headers:
            getCacheHeaders(),
        },
      )
    }

    const row =
      updated.rows[0] as Record<
        string,
        unknown
      >

    return NextResponse.json(
      {
        ...row,
        metadata:
          parseMetadata(
            row.metadata,
          ),
      },
      {
        headers:
          getCacheHeaders(),
      },
    )
  } catch (error) {
    console.error(
      "NOTIFICATIONS PATCH ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to update notification",
      },
      {
        status: 500,
        headers:
          getCacheHeaders(),
      },
    )
  }
}
