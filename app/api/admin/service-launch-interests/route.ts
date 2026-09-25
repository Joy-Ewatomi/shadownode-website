import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { isAdminLikeRole } from "@/lib/role-access"
import {
  SERVICE_LAUNCH_NAMES,
  isServiceLaunchKey,
  isServiceLaunchStatus,
} from "@/lib/service-launch-interests"

export const dynamic = "force-dynamic"

const NO_STORE = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}
const PAGE_SIZE = 25

type Filters = { page?: unknown; service?: unknown; status?: unknown; search?: unknown }

function safePage(value: unknown) {
  const page = Number.parseInt(typeof value === "string" ? value : "1", 10)
  return Number.isFinite(page) && page > 0 ? Math.min(page, 100000) : 1
}

function migrationMissing(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "42P01"
}

async function respond(filters: Filters) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE })
  if (!isAdminLikeRole(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE })

  const page = safePage(filters.page)
  if (typeof filters.service === "string" && filters.service && !isServiceLaunchKey(filters.service)) {
    return NextResponse.json({ error: "Invalid service filter." }, { status: 400, headers: NO_STORE })
  }
  if (typeof filters.status === "string" && filters.status && !isServiceLaunchStatus(filters.status)) {
    return NextResponse.json({ error: "Invalid status filter." }, { status: 400, headers: NO_STORE })
  }
  const service = isServiceLaunchKey(filters.service) ? filters.service : null
  const status = isServiceLaunchStatus(filters.status) ? filters.status : null
  const search = typeof filters.search === "string" ? filters.search.trim().toLowerCase().slice(0, 254) : ""

  const clauses: string[] = []
  const values: unknown[] = []
  if (service) { values.push(service); clauses.push(`sli.service_key = $${values.length}`) }
  if (status) { values.push(status); clauses.push(`sli.status = $${values.length}`) }
  if (search) { values.push(`%${search.replace(/[\\%_]/g, "\\$&")}%`); clauses.push(`sli.email_normalized ILIKE $${values.length} ESCAPE '\\'`) }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""
  values.push(PAGE_SIZE, (page - 1) * PAGE_SIZE)

  try {
    const [records, totals, services] = await Promise.all([
      query<{
        id: string; service_key: keyof typeof SERVICE_LAUNCH_NAMES; email_normalized: string
        consent_at: string; source: string; status: string; notified_at: string | null
        unsubscribed_at: string | null; has_account: boolean; total_count: string
      }>(
        `SELECT sli.id, sli.service_key, sli.email_normalized, sli.consent_at,
                sli.source, sli.status, sli.notified_at, sli.unsubscribed_at,
                (sli.user_id IS NOT NULL) AS has_account,
                COUNT(*) OVER()::text AS total_count
         FROM service_launch_interests sli ${where}
         ORDER BY sli.consent_at DESC, sli.id DESC
         LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      ),
      query<{ active: string; notified: string; unsubscribed: string; represented_services: string }>(
        `SELECT COUNT(*) FILTER (WHERE status='active')::text AS active,
                COUNT(*) FILTER (WHERE status='notified')::text AS notified,
                COUNT(*) FILTER (WHERE status='unsubscribed')::text AS unsubscribed,
                COUNT(DISTINCT service_key)::text AS represented_services
         FROM service_launch_interests`,
      ),
      query<{ service_key: keyof typeof SERVICE_LAUNCH_NAMES; active_count: string }>(
        `SELECT service_key, COUNT(*)::text AS active_count
         FROM service_launch_interests WHERE status='active'
         GROUP BY service_key ORDER BY service_key`,
      ),
    ])

    const total = Number(records.rows[0]?.total_count || 0)
    return NextResponse.json({
      records: records.rows.map((row) => ({
        id: row.id,
        service_key: row.service_key,
        service_name: SERVICE_LAUNCH_NAMES[row.service_key],
        email: row.email_normalized,
        consent_at: row.consent_at,
        source: row.source,
        status: row.status,
        notified_at: row.notified_at,
        unsubscribed_at: row.unsubscribed_at,
        has_account: row.has_account,
      })),
      page,
      page_size: PAGE_SIZE,
      total,
      total_pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      summary: {
        active: Number(totals.rows[0]?.active || 0),
        notified: Number(totals.rows[0]?.notified || 0),
        unsubscribed: Number(totals.rows[0]?.unsubscribed || 0),
        represented_services: Number(totals.rows[0]?.represented_services || 0),
        active_by_service: services.rows.map((row) => ({ service_key: row.service_key, service_name: SERVICE_LAUNCH_NAMES[row.service_key], count: Number(row.active_count) })),
      },
    }, { headers: NO_STORE })
  } catch (error) {
    if (migrationMissing(error)) {
      return NextResponse.json({ error: "Service launch interests are not available yet.", code: "MIGRATION_UNAVAILABLE" }, { status: 503, headers: NO_STORE })
    }
    return NextResponse.json({ error: "Service launch interests could not be loaded." }, { status: 500, headers: NO_STORE })
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  return respond({ page: params.get("page"), service: params.get("service"), status: params.get("status") })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Filters | null
  return respond(body || {})
}
