import { NextResponse } from "next/server"
import { getPublicSiteProfile } from "@/lib/public-site-profile"

export const dynamic = "force-dynamic"
export async function GET() {
  return NextResponse.json(await getPublicSiteProfile(), { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } })
}
