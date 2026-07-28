import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notifications = await query(
      `
      SELECT
        id,
        title,
        message,
        type,
        read_at IS NOT NULL AS read,
        created_at,
        case_id
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 25
      `,
      [user.id],
    )

    return NextResponse.json(notifications.rows)
  } catch (error) {
    console.error("NOTIFICATIONS GET ERROR", error)
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: "Missing notification id" }, { status: 400 })
    }

    const updated = await query(
      `
      UPDATE notifications
      SET read_at = COALESCE(read_at, NOW())
      WHERE id = $1
        AND user_id = $2
      RETURNING
        id,
        title,
        message,
        type,
        read_at IS NOT NULL AS read,
        created_at,
        case_id
      `,
      [id, user.id],
    )

    if (!updated.rows.length) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    return NextResponse.json(updated.rows[0])
  } catch (error) {
    console.error("NOTIFICATIONS PATCH ERROR", error)
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 })
  }
}
