import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
  Expires: "0",
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    if (!/^[A-Za-z0-9_-]{32}$/.test(token || "")) {
      return NextResponse.json({ error: "Request not found" }, { status: 404, headers: NO_STORE })
    }

    const { data, error } = await supabase
      .from("requests")
      .select(`
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
      `)
      .eq("token", token)
      .eq("is_anonymous", true)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({ error: "Request not found" }, { status: 404, headers: NO_STORE })
    }

    return NextResponse.json(
      {
        id: data.id,
        request_id: data.id,
        case_number: data.case_number ?? null,
        title: data.title ?? null,
        description: data.description ?? null,
        service_type: data.service_type ?? null,
        timeline: data.timeline ?? null,
        status: data.status ?? null,
        created_at: data.created_at ?? null,
        approved_quote_amount: data.approved_quote_amount ?? null,
        approved_quote_currency: data.approved_quote_currency ?? null,
        is_anonymous: true,
      },
      { headers: NO_STORE },
    )
  } catch {
    return NextResponse.json({ error: "Unable to retrieve request status" }, { status: 500, headers: NO_STORE })
  }
}
