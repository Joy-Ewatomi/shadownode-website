import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const result = await query(
      `
      SELECT
        id,
        case_number,
        title,
        service_type,
        status,
        approved_quote_amount,
        approved_quote_currency,
        approved_quote_notes,
        approved_estimated_completion,
        ai_price_estimate,
        ai_complexity,
        ai_estimated_hours,
        ai_reasoning,
        created_at
      FROM requests
      WHERE user_id = $1
        AND (
          approved_quote_amount IS NOT NULL
          OR status IN (
            'quote_sent',
            'negotiation_requested',
            'revised_quote_sent',
            'accepted'
          )
        )
      ORDER BY created_at DESC
      `,
      [user.id]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("CLIENT QUOTES ERROR", error)

    return NextResponse.json(
      { error: "Failed to load quotes" },
      { status: 500 }
    )
  }
}