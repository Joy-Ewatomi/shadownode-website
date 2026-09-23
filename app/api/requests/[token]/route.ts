import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ token: string }>
  },
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        {
          error: "Invalid token",
        },
        {
          status: 400,
        },
      )
    }

    const { data, error } = await supabase
      .from("requests")
      .select(
        `
          id,
          case_number,
          title,
          description,
          service_type,
          timeline,
          status,
          created_at,
          approved_quote_amount,
          approved_quote_currency,
          is_anonymous
        `,
      )
      .eq("token", token)
      .single()

    if (error || !data) {
      console.error("TRACK REQUEST NOT FOUND:", error)

      return NextResponse.json(
        {
          error: "Request not found",
        },
        {
          status: 404,
        },
      )
    }

    return NextResponse.json({
      id: data.id,
      token,
      request_id: data.id,
      case_number: data.case_number ?? null,
      title: data.title ?? null,
      description: data.description ?? null,
      service_type: data.service_type ?? null,
      timeline: data.timeline ?? null,
      status: data.status ?? null,
      created_at: data.created_at ?? null,
      approved_quote_amount:
        data.approved_quote_amount ?? null,
      approved_quote_currency:
        data.approved_quote_currency ?? null,
      is_anonymous:
        data.is_anonymous ?? false,
    })
  } catch (error) {
    console.error(
      "TRACK REQUEST ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error: "Failed to fetch request",
      },
      {
        status: 500,
      },
    )
  }
}
