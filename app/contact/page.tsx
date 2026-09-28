import Link from "next/link";
import { validReplyTo } from "@/lib/email-address";

export default function ContactPage() {
  const monitored = validReplyTo(process.env.CLIENT_SERVICES_REPLY_TO);
  return (
    <main className="min-h-screen bg-[#050808] px-5 py-14 text-[#e8f2ec] sm:px-8">
      <section className="mx-auto max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#27d56e]">
          SHADOWNODE OPERATIONS BUREAU LIMITED
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          Contact and support
        </h1>
        <p className="mt-6 leading-7 text-white/80">
          Existing clients should use the secure portal for requests, evidence,
          payments, and case communications.
        </p>
        {monitored ? (
          <p className="mt-5 break-all text-white/80">
            Operational support:{" "}
            <a
              className="text-[#76f0a3] underline underline-offset-4"
              href={`mailto:${monitored}`}
            >
              {monitored}
            </a>
          </p>
        ) : (
          <p className="mt-5 rounded border border-white/15 p-4 text-white/75">
            A public support mailbox is not currently configured. Please use the
            secure portal.
          </p>
        )}
        <p className="mt-5 text-sm leading-6 text-white/65">
          Never email passwords, login codes, recovery codes, payment
          credentials, or sensitive evidence.
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex min-h-11 items-center text-[#76f0a3] underline underline-offset-4"
        >
          Return to ShadowNode
        </Link>
      </section>
    </main>
  );
}
