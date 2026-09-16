import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { hasPermission } from "@/lib/permission"
import { getUserProfileId } from "@/lib/services/training-operations-service"
import { query } from "@/lib/db"
import TrainingNotificationList from "@/app/dashboard/client/training/TrainingNotificationList"
import { isStaffLikeRole } from "@/lib/role-access"

import Link from "next/link"

type TrainingRow = {
  id: string
  engagement_number: string | null
  training_organization_name: string | null
  status: string | null
  payment_status: string | null
  progress: number | string | null
  created_at: string | null
}

type AdminTrainingRow = TrainingRow & {
  unread_notification_count: number
  unread_notification_labels: string[] | null
}

function normalizeUnreadLabels(
  value: string[] | string | null | undefined,
) {
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()]
  }

  return []
}

export default async function TrainingPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  /*
   * ============================================================
   * CLIENT TRAINING AREA
   * ============================================================
   */

  if (user.role === "client") {
    const profileId =
      await getUserProfileId(user.id)

    if (!profileId) {
      return (
        <div className="space-y-4 p-6">
          <header>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#20dc73]/60">
              Training
            </p>

            <h1 className="mt-2 text-2xl font-semibold text-white">
              My Trainings
            </h1>
          </header>

          <div className="rounded-xl border border-[#143b28] bg-[#04100b]/60 p-5">
            <p className="text-sm text-white/60">
              No client profile was found
              for your account.
            </p>
          </div>
        </div>
      )
    }

    const result =
      await query<TrainingRow>(
        `
          SELECT
            id,
            engagement_number,
            training_organization_name,
            status,
            payment_status,
            progress,
            created_at
          FROM training_engagements
          WHERE client_profile_id = $1
          ORDER BY created_at DESC
        `,
        [profileId],
      )

    const rows = result.rows

    return (
      <div className="space-y-6 p-6">
        <header>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#20dc73]/60">
            Training Bureau
          </p>

          <h1 className="mt-2 text-2xl font-semibold text-white">
            My Trainings
          </h1>

          <p className="mt-2 text-sm text-white/60">
            Training engagements associated
            with your account.
          </p>
        </header>

        <TrainingNotificationList rows={rows} />
      </div>
    )
  }

  /*
   * ============================================================
   * TRAINERS
   * ============================================================
   */

  if (isStaffLikeRole(user.role)) {
    redirect("/trainer/training")
  }

  /*
   * ============================================================
   * ADMINISTRATIVE TRAINING AREA
   * ============================================================
   */

  if (
    !hasPermission(
      user,
      "training:view",
    )
  ) {
    redirect("/dashboard")
  }

  const result =
    await query<AdminTrainingRow>(
      `
        SELECT
          id,
          engagement_number,
          training_organization_name,
          status,
          payment_status,
          progress,
          created_at,
          (
            SELECT COUNT(*)::int
            FROM notifications n
            WHERE n.user_id = $1
              AND n.is_read = false
              AND (
                n.metadata->>'training_engagement_id' = training_engagements.id::text
                OR n.metadata->>'training_id' = training_engagements.id::text
                OR n.metadata->>'trainingId' = training_engagements.id::text
                OR (
                  COALESCE(n.metadata->>'resource_type', n.metadata->>'resourceType') = 'training'
                  AND COALESCE(n.metadata->>'resource_id', n.metadata->>'resourceId') = training_engagements.id::text
                )
              )
          ) AS unread_notification_count
          ,
          COALESCE(
            (
              SELECT ARRAY_AGG(DISTINCT label)
              FROM (
                SELECT
                  CASE
                    WHEN LOWER(CONCAT_WS(' ', n.type, n.title, n.metadata->>'target_page', n.metadata->>'targetPage')) LIKE '%schedule%'
                      OR LOWER(CONCAT_WS(' ', n.type, n.title, n.metadata->>'target_page', n.metadata->>'targetPage')) LIKE '%session%'
                      THEN 'Schedule'
                    WHEN LOWER(CONCAT_WS(' ', n.type, n.title, n.metadata->>'target_page', n.metadata->>'targetPage')) LIKE '%material%'
                      THEN 'Materials'
                    WHEN LOWER(CONCAT_WS(' ', n.type, n.title, n.metadata->>'target_page', n.metadata->>'targetPage')) LIKE '%assessment%'
                      THEN 'Assessment'
                    WHEN LOWER(CONCAT_WS(' ', n.type, n.title, n.metadata->>'target_page', n.metadata->>'targetPage')) LIKE '%certificate%'
                      THEN 'Certificate'
                    WHEN LOWER(CONCAT_WS(' ', n.type, n.title, n.metadata->>'target_page', n.metadata->>'targetPage')) LIKE '%plan%'
                      THEN 'Plan'
                    WHEN LOWER(CONCAT_WS(' ', n.type, n.title, n.metadata->>'target_page', n.metadata->>'targetPage')) LIKE '%progress%'
                      OR LOWER(CONCAT_WS(' ', n.type, n.title, n.metadata->>'target_page', n.metadata->>'targetPage')) LIKE '%completion%'
                      THEN 'Progress'
                    ELSE 'Training'
                  END AS label
                FROM notifications n
                WHERE n.user_id = $1
                  AND n.is_read = false
                  AND (
                    n.metadata->>'training_engagement_id' = training_engagements.id::text
                    OR n.metadata->>'training_id' = training_engagements.id::text
                    OR n.metadata->>'trainingId' = training_engagements.id::text
                    OR (
                      COALESCE(n.metadata->>'resource_type', n.metadata->>'resourceType') = 'training'
                      AND COALESCE(n.metadata->>'resource_id', n.metadata->>'resourceId') = training_engagements.id::text
                    )
                  )
              ) unread_training_labels
            ),
            ARRAY[]::text[]
          ) AS unread_notification_labels
        FROM training_engagements
        ORDER BY created_at DESC
      `,
      [user.id],
    )

  const rows = result.rows

  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#20dc73]/60">
          Training Bureau
        </p>

        <h1 className="mt-2 text-2xl font-semibold text-white">
          Training Engagements
        </h1>

        <p className="mt-2 text-sm text-white/60">
          All training engagements.
        </p>
      </header>

      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-[#020806]/150 p-5">
            <p className="text-sm text-white/60">
              No training engagements found.
            </p>
          </div>
        )}

        {rows.map((training) => {
          const unreadCount = Number(
            training.unread_notification_count || 0,
          )
          const unreadLabels =
            normalizeUnreadLabels(
              training.unread_notification_labels,
            )

          return (
            <Link
              key={training.id}
              href={`/dashboard/training/${training.id}`}
              className={[
                "block rounded-xl border p-5 transition hover:border-[#20dc73]/30 hover:bg-[#20dc73]/5",
                unreadCount > 0
                  ? "border-[#20dc73]/40 bg-[#20dc73]/5"
                  : "border-[#143b28] bg-[#020806]/150",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">
                    {training.engagement_number ||
                      training.training_organization_name ||
                      training.id}
                  </p>

                  {unreadCount > 0 ? (
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded border border-[#20dc73]/40 bg-[#20dc73]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#20dc73]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#20dc73]" />
                      NEW
                      {unreadCount > 1
                        ? ` ${unreadCount}`
                        : ""}
                    </span>
                  ) : null}

                  {unreadLabels.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {unreadLabels.map((label) => (
                        <span
                          key={label}
                          className="rounded border border-[#20dc73]/25 bg-[#20dc73]/5 px-2 py-0.5 text-[10px] font-medium text-[#20dc73]"
                        >
                          {label} unread
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <p className="mt-1 text-sm text-white/60">
                    {training.training_organization_name ||
                      ""}
                  </p>
                </div>

                <div className="text-right text-sm text-white/60">
                  <div>
                    Progress:{" "}
                    {training.progress ?? 0}%
                  </div>

                  <div className="mt-1">
                    {training.status ||
                      "unknown"}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
