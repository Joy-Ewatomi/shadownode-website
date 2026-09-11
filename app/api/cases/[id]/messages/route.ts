import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import {
  optionalText,
  profileIdForUser,
} from "@/lib/investigation-workspace"

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
      ) AS is_assigned

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

  const isSuperAdmin = isSuperAdminRole(role)

  let canView = false
  let canReply = false

  if (role === "client") {
    canView = isClient
    canReply = isClient
  } else if (isSuperAdmin) {
    canView = true
    canReply = isAssigned
  } else {
    canView = isAssigned
    canReply = isAssigned
  }

  return {
    can_view: canView,
    can_reply: canReply,
    is_assigned: isAssigned,
    is_client: isClient,
    is_super_admin: isSuperAdmin,
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
) {
  const existing = await query<{
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
    const created = await query<{
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

    conversationId = created.rows[0].id
  }

  // Sender
  await query(
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
    [conversationId, caseId],
  )

  // Active/approved assignees only
  await query(
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

    const result = await query(
      `
      SELECT
        m.id,
        m.case_id,
        m.sender_id,
        m.sender_type,
        m.message,
        m.created_at,
        m.read_at,

        up.full_name AS sender_name,
        au.username AS username,
        au.email AS sender_email,
        au.role AS sender_role

      FROM messages m

      LEFT JOIN user_profiles up
        ON up.id = m.sender_id

      LEFT JOIN app_users au
        ON au.id = up.user_id

      WHERE m.case_id = $1

      ORDER BY m.created_at ASC
      `,
      [caseId],
    )

    return NextResponse.json(
      {
        messages: result.rows,
        permissions: permission,
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

    const conversationId =
      await getOrCreateCaseConversation(
        caseId,
        user.id,
      )

    const result = await query<{
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
          ...result.rows[0],

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