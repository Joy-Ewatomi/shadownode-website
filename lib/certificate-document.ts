import QRCode from "qrcode"
import sharp from "sharp"

import { getTrustedApplicationOrigin } from "@/lib/app-origin"

import type { AppUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { ensureAccess } from "@/lib/services/training-operations-service"

export const CERTIFICATE_WIDTH = 3508
export const CERTIFICATE_HEIGHT = 2480

export type CertificateDocument = {
  id: string
  engagementId: string
  certificateNumber: string
  recipientName: string
  organizationName: string | null
  trainingTitle: string
  trainingType: string | null
  trainerName: string | null
  completionDate: string
  issueDate: string
  verificationUrl: string
}

type CertificateRow = {
  id: string
  training_engagement_id: string
  certificate_number: string
  recipient_name: string
  organization_name: string | null
  training_title: string
  training_type: string | null
  trainer_name: string | null
  completion_date: string
  issued_at: string
  verification_url: string | null
  verification_token: string
  status: string
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function xml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[character] || character)
}

function safeVerificationUrl(value: string | null, token: string) {
  if (value) {
    try {
      const parsed = new URL(value)
      if (parsed.protocol === "https:" || (process.env.NODE_ENV !== "production" && parsed.protocol === "http:")) {
        return parsed.toString()
      }
    } catch {}
  }
  const origin = getTrustedApplicationOrigin()
  if (!origin) throw new Error("Trusted application origin is unavailable")
  return new URL(`/verify/certificate/${encodeURIComponent(token)}`, origin).toString()
}

export async function loadAuthorizedCertificateDocument(
  engagementId: string,
  certificateId: string,
  user: AppUser,
): Promise<CertificateDocument | null> {
  await ensureAccess(engagementId, user, false)
  const result = await query<CertificateRow>(
    `SELECT id, training_engagement_id, certificate_number, recipient_name,
       organization_name, training_title, training_type, trainer_name,
       completion_date, issued_at, verification_url, verification_token, status
     FROM training_certificates
     WHERE id = $1 AND training_engagement_id = $2 AND status = 'issued'
     LIMIT 1`,
    [certificateId, engagementId],
  )
  const row = result.rows[0]
  if (!row) return null
  return {
    id: row.id,
    engagementId: row.training_engagement_id,
    certificateNumber: clean(row.certificate_number),
    recipientName: clean(row.recipient_name),
    organizationName: clean(row.organization_name) || null,
    trainingTitle: clean(row.training_title),
    trainingType: clean(row.training_type) || null,
    trainerName: clean(row.trainer_name) || null,
    completionDate: clean(row.completion_date),
    issueDate: clean(row.issued_at),
    verificationUrl: safeVerificationUrl(row.verification_url, row.verification_token),
  }
}

function formattedDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date)
}

function wrappedLines(value: string, maxCharacters: number, maximumLines = 2) {
  const words = value.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  for (const word of words) {
    const index = Math.max(0, lines.length - 1)
    if (!lines.length || `${lines[index]} ${word}`.trim().length > maxCharacters) lines.push(word)
    else lines[index] = `${lines[index]} ${word}`
  }
  if (lines.length > maximumLines) {
    const visible = lines.slice(0, maximumLines)
    visible[maximumLines - 1] = `${visible[maximumLines - 1].slice(0, Math.max(1, maxCharacters - 3))}...`
    return visible
  }
  return lines
}

export async function createCertificateSvg(document: CertificateDocument) {
  const qr = await QRCode.toDataURL(document.verificationUrl, { errorCorrectionLevel: "M", margin: 1, width: 420 })
  const titleLines = wrappedLines(document.trainingTitle, 45)
  const recipientLines = wrappedLines(document.recipientName, 38)
  const trainerBlock = document.trainerName
    ? `<text x="2730" y="1980" text-anchor="middle" class="meta strong">${xml(document.trainerName)}</text><line x1="2410" y1="2015" x2="3050" y2="2015" class="line"/><text x="2730" y="2070" text-anchor="middle" class="label">TRAINER</text>`
    : ""
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CERTIFICATE_WIDTH}" height="${CERTIFICATE_HEIGHT}" viewBox="0 0 ${CERTIFICATE_WIDTH} ${CERTIFICATE_HEIGHT}">
  <rect width="3508" height="2480" fill="#f8faf9"/>
  <rect x="70" y="70" width="3368" height="2340" rx="8" fill="none" stroke="#071a17" stroke-width="18"/>
  <rect x="105" y="105" width="3298" height="2270" rx="4" fill="none" stroke="#b58a2b" stroke-width="5"/>
  <rect x="145" y="145" width="3218" height="2190" fill="none" stroke="#173e35" stroke-width="2"/>
  <path d="M145 430 H3363 M145 2180 H3363" stroke="#b58a2b" stroke-width="4"/>
  <rect x="145" y="145" width="3218" height="285" fill="#071a17"/>
  <text x="1754" y="265" text-anchor="middle" fill="#f8faf9" font-family="Arial,Helvetica,sans-serif" font-size="70" font-weight="700">SHADOWNODE OPERATIONS BUREAU</text>
  <text x="1754" y="350" text-anchor="middle" fill="#d2b15b" font-family="Arial,Helvetica,sans-serif" font-size="30" letter-spacing="8">CERTIFICATE REGISTRY</text>
  <style>.serif{font-family:Georgia,'Times New Roman',serif}.sans{font-family:Arial,Helvetica,sans-serif}.label{font-family:Arial,Helvetica,sans-serif;font-size:25px;fill:#496159;letter-spacing:5px}.meta{font-family:Arial,Helvetica,sans-serif;font-size:31px;fill:#173e35}.strong{font-weight:700}.line{stroke:#8aa197;stroke-width:2}</style>
  <text x="1754" y="650" text-anchor="middle" class="serif" font-size="104" fill="#071a17">Certificate of Completion</text>
  <text x="1754" y="770" text-anchor="middle" class="label">THIS CERTIFIES THAT</text>
  ${recipientLines.map((line, index) => `<text x="1754" y="${930 + index * 104}" text-anchor="middle" class="serif" font-size="82" font-weight="700" fill="#173e35">${xml(line)}</text>`).join("")}
  ${document.organizationName ? `<text x="1754" y="1135" text-anchor="middle" class="sans" font-size="34" fill="#496159">${xml(document.organizationName)}</text>` : ""}
  <text x="1754" y="1290" text-anchor="middle" class="sans" font-size="36" fill="#496159">has completed</text>
  ${titleLines.map((line, index) => `<text x="1754" y="${1410 + index * 75}" text-anchor="middle" class="sans" font-size="57" font-weight="700" fill="#071a17">${xml(line)}</text>`).join("")}
  ${document.trainingType ? `<text x="1754" y="1595" text-anchor="middle" class="label">${xml(document.trainingType.toUpperCase())}</text>` : ""}
  <text x="820" y="1980" text-anchor="middle" class="meta strong">${xml(formattedDate(document.completionDate))}</text><line x1="500" y1="2015" x2="1140" y2="2015" class="line"/><text x="820" y="2070" text-anchor="middle" class="label">COMPLETION DATE</text>
  ${trainerBlock}
  <image href="${qr}" x="1450" y="1720" width="330" height="330"/>
  <text x="1615" y="2090" text-anchor="middle" class="label" font-size="20">VERIFY</text>
  <text x="1754" y="2255" text-anchor="middle" class="sans" font-size="27" fill="#496159">Certificate ${xml(document.certificateNumber)} - Issued ${xml(formattedDate(document.issueDate))}</text>
</svg>`)
}

export async function renderCertificatePng(document: CertificateDocument) {
  return sharp(await createCertificateSvg(document), { density: 300 }).png({ compressionLevel: 9 }).toBuffer()
}

function pdfString(value: string) {
  return value.replace(/([\\()])/g, "\\$1").replace(/[\r\n]/g, " ")
}

function buildPdf(jpeg: Buffer, title: string, certificateNumber: string) {
  const objects: Buffer[] = []
  const add = (body: string | Buffer) => objects.push(Buffer.isBuffer(body) ? body : Buffer.from(body, "binary"))
  add("<< /Type /Catalog /Pages 2 0 R >>")
  add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
  add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>")
  const content = "q 841.89 0 0 595.28 0 0 cm /Im0 Do Q"
  add(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`)
  add(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${CERTIFICATE_WIDTH} /Height ${CERTIFICATE_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, "binary"), jpeg, Buffer.from("\nendstream", "binary")]))
  add(`<< /Title (${pdfString(title)}) /Subject (Training certificate ${pdfString(certificateNumber)}) /Author (ShadowNode Operations Bureau Limited) /Creator (ShadowNode Operations Bureau) >>`)
  const chunks = [Buffer.from("%PDF-1.7\n%\xE2\xE3\xCF\xD3\n", "binary")]
  const offsets = [0]
  let length = chunks[0].length
  objects.forEach((object, index) => {
    offsets.push(length)
    const chunk = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`, "binary"), object, Buffer.from("\nendobj\n", "binary")])
    chunks.push(chunk); length += chunk.length
  })
  const xrefOffset = length
  const xref = [`xref\n0 ${objects.length + 1}\n`, "0000000000 65535 f \n", ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)].join("")
  chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`, "binary"))
  return Buffer.concat(chunks)
}

export async function renderCertificatePdf(document: CertificateDocument) {
  const jpeg = await sharp(await createCertificateSvg(document), { density: 300 }).jpeg({ quality: 94, chromaSubsampling: "4:4:4" }).toBuffer()
  return buildPdf(jpeg, `${document.recipientName} - ${document.trainingTitle}`, document.certificateNumber)
}

export function certificateFilename(certificateNumber: string, extension: "pdf" | "png") {
  const safe = certificateNumber.replace(/[^A-Za-z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 80) || "Certificate"
  return `ShadowNode-Certificate-${safe}.${extension}`
}
