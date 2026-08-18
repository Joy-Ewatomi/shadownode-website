import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>
  },
) {
  try {
    const { user, response } = await requireUser()

    if (!user) {
      return response
    }

    if (user.role !== "client") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 },
      )
    }

   const { rows } = await query(
  `
    SELECT
      id,
      case_number,
      title,
      service_type,
      description,
      status,

      approved_quote_amount,
      approved_quote_currency,
      approved_estimated_completion,

      quote_sent_at,
      client_decision_at,
      declined_reason,

      created_at,
      updated_at

    FROM requests

    WHERE id = $1
      AND user_id = $2

    LIMIT 1
  `,
  [id, user.id],
)

    if (!rows[0]) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 },
      )
    }

    return NextResponse.json(rows[0])
  } catch (error) {
    console.error(
      "CLIENT QUOTE GET ERROR",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to load request",
      },
      { status: 500 },
    )
  }
}