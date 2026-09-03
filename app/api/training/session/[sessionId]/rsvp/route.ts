import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { ensureAccess, getUserProfileId } from "@/lib/services/training-operations-service"

export async function POST(req: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { sessionId } = await context.params
    const body = await req.json()
    const partstat = String(body.partstat || '').toUpperCase()
    if (!['ACCEPTED','DECLINED','TENTATIVE','NONE'].includes(partstat)) {
      return NextResponse.json({ error: 'Invalid partstat' }, { status: 400 })
    }

    // load session and engagement id
    const sres = await query(`SELECT training_engagement_id FROM training_sessions WHERE id = $1 LIMIT 1`, [sessionId])
    const s: any = sres.rows[0]
    if (!s) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const engagementId = String(s.training_engagement_id)

    // ensure access (client or assigned trainer)
    await ensureAccess(engagementId, user, true)

    const profileId = await getUserProfileId(user.id)

    // upsert attendee record
    const now = new Date().toISOString()
    await query(
      `INSERT INTO training_session_attendees (session_id, training_engagement_id, profile_id, user_id, email, partstat, responded_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
       ON CONFLICT (session_id, user_id) DO UPDATE SET partstat = EXCLUDED.partstat, responded_at = EXCLUDED.responded_at, updated_at = NOW()`,
      [sessionId, s.training_engagement_id, profileId, user.id, user.email || null, partstat, now],
    )

    return NextResponse.json({ success: true, partstat })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 400 })
  }
}
