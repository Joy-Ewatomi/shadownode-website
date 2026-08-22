import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

type ProfileRow = {
  full_name: string | null
  is_anonymous: boolean | null
  organization_name: string | null
}

type SessionRow = {
  id: string
  ip: string | null
  user_agent: string | null
  created_at: string
  expires_at: string
  last_activity: string
}

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const [profile, sessions] = await Promise.all([
    query<ProfileRow>(
      `
      SELECT
        up.full_name,
        up.is_anonymous,
        org.name AS organization_name
      FROM user_profiles up
      LEFT JOIN organizations org ON org.id = up.organization_id
      WHERE up.user_id = $1
      LIMIT 1
      `,
      [user.id],
    ).catch(() => ({ rows: [] as ProfileRow[] })),
    query<SessionRow>(
      `
      SELECT
        id,
        ip::text,
        user_agent,
        created_at,
        expires_at,
        last_activity
      FROM sessions
      WHERE user_id = $1
      ORDER BY last_activity DESC
      LIMIT 10
      `,
      [user.id],
    ).catch(() => ({ rows: [] as SessionRow[] })),
  ])

  const profileRow = profile.rows[0]

  return (
    <main className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">Account</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Settings</h1>
        <p className="mt-2 text-sm text-white/55">Account profile, role, authentication status, and active sessions.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info label="Username" value={user.username} />
        <Info label="Email" value={user.email} />
        <Info label="Role" value={user.role.replaceAll("_", " ")} />
        <Info label="Two-Factor" value={user.totp_enabled ? "enabled" : "disabled"} />
      </section>

      <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
        <h2 className="font-semibold text-white">Profile</h2>
        <div className="mt-4 grid gap-3 text-xs text-white/50 md:grid-cols-3">
          <Info label="Full Name" value={profileRow?.full_name || "not set"} />
          <Info label="Organization" value={profileRow?.organization_name || "not linked"} />
          <Info label="Anonymous Profile" value={profileRow?.is_anonymous ? "yes" : "no"} />
        </div>
      </section>

      <section className="rounded-md border border-[#143b28] bg-[#06110f]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#143b28] px-5 py-4">
          <h2 className="font-semibold text-white">Recent Sessions</h2>
          <span className="rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-[#20dc73]">{sessions.rows.length} records</span>
        </div>

        <div className="divide-y divide-[#143b28]">
          {!sessions.rows.length ? (
            <p className="p-5 text-sm text-white/45">No active sessions were found.</p>
          ) : null}

          {sessions.rows.map((session) => (
            <article key={session.id} className="p-5">
              <div className="grid gap-3 text-xs text-white/50 md:grid-cols-4">
                <Info label="IP" value={session.ip || "unknown"} />
                <Info label="Last Activity" value={new Date(session.last_activity).toLocaleString()} />
                <Info label="Expires" value={new Date(session.expires_at).toLocaleString()} />
                <Info label="User Agent" value={session.user_agent || "unknown"} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded border border-[#143b28] bg-black/25 p-3">
      <p className="uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className="mt-1 break-words text-white/70">{value}</p>
    </div>
  )
}
