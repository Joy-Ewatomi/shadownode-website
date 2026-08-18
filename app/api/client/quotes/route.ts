import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    if (user.role !== "client") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
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

        /*
         * =====================================================
         * CLIENT-FACING QUOTE ONLY
         * =====================================================
         */

        approved_quote_amount,
        approved_quote_currency,
        approved_quote_notes,
        approved_estimated_completion,

        quote_sent_at,
        client_decision_at,
        declined_reason,

        created_at,
        updated_at

      FROM requests

      WHERE user_id = $1

        AND (
          approved_quote_amount IS NOT NULL

          OR status IN (
            'quote_sent',
            'awaiting_client_acceptance',
            'revised_quote_sent',
            'negotiation_requested',
            'accepted',
            'declined',
            'rejected'
          )
        )

      ORDER BY created_at DESC
      `,
      [user.id],
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error(
      "CLIENT QUOTES ERROR",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to load quotes",
      },
      {
        status: 500,
      },
    )
  }
}