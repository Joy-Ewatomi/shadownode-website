import type { Metadata } from "next";
import Link from "next/link";
import { PolicySection, PublicPolicyLayout } from "@/components/public/PublicPolicyLayout";
import { validReplyTo } from "@/lib/email-address";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact ShadowNode Operations Bureau Limited for operational support, privacy, and security matters.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const monitored = validReplyTo(process.env.CLIENT_SERVICES_REPLY_TO);

  return (
    <PublicPolicyLayout eyebrow="Contact" title="Contact ShadowNode" description="Use the secure client portal for active service requests and sensitive engagement communications. Use the monitored operational address below for general business, privacy, or security enquiries.">
      <PolicySection title="ShadowNode Operations Bureau Limited">
        {monitored ? (
          <p>Monitored operational email: <a className="break-all text-[#76f0a3] underline underline-offset-4" href={`mailto:${monitored}`}>{monitored}</a></p>
        ) : (
          <p className="border border-amber-300/30 bg-amber-300/10 p-4 text-white/85">A monitored public operational mailbox is not currently configured. Existing clients should use the secure portal.</p>
        )}
        <p>Existing clients can sign in to the <Link href="/login" className="text-[#76f0a3] underline underline-offset-4">secure portal</Link> for requests, files, payments, and engagement communications.</p>
      </PolicySection>

      <PolicySection title="Send information safely">
        <p>Do not email passwords, login or recovery codes, authentication tokens, payment credentials, sensitive evidence, or confidential case material. Upload engagement material only through an authorized secure workflow.</p>
        <p>For suspected vulnerabilities, include “Security report” in the subject and follow the boundaries in our <Link href="/security" className="text-[#76f0a3] underline underline-offset-4">Security Policy</Link>.</p>
      </PolicySection>
    </PublicPolicyLayout>
  );
}
