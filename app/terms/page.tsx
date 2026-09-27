import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#050808] px-5 py-14 text-[#e8f2ec] sm:px-8">
      <article className="mx-auto max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#27d56e]">
          Public trust
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          Terms of Service
        </h1>
        <div className="mt-8 space-y-7 text-base leading-7 text-white/80">
          <section>
            <h2 className="text-xl font-semibold text-white">
              Lawful authority
            </h2>
            <p className="mt-2">
              Clients must have lawful authority for every request and must
              provide accurate information. ShadowNode may reject, suspend, or
              report requests that appear unlawful, deceptive, abusive, or
              outside its professional scope.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">
              Service decisions
            </h2>
            <p className="mt-2">
              Submitting a request does not guarantee acceptance, pricing,
              completion time, investigative outcome, recovery, legal result, or
              acceptance by a court, regulator, employer, or other third party.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">
              Files, payments and certificates
            </h2>
            <p className="mt-2">
              Clients are responsible for files they submit. Payments are
              completed only after server-side provider verification. Public
              certificate verification exposes only limited certificate
              information and does not create accreditation or legal status
              beyond the recorded training completion.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">Communications</h2>
            <p className="mt-2">
              The portal is the canonical service record. Operational email and
              consented WhatsApp messages are convenience channels and may be
              delayed or unavailable.
            </p>
          </section>
          <p className="rounded border border-[#b58a2b]/40 bg-[#b58a2b]/10 p-4 text-sm">
            These launch terms require review and approval by qualified legal
            counsel before being treated as final legal terms.
          </p>
        </div>
        <Link
          href="/"
          className="mt-10 inline-flex min-h-11 items-center text-[#76f0a3] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27d56e]"
        >
          Return to ShadowNode
        </Link>
      </article>
    </main>
  );
}
