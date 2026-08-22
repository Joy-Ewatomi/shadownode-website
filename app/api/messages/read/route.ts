import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { profileIdForUser } from "@/lib/investigation-workspace"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const profileId = await profileIdForUser(user.id)
    const body = await request.json()
    const conversationId = body.conversation_id ? String(body.conversation_id) : null
    const messageId = body.message_id ? String(body.message_id) : null

    if (!conversationId && !messageId) {
      return NextResponse.json({ error: "Missing target" }, { status: 400 })
    }

    if (conversationId) {
      const allowed = await query(
        `
        SELECT 1
        FROM conversation_members
        WHERE conversation_id = $1 AND user_id = $2
        LIMIT 1
        `,
        [conversationId, user.id],
      )

      if (!allowed.rows.length) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
      }
    }

    await query(
      `
      UPDATE messages
      SET read_at = COALESCE(read_at, NOW())
      WHERE ($1::uuid IS NULL OR sender_id <> $1::uuid)
        AND ($2::uuid IS NULL OR conversation_id = $2::uuid)
        AND ($3::uuid IS NULL OR id = $3::uuid)
      `,
      [profileId, conversationId, messageId],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("MESSAGE READ ERROR", error)
    return NextResponse.json({ error: "Failed to mark messages read" }, { status: 500 })
  }
}

export const PATCH = POST
