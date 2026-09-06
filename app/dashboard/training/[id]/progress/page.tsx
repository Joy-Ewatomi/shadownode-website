import { notFound, redirect } from "next/navigation"

import TrainingShell from "@/components/training/TrainingShell"
import ProgressManager from "@/components/training/ProgressManager"

import { getCurrentUser } from "@/lib/auth"
import {
  ensureAccess,
  isApprovedTrainerForEngagement,
  listModuleProgress,
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

export default async function ProgressPage({
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

  const rawProgress = await listModuleProgress(
    id,
    access.profileId || undefined,
  )

  const progress = (rawProgress || []).map(
    (item: any) => ({
      ...item,
      created_at: item.created_at
        ? String(item.created_at)
        : null,
      updated_at: item.updated_at
        ? String(item.updated_at)
        : null,
    }),
  )

  /*
   * Progress management is engagement-specific.
   *
   * Super Administrator:
   *   Always allowed.
   *
   * Approved trainer:
   *   Allowed only when this user is the
   *   approved trainer for this engagement.
   *
   * Administrator who is not an approved trainer:
   *   View only.
   *
   * Investigator/Analyst who is not assigned:
   *   View only.
   *
   * Client:
   *   View only.
   */
  let canManageProgress = false

  if (isSuperAdminRole(user.role)) {
    canManageProgress = true
  } else {
    canManageProgress =
      await isApprovedTrainerForEngagement(
        id,
        user,
        access.profileId,
      )
  }

  return (
    <TrainingShell
      user={user}
      engagementId={id}
      engagementNumber={String(
        engagement.engagement_number || id,
      )}
      title="Progress"
      status={String(
        engagement.status || "unknown",
      )}
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-[#143b28] bg-[#04100b]/60 p-6">
          <ProgressManager
            initialProgress={progress}
            engagementId={id}
            canManageProgress={
              canManageProgress
            }
          />
        </section>
      </div>
    </TrainingShell>
  )
}