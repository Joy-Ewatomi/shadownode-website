import Link from "next/link"
import {
  Building2,
  Globe,
  Mail,
  Network,
  Phone,
  Search,
  Users,
} from "lucide-react"

const intelligenceModules = [
  {
    title: "People Intelligence",
    description: "Investigate people, identities, profiles and related entities.",
    href: "/dashboard/intelligence/people",
    icon: Users,
  },
  {
    title: "Email Intelligence",
    description: "Analyze email identities, exposure and related intelligence.",
    href: "/dashboard/intelligence/emails",
    icon: Mail,
  },
  {
    title: "Domain Intelligence",
    description: "Review domains, infrastructure and online assets.",
    href: "/dashboard/intelligence/domains",
    icon: Globe,
  },
  {
    title: "Company Intelligence",
    description: "Research organizations, ownership and business links.",
    href: "/dashboard/intelligence/companies",
    icon: Building2,
  },
  {
    title: "Phone Intelligence",
    description: "Analyze phone identifiers and associated intelligence.",
    href: "/dashboard/intelligence/phones",
    icon: Phone,
  },
  {
    title: "Entity Graph",
    description: "Visualize relationships between people, assets and organizations.",
    href: "/dashboard/intelligence/graph",
    icon: Network,
  },
]

export default function IntelligencePage() {
  return (
    <div className="space-y-6">

      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
          Intelligence Division
        </p>

        <h1 className="mt-2 text-3xl font-bold text-white">
          Intelligence Workspace
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-white/55">
          Access OSINT investigation tools, entity analysis modules,
          intelligence sources and relationship mapping.
        </p>
      </header>


      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

        {intelligenceModules.map((module) => {

          const Icon = module.icon

          return (
            <Link
              key={module.href}
              href={module.href}
              className="rounded-md border border-[#143b28] bg-[#06110f] p-5 transition hover:border-[#20dc73]/50 hover:bg-[#20dc73]/5"
            >

              <Icon className="h-6 w-6 text-[#20dc73]" />

              <h2 className="mt-4 font-semibold text-white">
                {module.title}
              </h2>

              <p className="mt-2 text-sm text-white/45">
                {module.description}
              </p>

              <div className="mt-4 flex items-center gap-2 text-xs text-[#20dc73]">
                <Search className="h-3.5 w-3.5" />
                Open Module
              </div>

            </Link>
          )

        })}

      </section>


      <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">

        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">
          Analyst Notice
        </p>

        <p className="mt-3 text-sm leading-6 text-white/55">
          Intelligence operations will connect to active cases after the
          request, quote, approval and case conversion workflow is completed.
          Assigned intelligence tasks will appear here based on case access.
        </p>

      </section>

    </div>
  )
}