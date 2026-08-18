import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const { user, response } = await requireUser()

  if (!user) {
    return response
  }

  try {
    const { rows } = await query(
      `
      SELECT
        id,
        case_number,
        client_email,
        title,
        service_type,
        description,
        timeline,
        status,
        priority,
        ai_price_estimate,
        ai_complexity,
        ai_confidence,
        ai_reasoning,
        approved_quote_amount,
        approved_quote_currency,
        created_at

      FROM requests

      ORDER BY created_at DESC
      `
    )

    return NextResponse.json(rows)
  } catch (error) {
    console.error("REQUESTS LIST ERROR", error)

    return NextResponse.json(
      {
        error: "Failed to load requests",
      },
      {
        status: 500,
      }
    )
  }
}