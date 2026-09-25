import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { flutterwaveSupportsCurrency, getFlutterwaveConfig } from "@/lib/payments/flutterwave"
export const dynamic = "force-dynamic"
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== "client") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const requestId = request.nextUrl.searchParams.get("request_id") || ""
  const result = await query<{ currency: string }>(`SELECT q.currency FROM requests r JOIN quote_versions q ON q.id=r.accepted_quote_version_id AND q.request_id=r.id WHERE r.id=$1 AND r.user_id=$2 LIMIT 1`, [requestId, user.id])
  const currency = result.rows[0]?.currency?.toUpperCase()
  if (!currency) return NextResponse.json({ error: "Quotation not found" }, { status: 404 })
  return NextResponse.json({ providers: {
    paystack: { available: Boolean(process.env.PAYSTACK_SECRET_KEY), label: "Paystack" },
    flutterwave: { available: Boolean(getFlutterwaveConfig()) && flutterwaveSupportsCurrency(currency), label: "Flutterwave" },
  } }, { headers: { "Cache-Control": "no-store" } })
}
