import { getCurrentUser } from "@/lib/auth"
import { listSessions, getUserProfileId } from "@/lib/services/training-operations-service"
import SessionsManager from "@/components/training/SessionsManager"

export default async function TrainingSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await getCurrentUser()
  const profileId = user ? await getUserProfileId(user.id) : null

  const sessions = await listSessions(id)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-white/40">Training</p>

        <h1 className="mt-2 text-2xl font-semibold text-white">Schedule</h1>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6 text-white/60">
        <SessionsManager initialSessions={sessions} engagementId={id} userRole={user?.role || null} currentUserId={user?.id || null} currentProfileId={profileId} />
      </div>
    </div>
  )
}
