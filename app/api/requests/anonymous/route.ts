import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const RETIRED_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
  Expires: "0",
}

export async function POST() {
  return NextResponse.json(
    {
      error: "Anonymous service requests are no longer accepted. Create or sign in to a client account to submit a request.",
      code: "ANONYMOUS_REQUESTS_RETIRED",
    },
    { status: 410, headers: RETIRED_HEADERS },
  )
}
