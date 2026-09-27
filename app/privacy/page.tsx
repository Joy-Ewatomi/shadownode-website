import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#050808] px-5 py-14 text-[#e8f2ec] sm:px-8">
      <article className="mx-auto max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#27d56e]">
          Public trust
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          Privacy Policy
        </h1>
        <div className="mt-8 space-y-7 text-base leading-7 text-white/80">
          <section>
            <h2 className="text-xl font-semibold text-white">
              Information we process
            </h2>
            <p className="mt-2">
              ShadowNode Operations Bureau Limited processes account details,
              service-request information, communications, uploaded files,
              payment references, security logs, training records, and
              certificate data needed to provide and protect its services.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">
              How information is used
            </h2>
            <p className="mt-2">
              Information is used to authenticate users, review lawful requests,
              communicate through selected channels, administer engagements,
              process verified payments, issue and verify certificates, prevent
              abuse, and maintain audit records.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">
              Providers and communications
            </h2>
            <p className="mt-2">
              Approved infrastructure, storage, email, payment, OAuth, calendar,
              and manually operated WhatsApp services may process limited
              information required for their function. WhatsApp transactional
              communication requires explicit consent and a valid number.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">
              Retention and rights
            </h2>
            <p className="mt-2">
              Records may be retained for security, contractual, financial,
              evidentiary, audit, and legal obligations. Account-deletion
              requests are reviewed and do not automatically erase records that
              must be retained.
            </p>
          </section>
          <p className="rounded border border-[#b58a2b]/40 bg-[#b58a2b]/10 p-4 text-sm">
            This launch policy is operational information and requires qualified
            legal review for each jurisdiction in which services are offered.
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
