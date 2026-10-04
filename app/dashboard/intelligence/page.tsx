import Link from "next/link"
import { Building2, Globe2, Mail, Network, Phone, Share2, Users } from "lucide-react"

const modules = [
  { title: "Domain & DNS Intelligence", description: "Domain, DNS, IP, ASN, HTTP, TLS and Certificate Transparency intelligence powered by SDIA.", href: "/dashboard/intelligence/domains", icon: Globe2, available: true },
  { title: "People Intelligence", description: "Person-focused intelligence operations.", icon: Users, available: false },
  { title: "Email Intelligence", description: "Email intelligence and analysis.", icon: Mail, available: false },
  { title: "Company Intelligence", description: "Company intelligence and analysis.", icon: Building2, available: false },
  { title: "Phone Intelligence", description: "Phone intelligence and analysis.", icon: Phone, available: false },
  { title: "Social Intelligence", description: "Social-platform intelligence and analysis.", icon: Share2, available: false },
  { title: "Entity Graph", description: "Visualize and investigate relationships between entities in an authorized case.", icon: Network, available: true, caseRequired: true },
] as const

export default function IntelligencePage() {
  return <div className="space-y-6">
    <header className="border-b border-[#143b28] pb-6">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">Intelligence Division</p>
      <h1 className="mt-2 text-3xl font-bold text-white">Intelligence Workspace</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">Review current intelligence capabilities. Operational analysis remains attached to an authorized case workspace.</p>
    </header>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Intelligence capabilities">
      {modules.map((module) => {
        const Icon = module.icon
        const content = <>
          <div className="flex items-start justify-between gap-3">
            <Icon className={`h-6 w-6 ${module.available ? "text-[#20dc73]" : "text-white/30"}`} aria-hidden="true" />
            <span className={`rounded border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] ${module.available ? "border-[#20dc73]/35 bg-[#20dc73]/10 text-[#20dc73]" : "border-white/10 bg-white/[0.03] text-white/40"}`}>{module.available ? "Available" : "Not Yet Available"}</span>
          </div>
          <h2 className="mt-4 font-semibold text-white">{module.title}</h2>
          <p className="mt-2 text-sm leading-6 text-white/45">{module.description}</p>
          {"caseRequired" in module && module.caseRequired ? <p className="mt-4 text-xs text-white/35">Open an authorized case to use the Entity Graph.</p> : module.available ? <p className="mt-4 text-xs font-semibold text-[#20dc73]">Open capability</p> : null}
        </>
        return "href" in module && module.href ? <Link key={module.title} href={module.href} className="rounded-md border border-[#143b28] bg-[#06110f] p-5 transition hover:border-[#20dc73]/50 hover:bg-[#20dc73]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73]">{content}</Link> : <div key={module.title} aria-disabled="true" className="rounded-md border border-white/10 bg-[#06110f]/70 p-5 opacity-75">{content}</div>
      })}
    </section>
    <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">Architecture</p>
      <p className="mt-3 text-sm leading-6 text-white/55">SDIA currently powers Domain & DNS Intelligence only. The Entity Graph is the existing case visualization workspace; unavailable capabilities do not run searches or create findings.</p>
    </section>
  </div>
}
