import { getCurrentUser } from "@/lib/auth"
import { listModuleProgress } from "@/lib/services/training-operations-service"
import ProgressManager from "@/components/training/ProgressManager"

export default async function TrainingProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await getCurrentUser()

  const profileId = null // server could determine client profile if needed

  const progress = await listModuleProgress(id, profileId || undefined)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-white/40">Training</p>

        <h1 className="mt-2 text-2xl font-semibold text-white">Progress</h1>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6 text-white/60">
        <ProgressManager initialProgress={progress} engagementId={id} userRole={user?.role || null} />
      </div>
    </div>
  )
}
