import { getCurrentSessionHash, getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { approximateDevice, approximateIp } from "@/lib/security-center"
import { NextResponse } from "next/server"

type SessionRow = Record<string, unknown> & {
  id: string
  ip: string | null
  user_agent: string | null
  created_at: string
  expires_at: string
  last_activity: string
  is_current: boolean
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const currentHash = await getCurrentSessionHash()
  const { rows } = await query<SessionRow>(
    `
      SELECT id, ip::text, user_agent, created_at, expires_at, last_activity,
             token = $2 AS is_current
      FROM sessions
      WHERE user_id = $1 AND expires_at > now()
      ORDER BY last_activity DESC
    `,
    [user.id, currentHash],
  )

  return NextResponse.json({
    sessions: rows.map((session) => ({
      id: session.id,
      createdAt: session.created_at,
      expiresAt: session.expires_at,
      lastActivity: session.last_activity,
      current: Boolean(session.is_current),
      approximateIp: approximateIp(session.ip),
      ...approximateDevice(session.user_agent),
    })),
    individualRevocationSupported: false,
  }, {
    headers: { "Cache-Control": "private, no-store" },
  })
}
