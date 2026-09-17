import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { query, withTransaction, type DatabasePoolClient } from "@/lib/db"
import {
  optionalText,
  profileIdForUser,
} from "@/lib/investigation-workspace"
import {
  createMessageReceipts,
  syncConversationParticipants,
} from "@/lib/services/message-receipts-service"
import {
  createCaseMessageNotifications,
  dispatchCaseMessageExternalNotifications,
} from "@/lib/services/message-notifications-service"
import { canCaseFunctionMessage } from "@/lib/role-access"

function isSuperAdmin(
  role: string | null | undefined,
): boolean {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

type CaseMessagingPermission = {
  can_view: boolean
  can_reply: boolean
  is_assigned: boolean
  is_client: boolean
  is_super_admin: boolean
  assignment_role: string | null
}

async function getCaseMessagingPermission(
  userId: string,
  profileId: string,
  role: string,
  caseId: string,
): Promise<CaseMessagingPermission | null> {
  const result = await query<{
    case_id: string
    client_profile_id: string | null
    client_user_id: string | null
    is_assigned: boolean
    assignment_role: string | null
  }>(
    `
    SELECT
      c.id AS case_id,
      c.client_profile_id,
      client_profile.user_id AS client_user_id,

      EXISTS (
        SELECT 1
        FROM case_assignments ca
        WHERE ca.case_id = c.id
          AND ca.assigned_to = $2
          AND ca.removed_at IS NULL
          AND ca.status IN ('assigned', 'approved')
      ) AS is_assigned,

      (
        SELECT ca.assignment_role
        FROM case_assignments ca
        WHERE ca.case_id = c.id
          AND ca.assigned_to = $2
          AND ca.removed_at IS NULL
          AND ca.status IN ('assigned', 'approved')
        ORDER BY ca.assigned_at DESC
        LIMIT 1
      ) AS assignment_role

    FROM cases c

    LEFT JOIN user_profiles client_profile
      ON client_profile.id = c.client_profile_id

    WHERE c.id = $1

    LIMIT 1
    `,
    [caseId, profileId],
  )

  const row = result.rows[0]

  if (!row) {
    return null
  }

  const isClient =
    role === "client" &&
    (
      row.client_user_id === userId ||
      row.client_profile_id === profileId
    )

  const isAssigned = Boolean(row.is_assigned)
  const canMessage =
    isAssigned &&
    canCaseFunctionMessage(row.assignment_role)

  const isSuperAdmin = isSuperAdminRole(role)

  let canView = false
  let canReply = false

  if (role === "client") {
    canView = isClient
    canReply = isClient
  } else if (isSuperAdmin) {
    canView = true
    canReply = canMessage
  } else {
    canView = isAssigned
    canReply = canMessage
  }

  return {
    can_view: canView,
    can_reply: canReply,
    is_assigned: isAssigned,
    is_client: isClient,
    is_super_admin: isSuperAdmin,
    assignment_role: row.assignment_role,
  }
}

function isSuperAdminRole(
  role: string | null | undefined,
): boolean {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

async function getOrCreateCaseConversation(
  caseId: string,
  senderUserId: string,
  executor: Pick<DatabasePoolClient, "query"> = { query },
) {
  const existing = await executor.query<{
    id: string
  }>(
    `
    SELECT id
    FROM conversations
    WHERE case_id = $1
    ORDER BY created_at ASC
    LIMIT 1
    `,
    [caseId],
  )

  let conversationId = existing.rows[0]?.id

  if (!conversationId) {
    const created = await executor.query<{
      id: string
    }>(
      `
      INSERT INTO conversations (
        case_id
      )
      VALUES ($1)
      ON CONFLICT (case_id)
      WHERE case_id IS NOT NULL
      DO UPDATE SET case_id = EXCLUDED.case_id
      RETURNING id
      `,
      [caseId],
    )

    conversationId = created.rows[0].id
  }

  // Sender
  await executor.query(
    `
    INSERT INTO conversation_members (
      conversation_id,
      user_id
    )
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    `,
    [conversationId, senderUserId],
  )

  // Client
  await executor.query(
    `
    INSERT INTO conversation_members (
      conversation_id,
      user_id
    )
    SELECT
      $1,
      up.user_id

    FROM cases c

    JOIN user_profiles up
      ON up.id = c.client_profile_id

    WHERE c.id = $2
      AND up.user_id IS NOT NULL

    ON CONFLICT DO NOTHING
    `,
    [conversationId, caseId],
  )

  // Active/approved assignees only
  await executor.query(
    `
    INSERT INTO conversation_members (
      conversation_id,
      user_id
    )
    SELECT DISTINCT
      $1,
      up.user_id

    FROM case_assignments ca

    JOIN user_profiles up
      ON up.id = ca.assigned_to

    WHERE ca.case_id = $2
      AND ca.removed_at IS NULL
      AND ca.status IN ('assigned', 'approved')
      AND up.user_id IS NOT NULL

    ON CONFLICT DO NOTHING
    `,
    [conversationId, caseId],
  )

  return conversationId
}

// ============================================================
// GET
// ============================================================

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  try {
    const { id: caseId } = await params

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

    const profileId =
      await profileIdForUser(user.id)

    if (!profileId) {
      return NextResponse.json(
        {
          error: "User profile missing",
        },
        {
          status: 500,
        },
      )
    }

    const permission =
      await getCaseMessagingPermission(
        user.id,
        profileId,
        user.role,
        caseId,
      )

    if (!permission) {
      return NextResponse.json(
        {
          error: "Case not found",
        },
        {
          status: 404,
        },
      )
    }

    if (!permission.can_view) {
      return NextResponse.json(
        {
          error:
            "You are not permitted to view this case conversation",
        },
        {
          status: 403,
        },
      )
    }

    const conversation = await query<{
      id: string
    }>(
      `
      SELECT id
      FROM conversations
      WHERE case_id = $1
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [caseId],
    )

    const conversationId =
      conversation.rows[0]?.id ?? null

    const result = await query(
      `
      SELECT
        m.id,
        m.case_id,
        m.sender_id,
        m.sender_type,
        m.message,
        m.created_at,
        mr.read_at,

        up.full_name AS sender_name,
        au.username AS username,
        au.email AS sender_email,
        au.role AS sender_role

      FROM messages m

      LEFT JOIN user_profiles up
        ON up.id = m.sender_id

      LEFT JOIN app_users au
        ON au.id = up.user_id

      LEFT JOIN message_receipts mr
        ON mr.message_id = m.id
        AND mr.user_id = $2

      WHERE m.case_id = $1

      ORDER BY m.created_at ASC
      `,
      [
        caseId,
        user.id,
      ],
    )

    return NextResponse.json(
      {
        messages: result.rows,
        permissions: permission,
        conversation_id: conversationId,
      },
      {
        status: 200,
      },
    )
  } catch (error) {
    console.error(
      "CASE MESSAGES GET ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed loading case messages",
      },
      {
        status: 500,
      },
    )
  }
}

// ============================================================
// POST
// ============================================================

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  try {
    const { id: caseId } = await params

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

    const profileId =
      await profileIdForUser(user.id)

    if (!profileId) {
      return NextResponse.json(
        {
          error: "User profile missing",
        },
        {
          status: 500,
        },
      )
    }

    const permission =
      await getCaseMessagingPermission(
        user.id,
        profileId,
        user.role,
        caseId,
      )

    if (!permission) {
      return NextResponse.json(
        {
          error: "Case not found",
        },
        {
          status: 404,
        },
      )
    }

    if (!permission.can_reply) {
      return NextResponse.json(
        {
          error:
            "You are not permitted to reply in this case",
        },
        {
          status: 403,
        },
      )
    }

    const body = await request.json()

    const content =
      optionalText(body?.message)

    if (!content) {
      return NextResponse.json(
        {
          error: "Message required",
        },
        {
          status: 400,
        },
      )
    }

    const transactionResult = await withTransaction(async (client) => {
      const conversationId =
        await getOrCreateCaseConversation(
          caseId,
          user.id,
          client,
        )

      await syncConversationParticipants(
        conversationId,
        caseId,
        client,
      )

      const inserted = await client.query<{
      id: string
      conversation_id: string
      case_id: string
      sender_id: string
      sender_type: string | null
      message: string
      created_at: string
      read_at: string | null
    }>(
      `
      INSERT INTO messages (
        conversation_id,
        case_id,
        sender_id,
        sender_type,
        message,
        encrypted_content,
        created_at
      )

      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $5,
        NOW()
      )

      RETURNING
        id,
        conversation_id,
        case_id,
        sender_id,
        sender_type,
        message,
        created_at,
        read_at
      `,
      [
        conversationId,
        caseId,
        profileId,
        user.role,
        content,
      ],
      )

      const row = inserted.rows[0]

      await createMessageReceipts(
        {
          messageId: row.id,
          conversationId: row.conversation_id,
          caseId,
          senderProfileId: profileId,
        },
        client,
      )

      const notificationIds =
        await createCaseMessageNotifications(
        {
          messageId: row.id,
          conversationId: row.conversation_id,
          caseId,
          senderUserId: user.id,
          senderRole: user.role,
        },
        client,
      )

      return {
        message: row,
        notificationIds,
      }
    })

    const result = transactionResult.message

    await dispatchCaseMessageExternalNotifications(
      transactionResult.notificationIds,
    )

    const sender = await query<{
      full_name: string | null
      username: string | null
      email: string | null
      role: string | null
    }>(
      `
      SELECT
        up.full_name,
        au.username,
        au.email,
        au.role

      FROM user_profiles up

      LEFT JOIN app_users au
        ON au.id = up.user_id

      WHERE up.id = $1

      LIMIT 1
      `,
      [profileId],
    )

    const senderRow =
      sender.rows[0]

    return NextResponse.json(
      {
        success: true,

        message: {
          ...result,

          sender_name:
            senderRow?.full_name ??
            senderRow?.username ??
            senderRow?.email ??
            "Operator",

          username:
            senderRow?.username ??
            null,

          sender_email:
            senderRow?.email ??
            null,

          sender_role:
            senderRow?.role ??
            user.role,
        },

        permissions: permission,
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "CASE MESSAGE POST ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed sending message",
      },
      {
        status: 500,
      },
    )
  }
}
