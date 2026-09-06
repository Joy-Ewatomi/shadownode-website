import { NextRequest, NextResponse } from "next/server"
import { createSignedUrlForBucket } from "@/lib/services/storage-service"

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const path = url.searchParams.get("path")
    if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

    const signed = await createSignedUrlForBucket('evidence', path, 60 * 15)
    return NextResponse.redirect(signed)
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 400 })
  }
}
