"use client"

import {
  ArrowLeft,
  ExternalLink,
  Mail,
  MapPin,
  Network,
  Phone,
  Search,
  ShieldCheck,
  User,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

type PersonProfile = {
  name: string
  aliases: string[]
  usernames: string[]
  emails: string[]
  phones: string[]
  locations: string[]
  organizations: string[]
  socialProfiles: string[]
}

const emptyProfile: PersonProfile = {
  name: "",
  aliases: [],
  usernames: [],
  emails: [],
  phones: [],
  locations: [],
  organizations: [],
  socialProfiles: [],
}

export default function PeopleIntelligencePage() {
  const [query, setQuery] = useState("")
  const [profile, setProfile] = useState<PersonProfile | null>(null)

  function beginInvestigation() {
    if (!query.trim()) return

    setProfile({
      ...emptyProfile,
      name: query.trim(),
    })
  }

  return (
    <main className="space-y-6">
      <header className="rounded-md border border-[#143b28] bg-[#06110f] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard/intelligence"
              className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-[#20dc73]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Intelligence Workspace
            </Link>

            <p className="mt-5 font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              People Intelligence
            </p>

            <h1 className="mt-2 text-3xl font-bold text-white">
              People OSINT Investigation
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">
              Investigate identities, aliases, usernames, contact identifiers,
              social profiles, organizations, locations and relationships using
              verified intelligence sources.
            </p>
          </div>

          <div className="rounded-md border border-[#20dc73]/20 bg-[#20dc73]/5 p-4">
            <ShieldCheck className="h-5 w-5 text-[#20dc73]" />
            <p className="mt-2 text-xs text-white/45">
              Analyst investigation module
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-[#20dc73]" />
          <h2 className="font-semibold text-white">
            Start Person Investigation
          </h2>
        </div>

        <p className="mt-2 text-sm text-white/45">
          Enter a known identifier to create the initial investigation target.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") beginInvestigation()
            }}
            placeholder="Name, username, email, phone or other identifier"
            className="h-11 flex-1 rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/50"
          />

          <button
            onClick={beginInvestigation}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#20dc73] px-5 text-sm font-bold text-black"
          >
            <Search className="h-4 w-4" />
            Investigate
          </button>
        </div>
      </section>

      {profile ? (
        <>
          <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md border border-[#20dc73]/30 bg-[#20dc73]/5">
                <User className="h-6 w-6 text-[#20dc73]" />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[#20dc73]">
                  Investigation Target
                </p>

                <h2 className="mt-1 text-2xl font-bold text-white">
                  {profile.name}
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  Initial intelligence profile
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <IntelligenceCard
              icon={User}
              title="Identity"
              description="Names, aliases and identity indicators."
              values={profile.aliases}
            />

            <IntelligenceCard
              icon={Network}
              title="Usernames"
              description="Known usernames and account identifiers."
              values={profile.usernames}
            />

            <IntelligenceCard
              icon={Mail}
              title="Email Intelligence"
              description="Email addresses and related exposure."
              values={profile.emails}
            />

            <IntelligenceCard
              icon={Phone}
              title="Phone Intelligence"
              description="Phone identifiers and associations."
              values={profile.phones}
            />

            <IntelligenceCard
              icon={MapPin}
              title="Locations"
              description="Known or reported geographic associations."
              values={profile.locations}
            />

            <IntelligenceCard
              icon={Network}
              title="Organizations"
              description="Companies, institutions and affiliations."
              values={profile.organizations}
            />
          </section>

          <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-[#20dc73]" />
              <h2 className="font-semibold text-white">
                Social Profiles
              </h2>
            </div>

            <div className="mt-4 rounded border border-dashed border-[#143b28] p-6 text-center">
              <p className="text-sm text-white/40">
                No social profiles have been verified for this investigation.
              </p>
            </div>
          </section>

          <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-[#20dc73]" />
              <h2 className="font-semibold text-white">
                Relationship Intelligence
              </h2>
            </div>

            <div className="mt-4 rounded border border-dashed border-[#143b28] p-6 text-center">
              <p className="text-sm text-white/40">
                Relationship mapping will appear when connected entities are
                associated with this person.
              </p>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-md border border-dashed border-[#143b28] p-10 text-center">
          <User className="mx-auto h-8 w-8 text-[#20dc73]/50" />

          <h2 className="mt-4 font-semibold text-white">
            No investigation target selected
          </h2>

          <p className="mt-2 text-sm text-white/40">
            Start with a name, username, email, phone number or other known
            identifier.
          </p>
        </section>
      )}
    </main>
  )
}

function IntelligenceCard({
  icon: Icon,
  title,
  description,
  values,
}: {
  icon: typeof User
  title: string
  description: string
  values: string[]
}) {
  return (
    <section className="rounded-md border border-[#143b28] bg-[#06110f] p-5">
      <Icon className="h-5 w-5 text-[#20dc73]" />

      <h3 className="mt-4 font-semibold text-white">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-white/40">
        {description}
      </p>

      <div className="mt-4">
        {values.length ? (
          <div className="space-y-2">
            {values.map((value, index) => (
              <div
                key={`${value}-${index}`}
                className="rounded border border-[#143b28] bg-black/30 px-3 py-2 text-xs text-white/60"
              >
                {value}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/30">
            No verified intelligence recorded.
          </p>
        )}
      </div>
    </section>
  )
}