"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function MarkNotificationRead() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const processedNotificationId =
    useRef<string | null>(null)

  useEffect(() => {
    const notificationId =
      searchParams.get("notificationId")

    // -------------------------------------------------------
    // No notification ID
    // -------------------------------------------------------

    if (notificationId === null) {
      return
    }

    // At this point TypeScript knows this is a string.
    const notificationIdValue: string =
      notificationId

    // -------------------------------------------------------
    // Prevent duplicate requests
    // -------------------------------------------------------

    if (
      processedNotificationId.current ===
      notificationIdValue
    ) {
      return
    }

    processedNotificationId.current =
      notificationIdValue

    // -------------------------------------------------------
    // Mark notification as read
    // -------------------------------------------------------

    async function markRead() {
      try {
        const response = await fetch(
          `/api/notifications/${encodeURIComponent(
            notificationIdValue,
          )}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            cache: "no-store",
          },
        )

        if (!response.ok) {
          console.error(
            "MARK NOTIFICATION READ FAILED:",
            await response.text(),
          )

          // Allow another attempt if it failed.
          processedNotificationId.current =
            null

          return
        }

        // ---------------------------------------------------
        // Remove notificationId from URL
        // ---------------------------------------------------

        const params =
          new URLSearchParams(
            searchParams.toString(),
          )

        params.delete("notificationId")

        const queryString =
          params.toString()

        const cleanUrl =
          queryString.length > 0
            ? `${window.location.pathname}?${queryString}`
            : window.location.pathname

        router.replace(cleanUrl, {
          scroll: false,
        })
      } catch (error) {
        console.error(
          "MARK NOTIFICATION READ ERROR:",
          error,
        )

        // Allow retry after an error.
        processedNotificationId.current =
          null
      }
    }

    void markRead()
  }, [searchParams, router])

  return null
}