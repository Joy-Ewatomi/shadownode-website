import { NextResponse } from "next/server"

import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"
import { maskWhatsAppNumber } from "@/lib/communication-channels"
import { createWaMeUrl } from "@/lib/services/whatsapp-delivery-provider"

export const dynamic = "force-dynamic"
export const revalidate = 0
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, private" }

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE })
  if (!isAdminRole(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE })

  const result = await query<{
    id: string; event_type: string; destination: string; prepared_message: string
    resource_type: string | null; resource_id: string | null; status: string; attempted_at: string
    full_name: string | null
  }>(
    `SELECT nda.id, nda.event_type, nda.destination, nda.prepared_message,
            nda.resource_type, nda.resource_id, nda.status, nda.attempted_at, up.full_name
     FROM notification_delivery_attempts nda
     JOIN user_profiles up ON up.user_id = nda.user_id
     WHERE nda.channel = 'whatsapp' AND nda.status IN ('pending', 'ready')
     ORDER BY nda.attempted_at ASC LIMIT 100`,
  )

  return NextResponse.json({
    deliveries: result.rows.map((row) => ({
      id: row.id,
      clientName: row.full_name || "Client",
      maskedNumber: maskWhatsAppNumber(row.destination),
      eventType: row.event_type,
      reference: row.resource_type && row.resource_id ? `${row.resource_type}: ${row.resource_id}` : null,
      message: row.prepared_message,
      createdAt: row.attempted_at,
      status: row.status,
      openUrl: row.status === "ready" && row.prepared_message
        ? createWaMeUrl(row.destination, row.prepared_message)
        : null,
    })),
  }, { headers: NO_STORE })
}
