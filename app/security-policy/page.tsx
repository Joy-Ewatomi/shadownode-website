import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#050808] px-5 py-14 text-[#e8f2ec] sm:px-8">
      <article className="mx-auto max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#27d56e]">
          Public trust
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          Security and Responsible Reporting
        </h1>
        <div className="mt-8 space-y-7 text-base leading-7 text-white/80">
          <section>
            <h2 className="text-xl font-semibold text-white">
              Protecting accounts and records
            </h2>
            <p className="mt-2">
              ShadowNode uses authenticated sessions, role and ownership checks,
              two-factor authentication, recovery controls, audit records,
              encrypted secrets, private storage, and server-side payment
              verification. No system can be guaranteed completely secure.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">
              Report a concern
            </h2>
            <p className="mt-2">
              Do not include passwords, access tokens, recovery codes, evidence
              contents, or other sensitive material in an initial report. Use
              the monitored contact channel listed on the Contact page and
              provide a concise description, affected URL, and safe reproduction
              steps.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">
              Authorized testing
            </h2>
            <p className="mt-2">
              This page does not grant authorization to test, scan, disrupt,
              access, or modify ShadowNode systems or third-party data.
            </p>
          </section>
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
