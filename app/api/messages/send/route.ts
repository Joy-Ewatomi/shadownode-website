import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query, withTransaction } from "@/lib/db"
import { profileIdForUser } from "@/lib/investigation-workspace"
import {
  createMessageReceipts,
  syncConversationParticipants,
} from "@/lib/services/message-receipts-service"
import { createCaseMessageNotifications } from "@/lib/services/message-notifications-service"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const profileId = await profileIdForUser(user.id)
    if (!profileId) return NextResponse.json({ error: "User profile not found" }, { status: 400 })

    const body = await request.json()
    const message = String(body.message || body.content || "").trim()
    const caseId = body.case_id ? String(body.case_id) : null
    let conversationId = body.conversation_id ? String(body.conversation_id) : null

    if (!message || (!caseId && !conversationId)) {
      return NextResponse.json({ error: "Message and conversation or case required" }, { status: 400 })
    }

    let messageCaseId = caseId

    if (conversationId) {
      const allowed = await query<{ case_id: string | null }>(
        `
        SELECT c.case_id
        FROM conversations c
        JOIN conversation_members cm ON cm.conversation_id = c.id
        WHERE c.id = $1 AND cm.user_id = $2
        LIMIT 1
        `,
        [conversationId, user.id],
      )

      const conversation = allowed.rows[0]
      if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
      messageCaseId = messageCaseId || conversation.case_id
    } else {
      const created = await query<{ id: string }>(
        `
        INSERT INTO conversations (case_id)
        VALUES ($1)
        ON CONFLICT (case_id)
        WHERE case_id IS NOT NULL
        DO UPDATE SET case_id = EXCLUDED.case_id
        RETURNING id
        `,
        [messageCaseId],
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

    if (!messageCaseId) {
      return NextResponse.json({ error: "Conversation is not attached to a case" }, { status: 400 })
    }

    const inserted = await withTransaction(async (client) => {
      await syncConversationParticipants(
        conversationId,
        messageCaseId,
        client,
      )

      const result = await client.query<{
        id: string
        conversation_id: string
        case_id: string
        sender_id: string
        message: string
        created_at: string
        read_at: string | null
      }>(
        `
        INSERT INTO messages (conversation_id, case_id, sender_id, sender_type, encrypted_content, message)
        VALUES ($1, $2, $3, $4, $5, $5)
        RETURNING id, conversation_id, case_id, sender_id, message, created_at, read_at
        `,
        [conversationId, messageCaseId, profileId, user.role, message],
      )

      const row = result.rows[0]

      await createMessageReceipts(
        {
          messageId: row.id,
          conversationId: row.conversation_id,
          caseId: row.case_id,
          senderProfileId: profileId,
        },
        client,
      )

      await createCaseMessageNotifications(
        {
          messageId: row.id,
          conversationId: row.conversation_id,
          caseId: row.case_id,
          senderUserId: user.id,
          senderRole: user.role,
        },
        client,
      )

      return result
    })

    return NextResponse.json(inserted.rows[0], { status: 201 })
  } catch (error) {
    console.error("MESSAGE SEND ERROR", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
