import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { withTransaction, query } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { operationalEmailFrom, validReplyTo } from "@/lib/email-address"
import { getPublicSiteProfile } from "@/lib/public-site-profile"
import { isSameOriginMutation } from "@/lib/security-center"

const HEADERS = { "Cache-Control": "private, no-store" }
export const dynamic = "force-dynamic"
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403, headers: HEADERS })
  const body = await request.json().catch(() => null)
  if (typeof body?.website === "string" && body.website) return NextResponse.json({ message: "Your enquiry has been received." }, { headers: HEADERS })
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const email = validReplyTo(typeof body?.email === "string" ? body.email : undefined)
  const organization = typeof body?.organization === "string" ? body.organization.trim() : ""
  const subject = typeof body?.subject === "string" ? body.subject.trim() : ""
  const message = typeof body?.message === "string" ? body.message.trim() : ""
  if (name.length < 2 || name.length > 100 || !email || organization.length > 160 || subject.length < 3 || subject.length > 160 || message.length < 20 || message.length > 5000) {
    return NextResponse.json({ error: "Complete all required fields with a valid email and a message of at least 20 characters." }, { status: 400, headers: HEADERS })
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const fingerprint = createHash("sha256").update(`${ip}|${request.headers.get("user-agent") || ""}`).digest("hex")
  let inquiryId: string
  try {
    inquiryId = await withTransaction(async (client) => {
      await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [fingerprint])
      const recent = await client.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM contact_inquiries WHERE request_fingerprint_hash=$1 AND created_at > now() - interval '1 hour'`, [fingerprint])
      if (Number(recent.rows[0]?.count || 0) >= 5) throw new Error("RATE_LIMIT")
      const inserted = await client.query<{ id: string }>(`INSERT INTO contact_inquiries (name,email,organization,subject,message,request_fingerprint_hash) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [name, email, organization || null, subject, message, fingerprint])
      return inserted.rows[0].id
    })
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMIT") return NextResponse.json({ error: "Too many enquiries were submitted. Please try again later." }, { status: 429, headers: HEADERS })
    return NextResponse.json({ error: "The contact form is temporarily unavailable. Please use the monitored email address." }, { status: 503, headers: HEADERS })
  }
  const profile = await getPublicSiteProfile()
  try {
    const sent = await sendEmail({
      to: profile.contact_email,
      from: operationalEmailFrom() || undefined,
      replyTo: email,
      subject: `Website enquiry: ${subject}`,
      content: { category: "Public enquiry", heading: subject, paragraphs: [`From: ${name}${organization ? ` (${organization})` : ""}`, message], securityNotice: "Treat links and attachments referenced by an unknown sender with care." },
    })
    await query(`UPDATE contact_inquiries SET email_delivery_status=$2 WHERE id=$1`, [inquiryId, sent ? "sent" : "skipped"])
  } catch { await query(`UPDATE contact_inquiries SET email_delivery_status='failed' WHERE id=$1`, [inquiryId]).catch(() => undefined) }
  return NextResponse.json({ message: "Your enquiry has been received. We will review it as soon as possible." }, { headers: HEADERS })
}
