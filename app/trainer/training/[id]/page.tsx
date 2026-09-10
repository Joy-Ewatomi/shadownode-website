import { getCurrentUser } from "@/lib/auth"
import {
  ensureAccess,
  listMaterials,
  listModuleProgress,
  listModules,
  listSessions,
} from "@/lib/services/training-operations-service"
import CompleteTrainingButton from "@/components/training/CompleteTrainingButton"
import MaterialsManager from "@/components/training/MaterialsManager"
import ModulesManager from "@/components/training/ModulesManager"
import ProgressManager from "@/components/training/ProgressManager"
import SessionsManager from "@/components/training/SessionsManager"

export default async function TrainerTrainingPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params

  const user = await getCurrentUser()

  await ensureAccess(id, user, true)

  const modules = await listModules(id)
  const sessions = await listSessions(id)
  const materials = await listMaterials(id)
  const progress = await listModuleProgress(id)

  const normalizedProgress = progress.map((item) => ({
    ...item,
    id:
      "id" in item && item.id
        ? String(item.id)
        : String(
            "module_id" in item
              ? item.module_id
              : `${id}-${item.module_order}`,
          ),
  }))

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#20dc73]">
          Training Operations
        </p>

        <h1 className="mt-2 text-2xl font-semibold text-white">
          Trainer Workspace
        </h1>

        <p className="mt-1 text-sm text-white/40">
          Manage the assigned training engagement, delivery schedule,
          materials, and progress.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
          <ModulesManager
            initialModules={modules}
            engagementId={id}
          />
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
          <SessionsManager
            initialSessions={sessions}
            engagementId={id}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
          <MaterialsManager
            initialMaterials={materials}
            engagementId={id}
          />
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
          <ProgressManager
            initialProgress={normalizedProgress}
            engagementId={id}
          />

          <div className="mt-4 border-t border-white/10 pt-4">
            <CompleteTrainingButton engagementId={id} />
          </div>
        </div>
      </section>
    </div>
  )
}