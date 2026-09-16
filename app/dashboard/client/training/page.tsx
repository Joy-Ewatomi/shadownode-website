import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { getUserProfileId } from "@/lib/services/training-operations-service"
import { query } from "@/lib/db"
import TrainingNotificationList from "./TrainingNotificationList"

type ClientTrainingRow = {
  id: string
  engagement_number: string | null
  training_organization_name: string | null
  status: string | null
  progress: number | string | null
  created_at: string | null
}

export default async function ClientTrainingIndexPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (user.role !== "client") {
    redirect("/dashboard")
  }

  const profileId = await getUserProfileId(user.id)

  if (!profileId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-white">My Trainings</h1>
        <p className="mt-4 text-sm text-white/60">No client profile found for your account.</p>
      </div>
    )
  }

  const res = await query<ClientTrainingRow>(
    `SELECT id, engagement_number, training_organization_name, status, progress, created_at FROM training_engagements WHERE client_profile_id = $1 ORDER BY created_at DESC`,
    [profileId],
  )

  const rows = res.rows

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white">My Trainings</h1>
        <p className="mt-2 text-sm text-white/60">Training engagements associated with your account.</p>
      </header>

      <TrainingNotificationList rows={rows} />
    </div>
  )
}
