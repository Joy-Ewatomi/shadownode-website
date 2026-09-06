import { notFound, redirect } from "next/navigation"

import TrainingShell from "@/components/training/TrainingShell"
import ModulesManager from "@/components/training/ModulesManager"

import { getCurrentUser } from "@/lib/auth"
import {
  ensureAccess,
  isApprovedTrainerForEngagement,
  listModules,
} from "@/lib/services/training-operations-service"
import { query } from "@/lib/db"

function isSuperAdminRole(
  role: string | null | undefined,
) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const user = await getCurrentUser()

  if (!user) {
    return redirect("/login")
  }

  let access

  try {
    /*
     * Everyone who can see the training plan must first
     * pass engagement-level access control.
     *
     * This is NOT trainer permission.
     */
    access = await ensureAccess(
      id,
      user,
      false,
    )
  } catch {
    return notFound()
  }

  const engRes = await query<{
    id: string
    engagement_number: string | null
    status: string | null
    training_goal: string | null
  }>(
    `
      SELECT
        id,
        engagement_number,
        status,
        training_goal
      FROM training_engagements
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  )

  const engagement = engRes.rows[0]

  if (!engagement) {
    return notFound()
  }

  /*
   * Determine who can actually manage the training plan.
   *
   * Super Admin:
   *   Always allowed.
   *
   * Everyone else:
   *   Must be the approved trainer for THIS engagement.
   *
   * This means an Administrator does NOT gain trainer
   * privileges merely because their account role is
   * "administrator".
   */
  let canManageModules = false

  if (isSuperAdminRole(user.role)) {
    canManageModules = true
  } else {
    canManageModules =
      await isApprovedTrainerForEngagement(
        id,
        user,
        access.profileId,
      )
  }

  const rawModules = await listModules(id)

  const modules = (rawModules || []).map(
    (module: any) => ({
      ...module,

      created_at: module.created_at
        ? String(module.created_at)
        : null,

      updated_at: module.updated_at
        ? String(module.updated_at)
        : null,
    }),
  )

return (
  <TrainingShell
    user={user}
    engagementId={id}
    engagementNumber={String(
      engagement.engagement_number || id,
    )}
    title="Curriculum Roadmap"
    status={String(
      engagement.status || "unknown",
    )}
  >
    <div className="space-y-6">
      <section>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#20dc73]/60">
          Curriculum
        </p>

        <h1 className="mt-2 text-2xl font-semibold text-white">
          Curriculum Roadmap
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
          Define the learning path for this training
          engagement. Organize modules, learning
          objectives, practical work, and completion
          milestones in the order they will be delivered.
        </p>
      </section>

      <section className="rounded-xl border border-[#143b28] bg-[#04100b]/60 p-6">
        <ModulesManager
          initialModules={modules}
          engagementId={id}
          canManageModules={canManageModules}
        />
      </section>
    </div>
  </TrainingShell>
)
}