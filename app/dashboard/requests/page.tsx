"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { RefreshCcw, Search } from "lucide-react"

type Request = {
  id: string
  case_number: string | null
  title: string | null
  category: string | null
  service_type: string | null
  status: string
  created_at: string
  client_username?: string | null
  client_email?: string | null
}

export default function RequestList() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)

  async function loadRequests() {
    try {
      const res = await fetch("/api/admin/requests", {
        credentials: "include",
      })

      if (!res.ok) {
        console.error("Failed loading requests")
        return
      }

      const data = await res.json()
      setRequests(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  return (
    <main className="space-y-6">

      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
          Operations
        </p>

        <h1 className="mt-2 text-3xl font-bold text-white">
          Service Requests
        </h1>

        <p className="mt-2 text-sm text-white/50">
          Review incoming ShadowNode client investigations.
        </p>
      </header>


      <section className="rounded-md border border-[#143b28] bg-[#06110f]">

        <div className="flex items-center justify-between border-b border-[#143b28] px-5 py-4">

          <h2 className="font-semibold text-white">
            All Requests
          </h2>

          <button
            onClick={loadRequests}
            className="inline-flex items-center gap-2 rounded border border-[#20dc73]/40 px-3 py-2 text-sm text-[#20dc73]"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>

        </div>


        <div className="divide-y divide-[#143b28]">

          {loading && (
            <p className="p-5 text-sm text-white/50">
              Loading requests...
            </p>
          )}


          {!loading && requests.length === 0 && (
            <div className="flex flex-col items-center py-12 text-white/40">
              <Search className="mb-3 h-10 w-10" />

              <p>
                No requests found
              </p>
            </div>
          )}


          {requests.map((request) => (

            <div
              key={request.id}
              className="flex items-center justify-between px-5 py-5"
            >

              <div>

                <h3 className="font-semibold text-white">
                  {request.title || "Untitled Request"}
                </h3>


                <p className="mt-1 text-sm text-white/50">
                  {request.case_number}
                </p>


                <div className="mt-2 flex gap-2">

                  <span className="rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-1 text-xs text-[#20dc73]">
                    {request.status}
                  </span>


                  <span className="rounded border border-white/10 px-2 py-1 text-xs text-white/50">
                    {request.category || request.service_type}
                  </span>

                </div>

              </div>


              <Link
                href={`/dashboard/requests/${request.id}`}
                className="rounded border border-[#20dc73]/40 px-4 py-2 text-sm text-[#20dc73] hover:bg-[#20dc73]/10"
              >
                Open
              </Link>


            </div>

          ))}

        </div>

      </section>

    </main>
  )
}