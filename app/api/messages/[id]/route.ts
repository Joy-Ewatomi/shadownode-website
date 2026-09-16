import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { profileIdForUser } from "@/lib/investigation-workspace"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const result = await query(
      `
      SELECT
        m.id,
        m.conversation_id,
        m.case_id,
        m.sender_id,
        sender.username AS sender_name,
        m.sender_type,
        m.message,
        m.created_at,
        mr.read_at
      FROM messages m
      JOIN conversation_members cm
        ON cm.conversation_id = m.conversation_id
        AND cm.user_id = $2
      LEFT JOIN message_receipts mr
        ON mr.message_id = m.id
        AND mr.user_id = $2
      LEFT JOIN user_profiles sender_profile
        ON sender_profile.id = m.sender_id
      LEFT JOIN app_users sender
        ON sender.id = sender_profile.user_id
      WHERE m.id = $1
      LIMIT 1
      `,
      [id, user.id],
    )

    if (!result.rows[0]) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error("MESSAGE GET ERROR", error)
    return NextResponse.json({ error: "Failed to load message" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const profileId = await profileIdForUser(user.id)
    if (!profileId) return NextResponse.json({ error: "User profile not found" }, { status: 400 })

    const { id } = await params

    const deleted = await query(
      `
      DELETE FROM messages m
      WHERE m.id = $1
        AND m.sender_id = $2
        AND EXISTS (
          SELECT 1
          FROM conversation_members cm
          WHERE cm.conversation_id = m.conversation_id
            AND cm.user_id = $3
        )
      RETURNING id
      `,
      [id, profileId, user.id],
    )

    if (!deleted.rows[0]) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("MESSAGE DELETE ERROR", error)
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 })
  }
}
