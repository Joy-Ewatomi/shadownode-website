"use client"

type ActiveCase = {
  id: string
  case_number: string
  title: string
  priority: string | null
  status: string | null
  progress: number | null
  assigned_investigator: string | null
}

export default function ActiveCases({ cases }: { cases: ActiveCase[] }) {
  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f]">
      <div className="border-b border-[#143b28] px-5 py-4">
        <h2 className="font-semibold text-white">Active Cases</h2>
      </div>
      <div className="divide-y divide-[#143b28]">
        {!cases.length ? <p className="p-5 text-sm text-white/45">No active cases.</p> : null}
        {cases.map((item) => (
          <article key={item.id} className="px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">{item.case_number}</p>
                <p className="mt-1 text-sm text-white/55">{item.title}</p>
              </div>
              <span className="rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-[#20dc73]">{item.priority || "normal"}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-white/40">
              <span>{item.status || "active"} · {item.assigned_investigator || "Unassigned"}</span>
              <span>{item.progress ?? 0}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black">
              <div className="h-full bg-[#20dc73]" style={{ width: `${item.progress ?? 0}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
