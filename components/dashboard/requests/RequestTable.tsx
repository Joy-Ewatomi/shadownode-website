"use client"

import { useEffect, useState } from "react"

type Request = {
  id: string
  case_number: string
  title: string
  service_type: string
  status: string
  created_at: string
}

export default function RequestTable() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRequests() {
      try {
        const response = await fetch("/api/requests")

        if (!response.ok) {
          throw new Error("Failed to load requests")
        }

        const data = await response.json()

        setRequests(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Failed to load requests:", error)
        setRequests([])
      } finally {
        setLoading(false)
      }
    }

    loadRequests()
  }, [])

  return (
    <div className="rounded-md border border-[#143b28] bg-[#06110f]">

      <div className="border-b border-[#143b28] p-4">
        <h2 className="font-semibold text-white">
          Incoming Requests
        </h2>
      </div>

      {loading ? (
        <div className="p-5 text-sm text-white/50">
          Loading requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="p-5 text-sm text-white/50">
          No requests currently require action.
        </div>
      ) : (
        <div className="divide-y divide-[#143b28]">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between gap-4 p-5"
            >
              <div className="min-w-0">
                <p className="font-medium text-white">
                  {request.title}
                </p>

                <p className="text-sm text-white/50">
                  {request.case_number}
                </p>

                <p className="text-xs text-white/40">
                  {request.service_type}
                </p>
              </div>

              <div className="shrink-0">
                <span className="rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-3 py-1 text-xs text-[#20dc73]">
                  {request.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}