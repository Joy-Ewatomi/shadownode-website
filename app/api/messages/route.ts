import {
  NextRequest,
  NextResponse,
} from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { query, withTransaction, type DatabasePoolClient } from "@/lib/db"
import { profileIdForUser } from "@/lib/investigation-workspace"
import {
  createMessageReceipts,
  markMessageReceiptReadForUser,
  markConversationReceiptsReadForUser,
  syncConversationParticipants,
} from "@/lib/services/message-receipts-service"
import {
  createCaseMessageNotifications,
  dispatchCaseMessageExternalNotifications,
} from "@/lib/services/message-notifications-service"
import { canCaseFunctionMessage } from "@/lib/role-access"

type CasePermission = {
  case_id: string
  client_user_id: string | null
  client_profile_id: string | null
  is_client: boolean
  is_assigned: boolean
  is_super_admin: boolean
  can_view: boolean
  can_reply: boolean
  assignment_role: string | null
}

type ConversationRow = {
  id: string
  case_id: string | null
  case_number: string | null
  case_title: string | null
  created_at: string
  last_message: string | null
  last_message_at: string | null
  unread_count: number
  messages: Array<{
    id: string
    sender_id: string
    sender_name: string | null
    sender_username: string | null
    sender_role: string | null
    message: string
    created_at: string
    read_at: string | null
  }>
}

function isSuperAdmin(
  role: string | null | undefined,
): boolean {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

/**
 * Determine what the current user may do with a case.
 *
 * Client:
 *   - own case only
 *   - may view/reply
 *
 * Assigned operator:
 *   - assigned active case only
 *   - may view/reply
 *
 * Administrator:
 *   - assigned active case only
 *   - may view/reply
 *
 * Super Administrator:
 *   - may view every case
 *   - may reply only when actively assigned
 *
 * Everything else:
 *   - active assignment required
 */
async function getCasePermission(
  userId: string,
  profileId: string,
  role: string,
  caseId: string,
): Promise<CasePermission | null> {
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

  const clientOwnsCase =
    row.client_user_id === userId ||
    row.client_profile_id === profileId

  const assigned = Boolean(row.is_assigned)
  const canMessage =
    assigned &&
    canCaseFunctionMessage(row.assignment_role)

  const superAdmin = isSuperAdmin(role)

  let canView = false
  let canReply = false

  if (role === "client") {
    canView = clientOwnsCase
    canReply = clientOwnsCase
  } else if (superAdmin) {
    canView = true
    canReply = canMessage
  } else if (role === "administrator") {
    canView = assigned
    canReply = canMessage
  } else {
    canView = assigned
    canReply = canMessage
  }

  return {
    case_id: row.case_id,
    client_user_id: row.client_user_id,
    client_profile_id: row.client_profile_id,
    is_client: role === "client",
    is_assigned: assigned,
    is_super_admin: superAdmin,
    can_view: canView,
    can_reply: canReply,
    assignment_role: row.assignment_role,
  }
}

async function getConversation(
  conversationId: string,
) {
  const result = await query<{
    id: string
    case_id: string | null
  }>(
    `
    SELECT
      id,
      case_id
    FROM conversations
    WHERE id = $1
    LIMIT 1
    `,
    [conversationId],
  )

  return result.rows[0] ?? null
}

/**
 * Find the existing case conversation.
 *
 * A case should have one primary secure conversation.
 */
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

  /**
   * Always ensure the sender belongs to
   * the conversation.
   */
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

  /**
   * Add the case client.
   */
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

  /**
   * Add ONLY active/approved case assignees.
   *
   * Pending, rejected and removed assignments
   * must not receive case messages.
   */
  await executor.query(
    `
    INSERT INTO conversation_members (
      conversation_id,
      user_id
    )
    SELECT DISTINCT
      $1,
      assigned_profile.user_id

    FROM case_assignments ca

    JOIN user_profiles assigned_profile
      ON assigned_profile.id =
        ca.assigned_to

    WHERE ca.case_id = $2
      AND ca.removed_at IS NULL
      AND ca.status IN ('assigned', 'approved')
      AND assigned_profile.user_id IS NOT NULL

    ON CONFLICT DO NOTHING
    `,
    [conversationId, caseId],
  )

  return conversationId
}

// ============================================================
// GET — GLOBAL MESSAGE CONVERSATIONS
// ============================================================

export async function GET() {
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

    const profileId = await profileIdForUser(user.id)

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

    const superAdmin = isSuperAdmin(user.role)

    const result = await query<ConversationRow>(
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
          FROM message_receipts mr
          JOIN messages unread_message
            ON unread_message.id = mr.message_id
          WHERE mr.conversation_id = c.id
            AND mr.user_id = $1
            AND mr.read_at IS NULL
            AND (
              unread_message.sender_id IS NULL
              OR unread_message.sender_id <> $2
            )
        ) AS unread_count,

        COALESCE(
          json_agg(
            json_build_object(
              'id',
              m.id,

              'sender_id',
              m.sender_id,

              'sender_name',
              COALESCE(
                sender_profile.full_name,
                sender_user.username,
                sender_user.email,
                'Operator'
              ),

              'sender_username',
              sender_user.username,

              'sender_role',
              sender_user.role,

              'message',
              m.message,

              'created_at',
              m.created_at,

              'read_at',
              mr.read_at
            )
            ORDER BY m.created_at ASC
          ) FILTER (
            WHERE m.id IS NOT NULL
          ),
          '[]'::json
        ) AS messages

      FROM conversations c

      LEFT JOIN cases
        ON cases.id = c.case_id

      LEFT JOIN messages m
        ON m.conversation_id = c.id

      LEFT JOIN message_receipts mr
        ON mr.message_id = m.id
        AND mr.user_id = $1

      LEFT JOIN user_profiles sender_profile
        ON sender_profile.id = m.sender_id

      LEFT JOIN app_users sender_user
        ON sender_user.id = sender_profile.user_id

      WHERE
        (
          /*
           * Explicit conversation membership.
           */
          EXISTS (
            SELECT 1
            FROM conversation_members cm
            WHERE cm.conversation_id = c.id
              AND cm.user_id = $1
          )
        )

        OR

        (
          /*
           * Active assignment to the case.
           */
          c.case_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM case_assignments ca
            WHERE ca.case_id = c.case_id
              AND ca.assigned_to = $2
              AND ca.removed_at IS NULL
              AND ca.status IN ('assigned', 'approved')
          )
        )

        OR

        (
          /*
           * Client's own case.
           */
          c.case_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM cases own_case
            LEFT JOIN user_profiles own_client
              ON own_client.id =
                own_case.client_profile_id
            WHERE own_case.id = c.case_id
              AND (
                own_client.user_id = $1
                OR own_case.client_profile_id = $2
              )
          )
        )

        OR

        (
          /*
           * Super Administrator oversight.
           */
          $3 = TRUE
        )

      GROUP BY
        c.id,
        cases.case_number,
        cases.title

      ORDER BY
        COALESCE(
          MAX(m.created_at),
          c.created_at
        ) DESC
      `,
      [
        user.id,
        profileId,
        superAdmin,
      ],
    )

    return NextResponse.json(
      result.rows,
      {
        status: 200,
      },
    )
  } catch (error) {
    console.error(
      "MESSAGES GET ERROR",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to load conversations",
      },
      {
        status: 500,
      },
    )
  }
}

// ============================================================
// POST — SEND MESSAGE
// ============================================================

export async function POST(
  req: NextRequest,
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

    const profileId = await profileIdForUser(user.id)

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

    const body = await req.json()

    const conversationId =
      typeof body?.conversation_id === "string"
        ? body.conversation_id
        : undefined

    const requestedCaseId =
      typeof body?.case_id === "string"
        ? body.case_id
        : undefined

    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : ""

    if (!message) {
      return NextResponse.json(
        {
          error: "Message is required",
        },
        {
          status: 400,
        },
      )
    }

    let resolvedConversationId =
      conversationId

    let caseId = requestedCaseId

    // ----------------------------------------------------------
    // Resolve conversation
    // ----------------------------------------------------------

    if (resolvedConversationId) {
      const conversation =
        await getConversation(
          resolvedConversationId,
        )

      if (!conversation) {
        return NextResponse.json(
          {
            error: "Conversation not found",
          },
          {
            status: 404,
          },
        )
      }

      if (
        conversation.case_id &&
        caseId &&
        conversation.case_id !== caseId
      ) {
        return NextResponse.json(
          {
            error:
              "Conversation does not belong to this case",
          },
          {
            status: 400,
          },
        )
      }

      caseId =
        conversation.case_id ??
        caseId
    }

    if (!caseId) {
      return NextResponse.json(
        {
          error: "Case is required",
        },
        {
          status: 400,
        },
      )
    }

    // ----------------------------------------------------------
    // Authorization
    // ----------------------------------------------------------

    const permission =
      await getCasePermission(
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

    // ----------------------------------------------------------
    // Find/create case conversation
    // ----------------------------------------------------------

    const messageResult = await withTransaction(async (client) => {
      if (!resolvedConversationId) {
        resolvedConversationId =
          await getOrCreateCaseConversation(
            caseId,
            user.id,
            client,
          )
      } else {
        await client.query(
          `
          INSERT INTO conversation_members (
            conversation_id,
            user_id
          )
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
          `,
          [
            resolvedConversationId,
            user.id,
          ],
        )

        await syncConversationParticipants(
          resolvedConversationId,
          caseId,
          client,
        )
      }

      const inserted = await client.query<{
      id: string
      conversation_id: string
      case_id: string
      sender_id: string
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
        encrypted_content,
        message
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $5
      )
      RETURNING
        id,
        conversation_id,
        case_id,
        sender_id,
        message,
        created_at,
        read_at
      `,
      [
        resolvedConversationId,
        caseId,
        profileId,
        user.role,
        message,
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

    const insertedMessage = messageResult.message

    await dispatchCaseMessageExternalNotifications(
      messageResult.notificationIds,
    )

    // ----------------------------------------------------------
    // Sender identity
    // ----------------------------------------------------------

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
        ...insertedMessage,

        sender_name:
          senderRow?.full_name ??
          senderRow?.username ??
          senderRow?.email ??
          "Operator",

        sender_username:
          senderRow?.username ??
          null,

        sender_role:
          senderRow?.role ??
          user.role,
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "MESSAGES POST ERROR",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to send message",
      },
      {
        status: 500,
      },
    )
  }
}

// ============================================================
// PATCH — MARK READ
// ============================================================

export async function PATCH(
  req: NextRequest,
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

    const profileId = await profileIdForUser(user.id)

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

    const body = await req.json()

    const conversationId =
      typeof body?.conversation_id === "string"
        ? body.conversation_id
        : null

    const messageId =
      typeof body?.message_id === "string"
        ? body.message_id
        : null

    if (!conversationId && !messageId) {
      return NextResponse.json(
        {
          error: "Missing target",
        },
        {
          status: 400,
        },
      )
    }

    let caseId: string | null = null

    // ----------------------------------------------------------
    // Resolve case from conversation
    // ----------------------------------------------------------

    if (conversationId) {
      const conversation =
        await getConversation(
          conversationId,
        )

      if (!conversation) {
        return NextResponse.json(
          {
            error: "Conversation not found",
          },
          {
            status: 404,
          },
        )
      }

      caseId = conversation.case_id
    }

    // ----------------------------------------------------------
    // Resolve case from message
    // ----------------------------------------------------------

    if (!caseId && messageId) {
      const message = await query<{
        case_id: string | null
      }>(
        `
        SELECT case_id
        FROM messages
        WHERE id = $1
        LIMIT 1
        `,
        [messageId],
      )

      caseId =
        message.rows[0]?.case_id ??
        null
    }

    if (!caseId) {
      return NextResponse.json(
        {
          error:
            "Message case could not be resolved",
        },
        {
          status: 400,
        },
      )
    }

    // ----------------------------------------------------------
    // View authorization
    // ----------------------------------------------------------

    const permission =
      await getCasePermission(
        user.id,
        profileId,
        user.role,
        caseId,
      )

    if (!permission?.can_view) {
      return NextResponse.json(
        {
          error:
            "You are not permitted to view this case",
        },
        {
          status: 403,
        },
      )
    }

    if (conversationId) {
      await markConversationReceiptsReadForUser({
        conversationId,
        userId: user.id,
        profileId,
      })
    } else if (messageId) {
      const message = await query<{
        conversation_id: string
      }>(
        `
        SELECT conversation_id
        FROM messages
        WHERE id = $1
        LIMIT 1
        `,
        [messageId],
      )

      const targetConversationId =
        message.rows[0]?.conversation_id

      if (targetConversationId) {
        await markMessageReceiptReadForUser({
          messageId,
          userId: user.id,
          profileId,
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
      },
      {
        status: 200,
      },
    )
  } catch (error) {
    console.error(
      "MESSAGES PATCH ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to mark messages read",
      },
      {
        status: 500,
      },
    )
  }
}
