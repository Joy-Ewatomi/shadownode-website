import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import {
  certificateFilename,
  loadAuthorizedCertificateDocument,
  renderCertificatePdf,
  renderCertificatePng,
} from "@/lib/certificate-document"

export const dynamic = "force-dynamic"
export const revalidate = 0

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
}
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS })
  const { id } = await params
  const certificateId = request.nextUrl.searchParams.get("certificateId")?.trim() || ""
  const format = request.nextUrl.searchParams.get("format")?.trim().toLowerCase()
  if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(certificateId)) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404, headers: PRIVATE_HEADERS })
  }
  if (format !== "pdf" && format !== "png") {
    return NextResponse.json({ error: "Unsupported certificate format" }, { status: 400, headers: PRIVATE_HEADERS })
  }
  try {
    const document = await loadAuthorizedCertificateDocument(id, certificateId, user)
    if (!document) return NextResponse.json({ error: "Certificate not found" }, { status: 404, headers: PRIVATE_HEADERS })
    const body = format === "pdf" ? await renderCertificatePdf(document) : await renderCertificatePng(document)
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": format === "pdf" ? "application/pdf" : "image/png",
        "Content-Disposition": `attachment; filename="${certificateFilename(document.certificateNumber, format)}"`,
        "Content-Length": String(body.length),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : ""
    const status = message.includes("unauthorized") ? 401 : message.includes("forbidden") || message.includes("approved trainer") ? 403 : message.includes("not found") ? 404 : 500
    if (status === 500) console.error("CERTIFICATE DOWNLOAD GENERATION ERROR")
    return NextResponse.json({ error: status === 500 ? "Unable to generate certificate" : "Certificate not found" }, { status, headers: PRIVATE_HEADERS })
  }
}
