import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

async function userConversation(userId: string, conversationId: string) {
  const result = await query(
    `
    SELECT c.id, c.case_id
    FROM conversations c
    JOIN conversation_members cm ON cm.conversation_id = c.id
    WHERE c.id = $1 AND cm.user_id = $2
    LIMIT 1
    `,
    [conversationId, userId],
  )
  return result.rows[0] || null
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const conversations = await query(
      `
      SELECT
        c.id,
        c.case_id,
        cases.case_number,
        cases.title AS case_title,
        c.created_at,
        (
          SELECT m.message
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message,
        (
          SELECT m.created_at
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message_at,
        (
          SELECT COUNT(*)::int
          FROM messages m
          WHERE m.conversation_id = c.id
            AND m.sender_id <> $1
            AND m.read_at IS NULL
        ) AS unread_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'sender_id', m.sender_id,
              'sender_name', u.username,
              'message', m.message,
              'created_at', m.created_at,
              'read_at', m.read_at
            )
            ORDER BY m.created_at ASC
          ) FILTER (WHERE m.id IS NOT NULL),
          '[]'::json
        ) AS messages
      FROM conversations c
      JOIN conversation_members cm ON cm.conversation_id = c.id
      LEFT JOIN cases ON cases.id = c.case_id
      LEFT JOIN messages m ON m.conversation_id = c.id
      LEFT JOIN app_users u ON u.id = m.sender_id
      WHERE cm.user_id = $1
      GROUP BY c.id, cases.case_number, cases.title
      ORDER BY COALESCE(MAX(m.created_at), c.created_at) DESC
      `,
      [user.id],
    )

    return NextResponse.json(conversations.rows)
  } catch (error) {
    console.error("MESSAGES GET ERROR", error)
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { conversation_id, case_id, message } = await req.json()
    if (!message || (!conversation_id && !case_id)) {
      return NextResponse.json({ error: "Message and conversation or case required" }, { status: 400 })
    }

    let conversationId = conversation_id as string | undefined

    if (conversationId) {
      const allowed = await userConversation(user.id, conversationId)
      if (!allowed) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    } else {
      const created = await query<{ id: string }>(
        `
        INSERT INTO conversations (case_id)
        VALUES ($1)
        RETURNING id
        `,
        [case_id],
      )
      conversationId = created.rows[0].id

      await query(
        `
        INSERT INTO conversation_members (conversation_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        `,
        [conversationId, user.id],
      )
    }

    const inserted = await query(
      `
      INSERT INTO messages (conversation_id, case_id, sender_id, sender_type, encrypted_content, message)
      VALUES ($1, $2, $3, $4, $5, $5)
      RETURNING id, conversation_id, sender_id, message, created_at, read_at
      `,
      [conversationId, case_id || null, user.id, user.role, message],
    )

    return NextResponse.json(inserted.rows[0], { status: 201 })
  } catch (error) {
    console.error("MESSAGES POST ERROR", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { conversation_id, message_id } = await req.json()
    if (!conversation_id && !message_id) return NextResponse.json({ error: "Missing target" }, { status: 400 })

    if (conversation_id) {
      const allowed = await userConversation(user.id, conversation_id)
      if (!allowed) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    await query(
      `
      UPDATE messages
      SET read_at = COALESCE(read_at, NOW())
      WHERE sender_id <> $1
        AND ($2::uuid IS NULL OR conversation_id = $2::uuid)
        AND ($3::uuid IS NULL OR id = $3::uuid)
      `,
      [user.id, conversation_id || null, message_id || null],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("MESSAGES PATCH ERROR", error)
    return NextResponse.json({ error: "Failed to mark messages read" }, { status: 500 })
  }
}
