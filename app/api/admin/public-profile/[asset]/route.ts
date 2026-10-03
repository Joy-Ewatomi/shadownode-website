import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"
import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { PUBLIC_SITE_BUCKET } from "@/lib/public-site-profile"
import { isSuperAdministratorRole } from "@/lib/role-access"
import { isSameOriginMutation } from "@/lib/security-center"
import { deleteFileFromBucket, uploadFileToBucket } from "@/lib/services/storage-service"

const HEADERS = { "Cache-Control": "private, no-store" }
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest, { params }: { params: Promise<{ asset: string }> }) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403, headers: HEADERS })
  const user = await getCurrentUser()
  if (!user || !isSuperAdministratorRole(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: HEADERS })
  const { asset } = await params
  if (asset !== "portrait" && asset !== "sample-report") return NextResponse.json({ error: "Not found" }, { status: 404, headers: HEADERS })
  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file." }, { status: 400, headers: HEADERS })
  try {
    if (asset === "portrait") {
      if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 5_000_000) throw new Error("INVALID")
      const output = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 20_000_000 }).rotate().resize(900, 1100, { fit: "cover", position: "attention" }).webp({ quality: 86 }).toBuffer()
      await uploadFileToBucket(PUBLIC_SITE_BUCKET, "founder/portrait.webp", output, "image/webp", { upsert: true })
      await query(`UPDATE public_site_profile SET portrait_path='founder/portrait.webp', updated_by=$1, updated_at=now() WHERE singleton=true`, [user.id])
    } else {
      if (file.type !== "application/pdf" || file.size > 10_000_000) throw new Error("INVALID")
      const bytes = Buffer.from(await file.arrayBuffer())
      if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("INVALID")
      await uploadFileToBucket(PUBLIC_SITE_BUCKET, "reports/sample-report.pdf", bytes, "application/pdf", { upsert: true })
      await query(`UPDATE public_site_profile SET sample_report_path='reports/sample-report.pdf', sample_report_name=$1, updated_by=$2, updated_at=now() WHERE singleton=true`, [file.name.slice(0, 160), user.id])
    }
    await auditLog(user.id, `public_${asset.replace("-", "_")}_updated`, request)
    return NextResponse.json({ message: asset === "portrait" ? "Portrait updated." : "Sample report updated." }, { headers: HEADERS })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "INVALID" ? "Choose a supported file within the size limit." : "File could not be stored." }, { status: 400, headers: HEADERS })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ asset: string }> }) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403, headers: HEADERS })
  const user = await getCurrentUser()
  if (!user || !isSuperAdministratorRole(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: HEADERS })
  const { asset } = await params
  const portrait = asset === "portrait"
  if (!portrait && asset !== "sample-report") return NextResponse.json({ error: "Not found" }, { status: 404, headers: HEADERS })
  const path = portrait ? "founder/portrait.webp" : "reports/sample-report.pdf"
  await deleteFileFromBucket(PUBLIC_SITE_BUCKET, path).catch(() => undefined)
  await query(`UPDATE public_site_profile SET ${portrait ? "portrait_path=NULL" : "sample_report_path=NULL, sample_report_name=NULL"}, updated_by=$1, updated_at=now() WHERE singleton=true`, [user.id])
  await auditLog(user.id, `public_${asset.replace("-", "_")}_removed`, request)
  return NextResponse.json({ message: "Public asset removed." }, { headers: HEADERS })
}
