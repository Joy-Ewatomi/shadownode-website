import {
  NextRequest,
  NextResponse,
} from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { profileIdForUser } from "@/lib/investigation-workspace"

type CasePermission = {
  case_id: string
  client_user_id: string | null
  client_profile_id: string | null
  assigned_to: string | null
  is_client: boolean
  is_assigned: boolean
  is_super_admin: boolean
  can_view: boolean
  can_reply: boolean
}

function isSuperAdmin(
  role: string | null | undefined,
) {
  return (
    role ===
      "super_administrator" ||
    role ===
      "super-administrator"
  )
}

async function getCasePermission(
  userId: string,
  profileId: string,
  role: string,
  caseId: string,
): Promise<CasePermission | null> {
  const result =
    await query<{
      case_id: string
      client_profile_id:
        | string
        | null
      client_user_id:
        | string
        | null
      assigned_to:
        | string
        | null
      is_assigned: boolean
    }>(
      `
      SELECT
        c.id AS case_id,
        c.client_profile_id,
        client_profile.user_id AS client_user_id,
        c.assigned_to,

        (
          c.assigned_to = $2

          OR EXISTS (
            SELECT 1
            FROM case_assignments ca
            WHERE ca.case_id = c.id
              AND ca.assigned_to_profile_id = $2
          )
        ) AS is_assigned

      FROM cases c

      LEFT JOIN user_profiles client_profile
        ON client_profile.id =
          c.client_profile_id

      WHERE c.id = $1

      LIMIT 1
      `,
      [
        caseId,
        profileId,
      ],
    )

  const row =
    result.rows[0]

  if (!row) {
    return null
  }

  const clientOwnsCase =
    row.client_user_id === userId ||
    row.client_profile_id ===
      profileId

  const assigned =
    Boolean(
      row.is_assigned,
    )

  const superAdmin =
    isSuperAdmin(role)

  /*
   * CLIENT:
   * Can view and reply to their own case.
   *
   * ASSIGNED OPERATOR:
   * Can view and reply.
   *
   * SUPER ADMIN:
   * Can view every case.
   * Can reply ONLY when assigned to the case.
   *
   * ADMINISTRATOR:
   * Can view assigned case.
   * Reply requires assignment.
   *
   * Other staff:
   * Require assignment.
   */

  let canView =
    false

  let canReply =
    false

  if (
    role === "client"
  ) {
    canView =
      clientOwnsCase

    canReply =
      clientOwnsCase
  } else if (
    superAdmin
  ) {
    canView =
      true

    canReply =
      assigned
  } else if (
    role === "administrator"
  ) {
    canView =
      assigned

    canReply =
      assigned
  } else {
    canView =
      assigned

    canReply =
      assigned
  }

  return {
    case_id:
      row.case_id,

    client_user_id:
      row.client_user_id,

    client_profile_id:
      row.client_profile_id,

    assigned_to:
      row.assigned_to,

    is_client:
      role === "client",

    is_assigned:
      assigned,

    is_super_admin:
      superAdmin,

    can_view:
      canView,

    can_reply:
      canReply,
  }
}

async function getConversation(
  conversationId: string,
) {
  const result =
    await query<{
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

  return (
    result.rows[0] ??
    null
  )
}

async function getOrCreateCaseConversation(
  caseId: string,
  senderUserId: string,
) {
  const existing =
    await query<{
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

  let conversationId =
    existing.rows[0]?.id

  if (!conversationId) {
    const created =
      await query<{
        id: string
      }>(
        `
        INSERT INTO conversations (
          case_id
        )
        VALUES ($1)
        RETURNING id
        `,
        [caseId],
      )

    conversationId =
      created.rows[0].id
  }

  /*
   * Always ensure the sender is a
   * conversation member.
   */
  await query(
    `
    INSERT INTO conversation_members (
      conversation_id,
      user_id
    )
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    `,
    [
      conversationId,
      senderUserId,
    ],
  )

  /*
   * Add the client to the conversation.
   */
  await query(
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
    [
      conversationId,
      caseId,
    ],
  )

  /*
   * Add all assigned operators.
   *
   * This allows assigned investigators/
   * analysts to receive the conversation
   * in their messaging view.
   */
  await query(
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
        ca.assigned_to_profile_id

    WHERE ca.case_id = $2
      AND assigned_profile.user_id IS NOT NULL

    ON CONFLICT DO NOTHING
    `,
    [
      conversationId,
      caseId,
    ],
  )

  return conversationId
}

// ============================================================
// GET CONVERSATIONS
// ============================================================

export async function GET() {
  try {
    const user =
      await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        },
      )
    }

    const profileId =
      await profileIdForUser(
        user.id,
      )

    if (!profileId) {
      return NextResponse.json(
        {
          error:
            "User profile missing",
        },
        {
          status: 500,
        },
      )
    }

    const conversations =
      await query(
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
              AND m.sender_id <> $2
              AND m.read_at IS NULL
          ) AS unread_count,

          COALESCE(
            json_agg(
              json_build_object(
                'id',
                m.id,

                'sender_id',
                m.sender_id,

                'sender_username',
                sender_user.username,

                'sender_role',
                sender_user.role,

                'message',
                m.message,

                'created_at',
                m.created_at,

                'read_at',
                m.read_at
              )
              ORDER BY m.created_at ASC
            )
            FILTER (
              WHERE m.id IS NOT NULL
            ),
            '[]'::json
          ) AS messages

        FROM conversations c

        LEFT JOIN cases
          ON cases.id =
            c.case_id

        LEFT JOIN messages m
          ON m.conversation_id =
            c.id

        LEFT JOIN user_profiles sender_profile
          ON sender_profile.id =
            m.sender_id

        LEFT JOIN app_users sender_user
          ON sender_user.id =
            sender_profile.user_id

        WHERE
          /*
           * Normal conversation member.
           */
          EXISTS (
            SELECT 1
            FROM conversation_members cm
            WHERE cm.conversation_id =
              c.id
              AND cm.user_id = $1
          )

          OR

          /*
           * Assigned operator.
           */
          EXISTS (
            SELECT 1
            FROM case_assignments ca
            WHERE ca.case_id =
              c.case_id
              AND ca.assigned_to_profile_id =
                $2
          )

          OR

          /*
           * Super Administrator oversight.
           */
          $3 = true

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
          isSuperAdmin(user.role),
        ],
      )

    return NextResponse.json(
      conversations.rows,
    )
  } catch (error) {
    console.error(
      "MESSAGES GET ERROR",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Failed to load conversations",
      },
      {
        status: 500,
      },
    )
  }
}

// ============================================================
// POST MESSAGE
// ============================================================

export async function POST(
  req: NextRequest,
) {
  try {
    const user =
      await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        },
      )
    }

    const profileId =
      await profileIdForUser(
        user.id,
      )

    if (!profileId) {
      return NextResponse.json(
        {
          error:
            "User profile missing",
        },
        {
          status: 500,
        },
      )
    }

    const body =
      await req.json()

    const conversationId =
      typeof body?.conversation_id ===
      "string"
        ? body.conversation_id
        : undefined

    const requestedCaseId =
      typeof body?.case_id ===
      "string"
        ? body.case_id
        : undefined

    const message =
      typeof body?.message ===
      "string"
        ? body.message.trim()
        : ""

    if (!message) {
      return NextResponse.json(
        {
          error:
            "Message is required",
        },
        {
          status: 400,
        },
      )
    }

    let caseId =
      requestedCaseId

    let resolvedConversationId =
      conversationId

    // =======================================================
    // RESOLVE CONVERSATION
    // =======================================================

    if (
      resolvedConversationId
    ) {
      const conversation =
        await getConversation(
          resolvedConversationId,
        )

      if (!conversation) {
        return NextResponse.json(
          {
            error:
              "Conversation not found",
          },
          {
            status: 404,
          },
        )
      }

      if (
        conversation.case_id &&
        caseId &&
        conversation.case_id !==
          caseId
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
          error:
            "Case is required",
        },
        {
          status: 400,
        },
      )
    }

    // =======================================================
    // CASE AUTHORIZATION
    // =======================================================

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
          error:
            "Case not found",
        },
        {
          status: 404,
        },
      )
    }

    if (
      !permission.can_reply
    ) {
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

    // =======================================================
    // FIND / CREATE CONVERSATION
    // =======================================================

    if (
      !resolvedConversationId
    ) {
      resolvedConversationId =
        await getOrCreateCaseConversation(
          caseId,
          user.id,
        )
    } else {
      await query(
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
    }

    // =======================================================
    // INSERT MESSAGE
    // =======================================================
    //
    // messages.sender_id references
    // user_profiles.id in the existing schema.
    //
    // encrypted_content remains populated for
    // compatibility with the current schema.
    // =======================================================

    const inserted =
      await query<{
        id: string
        conversation_id: string
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

    const insertedMessage =
      inserted.rows[0]

    // =======================================================
    // RETURN ACTUAL SENDER IDENTITY
    // =======================================================

    const sender =
      await query<{
        username:
          | string
          | null
        role:
          | string
          | null
      }>(
        `
        SELECT
          au.username,
          au.role
        FROM user_profiles up
        LEFT JOIN app_users au
          ON au.id = up.user_id
        WHERE up.id = $1
        LIMIT 1
        `,
        [profileId],
      )

    return NextResponse.json(
      {
        ...insertedMessage,

        sender_username:
          sender.rows[0]
            ?.username ??
          null,

        sender_role:
          sender.rows[0]?.role ??
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
        error:
          "Failed to send message",
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
    const user =
      await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        },
      )
    }

    const profileId =
      await profileIdForUser(
        user.id,
      )

    if (!profileId) {
      return NextResponse.json(
        {
          error:
            "User profile missing",
        },
        {
          status: 500,
        },
      )
    }

    const body =
      await req.json()

    const conversationId =
      typeof body?.conversation_id ===
      "string"
        ? body.conversation_id
        : null

    const messageId =
      typeof body?.message_id ===
      "string"
        ? body.message_id
        : null

    if (
      !conversationId &&
      !messageId
    ) {
      return NextResponse.json(
        {
          error:
            "Missing target",
        },
        {
          status: 400,
        },
      )
    }

    let caseId:
      | string
      | null = null

    if (
      conversationId
    ) {
      const conversation =
        await getConversation(
          conversationId,
        )

      if (!conversation) {
        return NextResponse.json(
          {
            error:
              "Conversation not found",
          },
          {
            status: 404,
          },
        )
      }

      caseId =
        conversation.case_id
    }

    if (
      !caseId &&
      messageId
    ) {
      const message =
        await query<{
          case_id:
            | string
            | null
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
        message.rows[0]
          ?.case_id ??
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

    const permission =
      await getCasePermission(
        user.id,
        profileId,
        user.role,
        caseId,
      )

    if (
      !permission?.can_view
    ) {
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

    await query(
      `
      UPDATE messages
      SET read_at =
        COALESCE(
          read_at,
          NOW()
        )
      WHERE sender_id <> $1

        AND (
          $2::uuid IS NULL
          OR conversation_id =
            $2::uuid
        )

        AND (
          $3::uuid IS NULL
          OR id = $3::uuid
        )
      `,
      [
        profileId,
        conversationId,
        messageId,
      ],
    )

    return NextResponse.json(
      {
        success:
          true,
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