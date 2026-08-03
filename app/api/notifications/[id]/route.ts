import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const result = await query(
      `
      SELECT
        id,
        title,
        message,
        type,
        is_read AS read,
        created_at,
        case_id,
        metadata
      FROM notifications
      WHERE id = $1 AND user_id = $2
      LIMIT 1
      `,
      [id, user.id],
    )

    if (!result.rows[0]) return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error("NOTIFICATION DETAIL ERROR", error)
    return NextResponse.json({ error: "Failed to load notification" }, { status: 500 })
  }
}
