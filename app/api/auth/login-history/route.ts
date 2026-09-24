import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import {
  approximateDevice,
  approximateIp,
  clampHistoryPage,
} from "@/lib/security-center"
import { NextRequest, NextResponse } from "next/server"

const PAGE_SIZE = 20

type HistoryRow = Record<string, unknown> & {
  id: string
  ip: string | null
  user_agent: string | null
  browser: string | null
  operating_system: string | null
  device: string | null
  country: string | null
  city: string | null
  success: boolean
  created_at: string
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const page = clampHistoryPage(request.nextUrl.searchParams.get("page"))
  const offset = (page - 1) * PAGE_SIZE
  const [history, count] = await Promise.all([
    query<HistoryRow>(
      `
        SELECT id, ip::text, user_agent, browser, operating_system,
               device, country, city, success, created_at
        FROM login_history
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [user.id, PAGE_SIZE, offset],
    ),
    query<{ total: string }>(
      "SELECT COUNT(*)::text AS total FROM login_history WHERE user_id = $1",
      [user.id],
    ),
  ])

  const total = Number(count.rows[0]?.total || 0)
  return NextResponse.json({
    history: history.rows.map((row) => ({
      id: row.id,
      timestamp: row.created_at,
      authenticationMethod: "Password",
      outcome: row.success ? "Successful" : "Failed",
      approximateIp: approximateIp(row.ip),
      location: [row.city, row.country].filter(Boolean).join(", ") || null,
      ...approximateDevice(row.user_agent, {
        browser: row.browser,
        operatingSystem: row.operating_system,
        device: row.device,
      }),
    })),
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    },
  }, {
    headers: { "Cache-Control": "private, no-store" },
  })
}
