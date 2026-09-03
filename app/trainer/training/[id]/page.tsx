import { getCurrentUser } from "@/lib/auth"
import { ensureAccess, listModules, listSessions, listMaterials, listModuleProgress } from "@/lib/services/training-operations-service"
import ModulesManager from "@/components/training/ModulesManager"
import SessionsManager from "@/components/training/SessionsManager"
import MaterialsManager from "@/components/training/MaterialsManager"
import ProgressManager from "@/components/training/ProgressManager"
import CompleteTrainingButton from "@/components/training/CompleteTrainingButton"

export default async function TrainerTrainingPage({ params }: { params: { id: string } }) {
  const { id } = params

  const user = await getCurrentUser()

  // ensure trainer access
  await ensureAccess(id, user, true)

  const modules = await listModules(id)
  const sessions = await listSessions(id)
  const materials = await listMaterials(id)
  const progress = await listModuleProgress(id)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Trainer Workspace</h1>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
          <ModulesManager initialModules={modules} engagementId={id} userRole={user?.role || null} />
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
          <SessionsManager initialSessions={sessions} engagementId={id} userRole={user?.role || null} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
          <MaterialsManager initialMaterials={materials} engagementId={id} userRole={user?.role || null} />
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
          <ProgressManager initialProgress={progress} engagementId={id} userRole={user?.role || null} />

          <div className="mt-4">
            <CompleteTrainingButton engagementId={id} />
          </div>
        </div>
      </section>
    </div>
  )
}
