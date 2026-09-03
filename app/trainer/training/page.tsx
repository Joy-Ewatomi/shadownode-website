import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { getUserProfileId } from "@/lib/services/training-operations-service"
import { query } from "@/lib/db"
import Link from "next/link"

export default async function TrainerTrainingIndexPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (!(user.role === "investigator" || user.role === "analyst")) {
    redirect("/dashboard")
  }

  const profileId = await getUserProfileId(user.id)

  if (!profileId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-white">My Trainings</h1>
        <p className="mt-4 text-sm text-white/60">No trainer profile found for your account.</p>
      </div>
    )
  }

  const res = await query(
    `SELECT id, engagement_number, training_organization_name, status, progress, created_at FROM training_engagements WHERE assigned_trainer = $1 ORDER BY created_at DESC`,
    [profileId],
  )

  const rows = res.rows

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white">My Trainings</h1>
        <p className="mt-2 text-sm text-white/60">Training engagements assigned to you.</p>
      </header>

      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="rounded-md border border-white/10 bg-white/[0.02] p-4 text-sm text-white/60">No trainings assigned.</div>
        )}

        {rows.map((r: any) => (
          <Link key={r.id} href={`/trainer/training/${r.id}`} className="block rounded-md border border-white/10 bg-white/[0.02] p-4 hover:border-[#20dc73]/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{r.engagement_number || r.training_organization_name || r.id}</p>
                <p className="text-sm text-white/60">{r.training_organization_name || ""}</p>
              </div>

              <div className="text-sm text-white/60">
                <div>Progress: {r.progress ?? 0}%</div>
                <div className="mt-1">{r.status || "unknown"}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
