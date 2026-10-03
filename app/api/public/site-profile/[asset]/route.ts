import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { createSignedUrlForBucket } from "@/lib/services/storage-service"
import { PUBLIC_SITE_BUCKET } from "@/lib/public-site-profile"

export const dynamic = "force-dynamic"
export async function GET(_: Request, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params
  if (asset !== "portrait" && asset !== "sample-report") return NextResponse.json({ error: "Not found" }, { status: 404 })
  try {
    const result = await query<{ path: string | null }>(
      `SELECT ${asset === "portrait" ? "portrait_path" : "sample_report_path"} AS path FROM public_site_profile WHERE singleton = true`,
    )
    const path = result.rows[0]?.path
    if (!path) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.redirect(await createSignedUrlForBucket(PUBLIC_SITE_BUCKET, path, 300), {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch { return NextResponse.json({ error: "File unavailable" }, { status: 404 }) }
}
