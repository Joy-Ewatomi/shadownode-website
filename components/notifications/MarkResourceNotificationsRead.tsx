"use client"

import { useEffect, useRef } from "react"

import {
  type ClientNotificationResourceType,
  useClientNotifications,
} from "@/components/notifications/ClientNotificationProvider"

export default function MarkResourceNotificationsRead({
  resourceType,
  resourceId,
}: {
  resourceType: ClientNotificationResourceType
  resourceId: string | null | undefined
}) {
  const { markResourceRead } = useClientNotifications()
  const processedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!resourceId?.trim()) return

    const key = `${resourceType}:${resourceId}`
    if (processedRef.current === key) return

    processedRef.current = key
    void markResourceRead(resourceType, resourceId).catch(() => {
      processedRef.current = null
    })
  }, [markResourceRead, resourceId, resourceType])

  return null
}
