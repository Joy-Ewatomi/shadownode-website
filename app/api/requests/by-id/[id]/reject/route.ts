import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { isAdminRole, requireUser } from "@/lib/auth"

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
  const { user, response } = await requireUser()

  if (!user) {
    return response
  }

  if (!isAdminRole(user.role)) {
    return NextResponse.json(
      {
        error: "Permission denied",
      },
      {
        status: 403,
      }
    )
  }

  const body = await request.json()

  const {
    reason,
  } = body

  const { id } = await params

  const { rows } = await query(
    `
    UPDATE requests

    SET
      status = 'rejected',
      declined_reason = $1,
      updated_at = NOW()

    WHERE id = $2

    RETURNING *
    `,
    [
      reason || "Request rejected",
      id,
    ]
  )

  if (!rows[0]) {
    return NextResponse.json(
      {
        error: "Request not found",
      },
      {
        status: 404,
      }
    )
  }

  return NextResponse.json({
    success: true,
    request: rows[0],
  })
}
