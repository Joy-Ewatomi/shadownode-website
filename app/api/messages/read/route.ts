import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { profileIdForUser } from "@/lib/investigation-workspace"
import {
  markConversationReceiptsReadForUser,
  markMessageReceiptReadForUser,
} from "@/lib/services/message-receipts-service"

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
        SELECT c.id, c.case_id
        FROM conversations c
        LEFT JOIN conversation_members cm
          ON cm.conversation_id = c.id
          AND cm.user_id = $2
        WHERE c.id = $1
          AND (
            cm.user_id IS NOT NULL
            OR EXISTS (
              SELECT 1
              FROM case_assignments ca
              WHERE ca.case_id = c.case_id
                AND ca.assigned_to = $3
                AND ca.removed_at IS NULL
                AND COALESCE(ca.status, 'assigned') IN ('assigned', 'approved')
            )
            OR EXISTS (
              SELECT 1
              FROM cases own_case
              LEFT JOIN user_profiles client_profile
                ON client_profile.id = own_case.client_profile_id
              WHERE own_case.id = c.case_id
                AND (
                  client_profile.user_id = $2
                  OR own_case.client_profile_id = $3
                )
            )
            OR $4 IN ('super_administrator', 'super-administrator')
          )
        LIMIT 1
        `,
        [
          conversationId,
          user.id,
          profileId,
          user.role,
        ],
      )

      if (!allowed.rows.length) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
      }
    }

    if (messageId && !conversationId) {
      const allowed = await query(
        `
        SELECT m.id
        FROM messages m
        JOIN conversations c
          ON c.id = m.conversation_id
        LEFT JOIN conversation_members cm
          ON cm.conversation_id = c.id
          AND cm.user_id = $2
        WHERE m.id = $1
          AND (
            cm.user_id IS NOT NULL
            OR EXISTS (
              SELECT 1
              FROM case_assignments ca
              WHERE ca.case_id = c.case_id
                AND ca.assigned_to = $3
                AND ca.removed_at IS NULL
                AND COALESCE(ca.status, 'assigned') IN ('assigned', 'approved')
            )
            OR EXISTS (
              SELECT 1
              FROM cases own_case
              LEFT JOIN user_profiles client_profile
                ON client_profile.id = own_case.client_profile_id
              WHERE own_case.id = c.case_id
                AND (
                  client_profile.user_id = $2
                  OR own_case.client_profile_id = $3
                )
            )
            OR $4 IN ('super_administrator', 'super-administrator')
          )
        LIMIT 1
        `,
        [
          messageId,
          user.id,
          profileId,
          user.role,
        ],
      )

      if (!allowed.rows.length) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 })
      }
    }

    if (conversationId) {
      await markConversationReceiptsReadForUser({
        conversationId,
        userId: user.id,
        profileId,
      })
    }

    if (messageId) {
      await markMessageReceiptReadForUser({
        messageId,
        userId: user.id,
        profileId,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("MESSAGE READ ERROR", error)
    return NextResponse.json({ error: "Failed to mark messages read" }, { status: 500 })
  }
}

export const PATCH = POST
