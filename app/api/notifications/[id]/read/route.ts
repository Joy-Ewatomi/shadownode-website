import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(
  _req: Request,
  { params }: RouteContext,
) {
  try {
    const user = await getCurrentUser()

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

    const { id } = await params

    if (!id?.trim()) {
      return NextResponse.json(
        {
          error: "Notification ID is required",
        },
        {
          status: 400,
        },
      )
    }

    const result = await query<{
      id: string
      read: boolean
    }>(
      `
        UPDATE notifications
        SET is_read = true
        WHERE id = $1
          AND user_id = $2
        RETURNING
          id,
          is_read AS read
      `,
      [
        id,
        user.id,
      ],
    )

    if (!result.rows[0]) {
      return NextResponse.json(
        {
          error: "Notification not found",
        },
        {
          status: 404,
        },
      )
    }

    return NextResponse.json({
      success: true,
      id: result.rows[0].id,
      read: result.rows[0].read,
    })
  } catch (error) {
    console.error(
      "NOTIFICATION READ ROUTE ERROR",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to mark notification as read",
      },
      {
        status: 500,
      },
    )
  }
}