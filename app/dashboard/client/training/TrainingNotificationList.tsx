"use client"

import Link from "next/link"

import {
  type ClientNotification,
  useClientNotifications,
} from "@/components/notifications/ClientNotificationProvider"

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function trainingIdForNotification(
  notification: ClientNotification,
) {
  const metadata = notification.metadata || {}
  const resourceType =
    asString(metadata.resource_type) ||
    asString(metadata.resourceType)
  const resourceId =
    asString(metadata.resource_id) ||
    asString(metadata.resourceId)

  return (
    asString(metadata.training_engagement_id) ||
    asString(metadata.training_id) ||
    asString(metadata.trainingId) ||
    (resourceType === "training" ? resourceId : "")
  )
}

function trainingNotificationLabel(
  notification: ClientNotification,
) {
  const metadata = notification.metadata || {}
  const type = notification.type.toLowerCase()
  const targetPage =
    asString(metadata.target_page) ||
    asString(metadata.targetPage)
  const title = notification.title.toLowerCase()
  const source = `${type} ${targetPage} ${title}`

  if (source.includes("schedule") || source.includes("session")) {
    return "Schedule"
  }

  if (source.includes("material")) {
    return "Materials"
  }

  if (source.includes("assessment")) {
    return "Assessment"
  }

  if (source.includes("certificate")) {
    return "Certificate"
  }

  if (source.includes("plan")) {
    return "Plan"
  }

  if (source.includes("progress") || source.includes("completion")) {
    return "Progress"
  }

  return "Training"
}

export default function TrainingNotificationList({
  rows,
}: {
  rows: Array<{
    id: string
    engagement_number?: string | null
    training_organization_name?: string | null
    status?: string | null
    progress?: number | string | null
  }>
}) {
  const { getUnreadForResource, notifications } =
    useClientNotifications()

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <div className="rounded-md border border-white/10 bg-[#020806]/90 p-4 text-sm text-white/60">
          No trainings found.
        </div>
      )}

      {rows.map((r) => {
        const trainingUnread = getUnreadForResource("training", r.id)
        const certificateUnread = getUnreadForResource("certificate", r.id)
        const unread = trainingUnread + certificateUnread
        const unreadLabels = Array.from(
          new Set(
            notifications
              .filter(
                (notification) =>
                  !notification.read &&
                  trainingIdForNotification(notification) === r.id,
              )
              .map(trainingNotificationLabel),
          ),
        )

        return (
          <Link
            key={r.id}
            href={`/dashboard/training/${r.id}`}
            className={`block rounded-md border bg-[#020806]/150 p-4 hover:border-[#20dc73]/30 ${
              unread > 0
                ? "border-[#20dc73]/40 bg-[#20dc73]/5"
                : "border-white/10"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">
                    {r.engagement_number ||
                      r.training_organization_name ||
                      r.id}
                  </p>
                  {unread > 0 && (
                    <span className="inline-flex items-center gap-1 rounded border border-[#20dc73]/40 bg-[#20dc73]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#20dc73]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#20dc73]" />
                      NEW{unread > 1 ? ` ${unread}` : ""}
                    </span>
                  )}
                </div>
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

              <div className="shrink-0 text-sm text-white/60">
                <div>Progress: {r.progress ?? 0}%</div>
                <div className="mt-1">{r.status || "unknown"}</div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
