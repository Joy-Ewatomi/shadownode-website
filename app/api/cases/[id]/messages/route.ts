import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import {
  optionalText,
  profileIdForUser,
  requireInvestigationWorkspace,
} from "@/lib/investigation-workspace"

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
    const { id } = await params

    const access =
      await requireInvestigationWorkspace(
        request,
        id,
      )

    if (!access.ok) {
      return NextResponse.json(
        {
          error: access.error,
        },
        {
          status: access.status,
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
          m.encrypted_content,
          m.created_at,
          m.read_at,

          au.username AS username,
          au.email AS sender_email

        FROM messages m

        LEFT JOIN user_profiles up
          ON up.id = m.sender_id

        LEFT JOIN app_users au
          ON au.id = up.user_id

        WHERE m.case_id = $1

        ORDER BY m.created_at ASC
      `,
      [access.caseId],
    )

    return NextResponse.json(
      result.rows,
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
    const { id } = await params

    const access =
      await requireInvestigationWorkspace(
        request,
        id,
      )

    if (!access.ok) {
      return NextResponse.json(
        {
          error: access.error,
        },
        {
          status: access.status,
        },
      )
    }

    const body =
      await request.json()

    const content =
      optionalText(
        body?.message,
      )

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

    const senderProfileId =
      await profileIdForUser(
        access.user.id,
      )

    if (!senderProfileId) {
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

    const result = await query(
      `
        INSERT INTO messages (
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
          $4,
          NOW()
        )

        RETURNING
          id,
          case_id,
          sender_id,
          sender_type,
          message,
          encrypted_content,
          created_at,
          read_at
      `,
      [
        access.caseId,
        senderProfileId,
        access.user.role,
        content,
      ],
    )

    return NextResponse.json(
      {
        success: true,
        message: result.rows[0],
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