"use client"

type ClientCase = {
  case_number: string
  title: string
  description: string | null
  status: string | null
  priority: string | null
  created_at: string
  progress: number
}

export default function ClientCaseHeader({ caseInfo }: { caseInfo: ClientCase }) {
  return (
    <header className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">Case Overview</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{caseInfo.title}</h1>
          <p className="mt-1 text-sm text-white/45">{caseInfo.case_number}</p>
        </div>
        <span className="rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#20dc73]">
          {caseInfo.status || "submitted"}
        </span>
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-white/60">{caseInfo.description || "No description was provided for this case."}</p>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Detail label="Priority" value={caseInfo.priority || "normal"} />
        <Detail label="Created" value={new Date(caseInfo.created_at).toLocaleDateString()} />
        <Detail label="Progress" value={`${caseInfo.progress}%`} />
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-black">
        <div className="h-full bg-[#20dc73]" style={{ width: `${caseInfo.progress}%` }} />
      </div>
    </header>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#143b28] bg-black/20 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  )
}
