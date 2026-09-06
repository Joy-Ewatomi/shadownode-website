import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { ensureAccess } from "@/lib/services/training-operations-service"
import { query } from "@/lib/db"

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  try {
    const { id } = await context.params
    await ensureAccess(id, user, false)

    // Use actual schema columns: client_profile_id and feedback (text)
    const res = await query(`SELECT id, client_profile_id, rating, feedback AS comments, created_at FROM training_feedback WHERE training_engagement_id = $1 ORDER BY created_at DESC`, [id])
    return NextResponse.json({ success: true, feedback: res.rows })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 403 })
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  try {
    const { id } = await context.params
    const access = await ensureAccess(id, user, false)

    // Only clients can submit feedback (for now)
    if (!user || user.role !== 'client') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    if (!body.rating) return NextResponse.json({ error: 'rating is required' }, { status: 400 })

    // Insert using existing schema: client_profile_id and feedback
    const res = await query(`INSERT INTO training_feedback (training_engagement_id, client_profile_id, rating, feedback, created_at, updated_at) VALUES ($1,$2,$3,$4,NOW(),NOW()) RETURNING id, client_profile_id, rating, feedback AS comments, created_at`, [id, access.profileId, body.rating, body.comments || null])

    return NextResponse.json({ success: true, feedback: res.rows[0] })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 400 })
  }
}
