import { notFound, redirect } from "next/navigation"

import TrainingShell from "@/components/training/TrainingShell"
import TrainingUpdates from "@/components/training/TrainingUpdates"

import { getCurrentUser } from "@/lib/auth"
import {
  ensureAccess,
  isApprovedTrainerForEngagement,
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

export default async function UpdatesPage({
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
     * Viewing training updates only requires access
     * to the engagement.
     *
     * Posting an update is authorized separately.
     */
    access = await ensureAccess(
      id,
      user,
      false,
    )
  } catch {
    return notFound()
  }

  const engRes = await query(
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

    const res = await query<{
    id: string
    updated_by: string | null
    update_type: string | null
    title: string | null
    content: string | null
    created_at: string | Date | null
  }>(
    `
      SELECT
        id,
        updated_by,
        update_type,
        title,
        content,
        created_at
      FROM training_updates
      WHERE training_engagement_id = $1
      ORDER BY created_at DESC
    `,
    [id],
  )

  const updates = res.rows.map((u) => ({
    ...u,
    created_at: u.created_at
      ? String(u.created_at)
      : null,
  }))
  /*
   * Determine who may POST training updates.
   *
   * Super Administrator:
   *   Always allowed.
   *
   * Everyone else:
   *   Must be the approved trainer for this
   *   specific training engagement.
   */
  let canPostUpdate = false

  if (isSuperAdminRole(user.role)) {
    canPostUpdate = true
  } else {
    canPostUpdate =
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
      title="Updates"
      status={String(
        engagement.status || "unknown",
      )}
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-[#143b28] bg-[#04100b]/60 p-6">
          <TrainingUpdates
            initialUpdates={updates}
            engagementId={id}
            canPostUpdate={canPostUpdate}
          />
        </section>
      </div>
    </TrainingShell>
  )
}