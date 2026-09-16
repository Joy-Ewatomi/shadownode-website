"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

export type ClientNotificationResourceType =
  | "request"
  | "case"
  | "message"
  | "conversation"
  | "assignment"
  | "report"
  | "training"
  | "certificate"
  | "payment"

export type ClientNotification = {
  id: string
  title: string
  message: string | null
  type: string
  read: boolean
  created_at: string
  case_id: string | null
  metadata?: Record<string, unknown> | null
  recipient_id?: string | null
  recipient_role?: string | null
}

type ClientNotificationCategory =
  | "requests"
  | "cases"
  | "messages"
  | "reports"
  | "training"
  | "certificates"
  | "payments"
  | "system"

type ClientNotificationContextValue = {
  notifications: ClientNotification[]
  unreadCount: number
  unreadByCategory: Record<string, number>
  unreadByResource: Record<string, number>
  loading: boolean
  refreshNotifications: () => Promise<void>
  markRead: (notificationId: string) => Promise<boolean>
  markResourceRead: (
    resourceType: ClientNotificationResourceType,
    resourceId: string,
  ) => Promise<number>
  getUnreadForResource: (
    resourceType: ClientNotificationResourceType,
    resourceId: string | null | undefined,
  ) => number
}

const ClientNotificationContext =
  createContext<ClientNotificationContextValue | null>(null)

function asString(value: unknown) {
  if (typeof value === "string") return value.trim() || null
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

function metadataOf(notification: ClientNotification) {
  return notification.metadata || {}
}

function metadataStringArray(
  metadata: Record<string, unknown>,
  key: string,
) {
  const value = metadata[key]

  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item))
}

export function getClientNotificationResource(
  notification: ClientNotification,
): {
  type: ClientNotificationResourceType | "system"
  id: string | null
} {
  const metadata = metadataOf(notification)
  const type = String(notification.type || "").toLowerCase()

  const explicitType =
    asString(metadata.resource_type) ||
    asString(metadata.resourceType)

  const explicitId =
    asString(metadata.resource_id) ||
    asString(metadata.resourceId)

  if (explicitType && explicitId) {
    return {
      type: explicitType as ClientNotificationResourceType,
      id: explicitId,
    }
  }

  const requestId =
    asString(metadata.request_id) ||
    asString(metadata.requestId)
  if (
    requestId ||
    type.startsWith("request_") ||
    type.startsWith("quote_") ||
    type.startsWith("negotiation_")
  ) {
    return {
      type: "request",
      id: requestId,
    }
  }

  const conversationId =
    asString(metadata.conversation_id) ||
    asString(metadata.conversationId)
  if (
    conversationId ||
    type === "new_case_message" ||
    type === "new_message"
  ) {
    return {
      type: "conversation",
      id: conversationId,
    }
  }

  const reportId =
    asString(metadata.report_id) ||
    asString(metadata.reportId)
  if (reportId || type.startsWith("report_")) {
    return {
      type: "report",
      id: reportId,
    }
  }

  const certificateId =
    asString(metadata.certificate_id) ||
    asString(metadata.certificateId)
  if (certificateId || type.startsWith("certificate_")) {
    return {
      type: "certificate",
      id: certificateId,
    }
  }

  const trainingId =
    asString(metadata.training_engagement_id) ||
    asString(metadata.training_id) ||
    asString(metadata.trainingId)
  if (trainingId || type.startsWith("training_")) {
    return {
      type: "training",
      id: trainingId,
    }
  }

  const caseId =
    asString(metadata.case_id) ||
    asString(metadata.caseId) ||
    notification.case_id
  if (
    caseId ||
    type.startsWith("case_") ||
    type === "payment_confirmed"
  ) {
    return {
      type: "case",
      id: caseId,
    }
  }

  if (type.startsWith("payment_")) {
    return {
      type: "payment",
      id:
        asString(metadata.payment_id) ||
        asString(metadata.paymentId) ||
        null,
    }
  }

  return { type: "system", id: null }
}

function getClientNotificationCategory(
  notification: ClientNotification,
): ClientNotificationCategory {
  const type = String(notification.type || "").toLowerCase()

  if (type.includes("message")) return "messages"

  const resource = getClientNotificationResource(notification)

  if (resource.type === "request") return "requests"
  if (resource.type === "conversation" || resource.type === "message") {
    return "messages"
  }
  if (resource.type === "assignment") return "cases"
  if (resource.type === "report") return "reports"
  if (resource.type === "training") return "training"
  if (resource.type === "certificate") return "certificates"
  if (resource.type === "payment") return "payments"
  if (resource.type === "case") return "cases"

  if (type.includes("report")) return "reports"
  if (type.includes("training")) return "training"
  if (type.includes("certificate")) return "certificates"
  if (type.includes("payment")) return "payments"
  if (type.includes("request") || type.includes("quote")) return "requests"
  if (type.includes("case")) return "cases"

  return "system"
}

function resourceKey(
  resourceType: string,
  resourceId: string | null | undefined,
) {
  if (!resourceId) return null
  return `${resourceType}:${resourceId}`
}

export function ClientNotificationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [notifications, setNotifications] = useState<ClientNotification[]>([])
  const [loading, setLoading] = useState(true)
  const inFlightRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  const refreshNotifications = useCallback(async () => {
    if (inFlightRef.current) return

    if (
      typeof document !== "undefined" &&
      document.visibilityState !== "visible"
    ) {
      return
    }

    const controller = new AbortController()
    inFlightRef.current = controller

    try {
      const res = await fetch("/api/notifications?scope=bell", {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      })

      if (!res.ok) return

      const payload = await res.json()
      const next = Array.isArray(payload?.notifications)
        ? payload.notifications
        : []

      if (mountedRef.current) {
        setNotifications(next)
      }
    } catch (error) {
      if (
        !(error instanceof DOMException && error.name === "AbortError")
      ) {
        console.error("CLIENT NOTIFICATION REFRESH ERROR:", error)
      }
    } finally {
      if (inFlightRef.current === controller) {
        inFlightRef.current = null
      }

      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void refreshNotifications()

    const refresh = () => {
      if (document.visibilityState === "visible") {
        void refreshNotifications()
      }
    }

    const timer = window.setInterval(refresh, 30000)
    document.addEventListener("visibilitychange", refresh)
    window.addEventListener("focus", refresh)

    return () => {
      mountedRef.current = false
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", refresh)
      window.removeEventListener("focus", refresh)
      inFlightRef.current?.abort()
      inFlightRef.current = null
    }
  }, [refreshNotifications])

  const markRead = useCallback(
    async (notificationId: string) => {
      const res = await fetch(
        `/api/notifications/${encodeURIComponent(notificationId)}`,
        {
          method: "PATCH",
          credentials: "include",
          cache: "no-store",
        },
      )

      if (!res.ok) return false

      setNotifications((items) =>
        items.map((item) =>
          item.id === notificationId ? { ...item, read: true } : item,
        ),
      )

      await refreshNotifications()
      return true
    },
    [refreshNotifications],
  )

  const markResourceRead = useCallback(
    async (
      resourceType: ClientNotificationResourceType,
      resourceId: string,
    ) => {
      if (!resourceId?.trim()) return 0

      const res = await fetch("/api/notifications/read-resource", {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resource_type: resourceType,
          resource_id: resourceId,
        }),
      })

      if (!res.ok) return 0

      const payload = await res.json().catch(() => null)
      const updated = Number(payload?.updated || 0)

      if (updated > 0) {
        setNotifications((items) =>
          items.map((item) => {
            const resource = getClientNotificationResource(item)
            const sameResource =
              resource.id === resourceId &&
              (resource.type === resourceType ||
                (resourceType === "message" &&
                  resource.type === "conversation") ||
                (resourceType === "conversation" &&
                  resource.type === "message"))

            return sameResource ? { ...item, read: true } : item
          }),
        )
      }

      await refreshNotifications()
      return updated
    },
    [refreshNotifications],
  )

  const value = useMemo<ClientNotificationContextValue>(() => {
    const unread = notifications.filter((item) => !item.read)
    const unreadByCategory: Record<string, number> = {}
    const unreadByResource: Record<string, number> = {}

    for (const notification of unread) {
      const category = getClientNotificationCategory(notification)
      unreadByCategory[category] = (unreadByCategory[category] || 0) + 1

      const resource = getClientNotificationResource(notification)
      const key = resourceKey(resource.type, resource.id)
      if (key) {
        unreadByResource[key] = (unreadByResource[key] || 0) + 1
      }

      if (resource.type === "certificate") {
        const metadata = metadataOf(notification)
        const certificateIds = [
          ...metadataStringArray(metadata, "certificate_ids"),
          ...metadataStringArray(metadata, "certificateIds"),
        ]

        for (const certificateId of certificateIds) {
          const certificateKey = resourceKey("certificate", certificateId)
          if (certificateKey) {
            unreadByResource[certificateKey] =
              (unreadByResource[certificateKey] || 0) + 1
          }
        }
      }
    }

    return {
      notifications,
      unreadCount: unread.length,
      unreadByCategory,
      unreadByResource,
      loading,
      refreshNotifications,
      markRead,
      markResourceRead,
      getUnreadForResource: (type, id) =>
        unreadByResource[resourceKey(type, id) || ""] || 0,
    }
  }, [
    notifications,
    loading,
    refreshNotifications,
    markRead,
    markResourceRead,
  ])

  return (
    <ClientNotificationContext.Provider value={value}>
      {children}
    </ClientNotificationContext.Provider>
  )
}

export function useClientNotifications() {
  const context = useContext(ClientNotificationContext)

  if (!context) {
    throw new Error(
      "useClientNotifications must be used within ClientNotificationProvider",
    )
  }

  return context
}
