import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const updated = await query(
    `
    UPDATE notifications
    SET is_read = true
    WHERE id = $1
      AND (user_id = $2 OR $3 = 'super_administrator')
    RETURNING id
    `,
    [id, user.id, user.role],
  )

  if (!updated.rows.length) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}