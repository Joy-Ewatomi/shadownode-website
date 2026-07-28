"use client"

type TeamMember = {
  id: string
  name: string | null
  role: string
  assigned_cases: number
  current_workload: number
}

export default function TeamStatus({ members }: { members: TeamMember[] }) {
  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f]">
      <div className="border-b border-[#143b28] px-5 py-4">
        <h2 className="font-semibold text-white">Team Workload</h2>
      </div>
      <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
        {!members.length ? <p className="text-sm text-white/45">No active investigators or analysts.</p> : null}
        {members.map((member) => (
          <article key={member.id} className="rounded border border-[#143b28] bg-black/20 p-4">
            <p className="font-semibold text-white">{member.name || "Operator"}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#20dc73]">{member.role}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Metric label="Assigned" value={member.assigned_cases} />
              <Metric label="Open Tasks" value={member.current_workload} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-[#06110f] p-2">
      <p className="text-xs text-white/35">{label}</p>
      <p className="font-bold text-[#20dc73]">{value}</p>
    </div>
  )
}
