import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { ensureAccess } from "@/lib/services/training-operations-service"
import { generateICS } from "@/lib/utils/ics"

export async function GET(req: Request, context: { params: Promise<{ sessionId: string }> }) {
  const user = await getCurrentUser()

  try {
    const { sessionId } = await context.params

    // load session and engagement id
    const res = await query(`SELECT ts.*, te.client_profile_id FROM training_sessions ts JOIN training_engagements te ON te.id = ts.training_engagement_id WHERE ts.id = $1 LIMIT 1`, [sessionId])
    const row: any = res.rows[0]
    if (!row) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const engagementId = String(row.training_engagement_id)

    // ensure access (allow trainer)
    await ensureAccess(engagementId, user, true)

    // build ICS
    const start = row.scheduled_at || null
    let end: string | null = null
    if (row.duration_minutes && start) {
      end = new Date(new Date(start).getTime() + Number(row.duration_minutes) * 60000).toISOString()
    }

    const title = String(row.session_notes || row.session_type || 'Training Session')
    const descriptionParts: string[] = []
    if (row.session_notes) descriptionParts.push(String(row.session_notes))
    if (row.meeting_url) descriptionParts.push(`Meeting: ${String(row.meeting_url)}`)
    if (row.location) descriptionParts.push(`Location: ${String(row.location)}`)

    const ics = generateICS({
      uid: `training-session-${String(row.id)}`,
      title,
      description: descriptionParts.join('\n'),
      start,
      end,
      url: row.meeting_url ? String(row.meeting_url) : null,
      location: row.location ? String(row.location) : null,
    })

    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="training-session-${row.id}.ics"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 403 })
  }
}
