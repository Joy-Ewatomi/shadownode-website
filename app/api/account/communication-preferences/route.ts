import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { CommunicationPreferenceError, validateCommunicationSelection } from "@/lib/communication-channels"
import { isSameOriginMutation } from "@/lib/security-center"

export const dynamic = "force-dynamic"
export const revalidate = 0
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, private" }

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE })
  const result = await query<{ communication_preference: string; whatsapp_number_e164: string | null; consent: boolean }>(
    `SELECT communication_preference, whatsapp_number_e164,
      (whatsapp_consent_at IS NOT NULL AND whatsapp_consent_withdrawn_at IS NULL) AS consent
     FROM user_profiles WHERE user_id = $1 LIMIT 1`, [user.id],
  )
  return NextResponse.json({ preference: result.rows[0]?.communication_preference || "portal", whatsappNumber: result.rows[0]?.whatsapp_number_e164 || "", whatsappConsent: result.rows[0]?.consent || false, verifiedEmail: user.email_verified_at ? user.email : null }, { headers: NO_STORE })
}

export async function PUT(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403, headers: NO_STORE })
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE })
  try {
    const body = await request.json()
    const selection = validateCommunicationSelection({ preference: body.preference, whatsappNumber: body.whatsappNumber, whatsappConsent: body.whatsappConsent })
    if (selection.preference === "email" && !user.email_verified_at) throw new CommunicationPreferenceError("Verify your account email before selecting Email.")
    await query(
      `UPDATE user_profiles SET communication_preference = $2, whatsapp_number_e164 = $3,
       whatsapp_consent_at = CASE WHEN $2 = 'whatsapp' AND $4 THEN COALESCE(whatsapp_consent_at, now()) ELSE whatsapp_consent_at END,
       whatsapp_consent_withdrawn_at = CASE WHEN $2 = 'whatsapp' AND $4 THEN NULL WHEN whatsapp_consent_at IS NOT NULL THEN now() ELSE NULL END,
       updated_at = now() WHERE user_id = $1`,
      [user.id, selection.preference, selection.preference === "whatsapp" ? selection.whatsappNumber : null, selection.whatsappConsent],
    )
    await auditLog(user.id, "communication_preferences_updated", request, { preference: selection.preference, whatsapp_consent: selection.preference === "whatsapp" })
    return NextResponse.json({ success: true }, { headers: NO_STORE })
  } catch (error) {
    if (error instanceof CommunicationPreferenceError) return NextResponse.json({ error: error.message }, { status: 400, headers: NO_STORE })
    return NextResponse.json({ error: "Unable to update communication preferences." }, { status: 500, headers: NO_STORE })
  }
}
