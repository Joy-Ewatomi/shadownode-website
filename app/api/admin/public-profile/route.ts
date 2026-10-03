import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { validReplyTo } from "@/lib/email-address"
import { getPublicSiteProfile, safePublicUrl } from "@/lib/public-site-profile"
import { isSuperAdministratorRole } from "@/lib/role-access"
import { isSameOriginMutation } from "@/lib/security-center"

const HEADERS = { "Cache-Control": "private, no-store" }
export const dynamic = "force-dynamic"

async function authorize() {
  const user = await getCurrentUser()
  return user && isSuperAdministratorRole(user.role) ? user : null
}

export async function GET() {
  if (!(await authorize())) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: HEADERS })
  return NextResponse.json(await getPublicSiteProfile(), { headers: HEADERS })
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403, headers: HEADERS })
  const user = await authorize()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: HEADERS })
  const body = await request.json().catch(() => null)
  const founderName = typeof body?.founder_name === "string" ? body.founder_name.trim() : ""
  const biography = typeof body?.biography === "string" ? body.biography.trim() : ""
  const location = typeof body?.location === "string" ? body.location.trim() : ""
  const linkedin = safePublicUrl(body?.linkedin_url, "www.linkedin.com")
  const contactEmail = validReplyTo(typeof body?.contact_email === "string" ? body.contact_email : undefined)
  const booking = body?.booking_url ? safePublicUrl(body.booking_url) : null
  if (founderName.length < 2 || founderName.length > 100 || biography.length > 3000 || location.length > 120 || !linkedin || !contactEmail || (body?.booking_url && !booking)) {
    return NextResponse.json({ error: "Review the profile fields and use valid HTTPS URLs and email addresses." }, { status: 400, headers: HEADERS })
  }
  try {
    await query(`INSERT INTO public_site_profile (singleton, founder_name, biography, location, linkedin_url, contact_email, booking_url, updated_by)
      VALUES (true, $1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (singleton) DO UPDATE SET founder_name=EXCLUDED.founder_name, biography=EXCLUDED.biography,
      location=EXCLUDED.location, linkedin_url=EXCLUDED.linkedin_url, contact_email=EXCLUDED.contact_email,
      booking_url=EXCLUDED.booking_url, updated_by=EXCLUDED.updated_by, updated_at=now()`,
      [founderName, biography || null, location || null, linkedin, contactEmail, booking, user.id])
    await auditLog(user.id, "public_founder_profile_updated", request)
    return NextResponse.json({ message: "Public profile updated." }, { headers: HEADERS })
  } catch { return NextResponse.json({ error: "Public profile storage is not available. Apply the reviewed migration first." }, { status: 503, headers: HEADERS }) }
}
