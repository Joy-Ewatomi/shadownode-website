import Link from "next/link"
import { Building2, FileSearch2, Globe2, Image, Landmark, MapPinned, Network, ShieldAlert, Users } from "lucide-react"
import { INTELLIGENCE_DOMAINS, type IntelligenceDomainId } from "@/lib/intelligence-domains"

const icons: Record<IntelligenceDomainId, typeof Users> = {
  people: Users, company: Building2, domain: Globe2, image: Image,
  document: FileSearch2, geo: MapPinned, threat: ShieldAlert,
  financial: Landmark, case: Network,
}

export default function IntelligencePage() {
  return <div className="space-y-6">
    <header className="border-b border-[#143b28] pb-6">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">Intelligence Division</p>
      <h1 className="mt-2 text-3xl font-bold text-white">Intelligence Workspace</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">Review current intelligence capabilities. Operational analysis remains attached to an authorized case workspace.</p>
    </header>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Intelligence capabilities">
      {INTELLIGENCE_DOMAINS.map((module) => {
        const Icon = icons[module.id]
        const href = module.id === "domain" ? "/dashboard/intelligence/domains" : null
        const content = <>
          <div className="flex items-start justify-between gap-3">
            <Icon className={`h-6 w-6 ${module.available ? "text-[#20dc73]" : "text-white/30"}`} aria-hidden="true" />
            <span className={`rounded border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] ${module.available ? "border-[#20dc73]/35 bg-[#20dc73]/10 text-[#20dc73]" : "border-white/10 bg-white/[0.03] text-white/40"}`}>{module.available ? "Available" : "Not Yet Available"}</span>
          </div>
          <h2 className="mt-4 font-semibold text-white">{module.title}</h2>
          <p className="mt-2 text-sm leading-6 text-white/45">{module.description}</p>
          <p className="mt-3 text-xs leading-5 text-white/30">{module.capabilities.join(" · ")}</p>
          {module.id === "case" ? <p className="mt-4 text-xs text-white/35">Open an authorized case to use Case Intelligence.</p> : module.available ? <p className="mt-4 text-xs font-semibold text-[#20dc73]">Open capability</p> : null}
        </>
        return href ? <Link key={module.id} href={href} className="rounded-md border border-[#143b28] bg-[#06110f] p-5 transition hover:border-[#20dc73]/50 hover:bg-[#20dc73]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73]">{content}</Link> : <div key={module.id} aria-disabled={module.available ? undefined : "true"} className={`rounded-md border bg-[#06110f]/70 p-5 ${module.available ? "border-[#143b28]" : "border-white/10 opacity-75"}`}>{content}</div>
      })}
    </section>
    <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">Architecture</p>
      <p className="mt-3 text-sm leading-6 text-white/55">Eight intelligence domains feed Case Intelligence, the operational layer for investigation, evidence, findings, timelines, relationships and reports. SDIA remains the engine for Domain & Infrastructure Intelligence. Planned domains do not run searches or create findings until their approved engines are connected.</p>
    </section>
  </div>
}
