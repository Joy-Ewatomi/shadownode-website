import { redirect } from "next/navigation"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

type AuditRow = {
  id: string
  username: string | null
  email: string | null
  role: string | null
  action: string
  ip: string | null
  user_agent: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export default async function AuditLogsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (!isAdminRole(user.role)) {
    redirect("/403")
  }

  const { rows } = await query<AuditRow>(
    `
    SELECT
      al.id,
      au.username,
      au.email,
      au.role,
      al.action,
      al.ip::text,
      al.user_agent,
      al.metadata,
      al.created_at
    FROM audit_logs al
    LEFT JOIN app_users au ON au.id = al.user_id
    ORDER BY al.created_at DESC
    LIMIT 200
    `,
  )

  return (
    <main className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">Security</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Audit Logs</h1>
        <p className="mt-2 text-sm text-white/55">Recent authenticated operational events and security actions.</p>
      </header>

      <section className="rounded-md border border-[#143b28] bg-[#06110f]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#143b28] px-5 py-4">
          <h2 className="font-semibold text-white">Recent Events</h2>
          <span className="rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-[#20dc73]">{rows.length} records</span>
        </div>

        <div className="divide-y divide-[#143b28]">
          {!rows.length ? (
            <p className="p-5 text-sm text-white/45">No audit events have been recorded.</p>
          ) : null}

          {rows.map((item) => (
            <article key={item.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words font-semibold text-white">{item.action}</h3>
                  <p className="mt-1 break-words text-sm text-white/50">
                    {item.username || item.email || "System"} {item.role ? `(${item.role.replaceAll("_", " ")})` : ""}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-white/40">{new Date(item.created_at).toLocaleString()}</time>
              </div>

              <div className="mt-4 grid gap-3 text-xs text-white/50 md:grid-cols-3">
                <Info label="IP" value={item.ip || "unknown"} />
                <Info label="User Agent" value={item.user_agent || "unknown"} />
                <Info label="Metadata" value={JSON.stringify(item.metadata || {})} mono />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

function Info({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="min-w-0 rounded border border-[#143b28] bg-black/25 p-3">
      <p className="uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className={`mt-1 break-all text-white/70 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  )
}
