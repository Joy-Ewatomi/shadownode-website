import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

export async function PATCH(
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
     * Super Administrator notifications are read-only.
     *
     * The Super Administrator sees the complete bureau stream,
     * but does not mutate read state.
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

    const updated = await query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1
        AND user_id = $2
      RETURNING id
      `,
      [id, user.id],
    )

    if (!updated.rows.length) {
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
      "NOTIFICATION READ ERROR",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to mark notification as read",
      },
      { status: 500 },
    )
  }
}