"use client"

type PendingRequest = {
  id: string
  case_number: string | null
  title: string | null
  service_type: string | null
  status: string
  client_email: string | null
  created_at: string
}

export default function PendingRequests({ requests }: { requests: PendingRequest[] }) {
  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f]">
      <div className="border-b border-[#143b28] px-5 py-4">
        <h2 className="font-semibold text-white">Pending Requests</h2>
      </div>
      <div className="divide-y divide-[#143b28]">
        {!requests.length ? <p className="p-5 text-sm text-white/45">No pending client requests.</p> : null}
        {requests.map((request) => (
          <article key={request.id} className="px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium text-white">{request.title || request.service_type || "Client request"}</p>
              <span className="rounded border border-amber-300/30 px-2 py-1 text-xs text-amber-200">{request.status}</span>
            </div>
            <p className="mt-1 text-xs text-white/40">{request.case_number || "No tracking number"} · {request.client_email || "registered client"} · {new Date(request.created_at).toLocaleDateString()}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
