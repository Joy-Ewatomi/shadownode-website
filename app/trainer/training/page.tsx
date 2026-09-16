import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { getUserProfileId } from "@/lib/services/training-operations-service"
import { query } from "@/lib/db"
import Link from "next/link"
import { isStaffLikeRole } from "@/lib/role-access"

type TrainerTrainingRow = {
  id: string
  engagement_number: string | null
  training_organization_name: string | null
  status: string | null
  progress: number | string | null
  created_at: string | null
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

export default async function TrainerTrainingIndexPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (!isStaffLikeRole(user.role)) {
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

  const res = await query<TrainerTrainingRow>(
    `
      SELECT
        id,
        engagement_number,
        training_organization_name,
        status,
        progress,
        created_at,
        (
          SELECT COUNT(*)::int
          FROM notifications n
          WHERE n.user_id = $2
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
        ) AS unread_notification_count,
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
              WHERE n.user_id = $2
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
      WHERE assigned_trainer = $1
      ORDER BY created_at DESC
    `,
    [profileId, user.id],
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

        {rows.map((r) => {
          const unreadCount = Number(
            r.unread_notification_count || 0,
          )
          const unreadLabels =
            normalizeUnreadLabels(
              r.unread_notification_labels,
            )

          return (
            <Link
              key={r.id}
              href={`/trainer/training/${r.id}`}
              className={[
                "block rounded-md border p-4 hover:border-[#20dc73]/30",
                unreadCount > 0
                  ? "border-[#20dc73]/40 bg-[#20dc73]/5"
                  : "border-white/10 bg-white/[0.02]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">
                    {r.engagement_number ||
                      r.training_organization_name ||
                      r.id}
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

                  <p className="text-sm text-white/60">
                    {r.training_organization_name || ""}
                  </p>
                </div>

                <div className="text-sm text-white/60">
                  <div>
                    Progress: {r.progress ?? 0}%
                  </div>
                  <div className="mt-1">
                    {r.status || "unknown"}
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
