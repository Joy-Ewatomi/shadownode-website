"use client"

type Alert = {
  id: string
  case_number?: string | null
  title: string | null
  priority?: string | null
  status?: string | null
  message?: string | null
  type?: string | null
  created_at: string
}

export default function CriticalAlerts({
  alerts,
  notifications,
  pendingInvoices,
}: {
  alerts: Alert[]
  notifications: Alert[]
  pendingInvoices: Alert[]
}) {
  const rows = [
    ...alerts.map((item) => ({ ...item, label: "Critical case" })),
    ...notifications.map((item) => ({ ...item, label: item.type || "Notification" })),
    ...pendingInvoices.map((item) => ({ ...item, label: "Pending invoice" })),
  ]

  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f]">
      <div className="border-b border-[#143b28] px-5 py-4">
        <h2 className="font-semibold text-white">Critical Alerts</h2>
      </div>
      <div className="divide-y divide-[#143b28]">
        {!rows.length ? <p className="p-5 text-sm text-white/45">No critical alerts.</p> : null}
        {rows.map((item, index) => (
          <article key={`${item.id}-${index}`} className="px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium text-white">{item.title || item.case_number || "Operational alert"}</p>
              <span className="rounded border border-red-400/30 px-2 py-1 text-xs text-red-200">{item.label}</span>
            </div>
            <p className="mt-1 text-xs text-white/40">{item.message || item.status || ""}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
