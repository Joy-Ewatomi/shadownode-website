import type { Metadata } from "next";
import Link from "next/link";
import { PolicySection, PublicPolicyLayout } from "@/components/public/PublicPolicyLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ShadowNode Operations Bureau Limited collects, uses, shares, retains, and protects personal information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PublicPolicyLayout eyebrow="Public trust" title="Privacy Policy" description="This policy explains how ShadowNode Operations Bureau Limited handles personal information when people use our website, accounts, service-request portal, communications, payments, authentication integrations, and training services.">
      <p className="text-sm text-white/60"><strong className="text-white">Effective:</strong> 28 September 2026<br /><strong className="text-white">Last updated:</strong> 28 September 2026</p>

      <PolicySection title="Information we may collect and why">
        <ul className="list-disc space-y-3 pl-6">
          <li><strong className="text-white">Account and contact information:</strong> name, email address, organization details, and verified communication details used to create accounts, identify users, provide support, and deliver service notices.</li>
          <li><strong className="text-white">Service requests and submitted materials:</strong> request descriptions, lawful-authority confirmations, scheduling preferences, files, evidence, and related records used to assess, quote, deliver, secure, and audit requested services.</li>
          <li><strong className="text-white">Communications:</strong> portal messages and selected email or consented WhatsApp details used to respond to users and maintain an operational record. Sensitive evidence should remain in the secure portal.</li>
          <li><strong className="text-white">Authentication and security information:</strong> password hashes, session records, OAuth provider identifiers, login attempts, approximate IP information, device/browser descriptions, two-factor settings, and audit events used to authenticate users and detect misuse. We do not store plaintext passwords or authenticator secrets in plaintext.</li>
          <li><strong className="text-white">Payment references:</strong> provider, transaction reference, amount, currency, and verification status used to reconcile payments and maintain financial records. Payment providers process payment credentials; ShadowNode does not require clients to submit card credentials through service-request forms.</li>
          <li><strong className="text-white">Google OAuth information:</strong> the Google account identifier, name, and email Google returns with permission, used only to provide the requested sign-in functionality and protect account access.</li>
          <li><strong className="text-white">Google Calendar information:</strong> authorized calendar identifiers and event details needed to create or manage requested training or service appointments. Google data is used only to provide the calendar functionality the user requests.</li>
        </ul>
      </PolicySection>

      <PolicySection title="How information is shared">
        <p>We do not state or operate on the basis that personal information is sold. Limited information may be processed by vetted providers supporting hosting and infrastructure, database and file storage, transactional email, authentication, Google OAuth, Google Calendar, payment processing, monitoring, and security. Providers receive only information reasonably needed for their function and may process it under their own applicable terms and privacy obligations.</p>
        <p>Information may also be disclosed when reasonably necessary to comply with applicable law, enforce agreements, protect users or systems, investigate abuse, or complete a corporate transaction subject to appropriate safeguards.</p>
      </PolicySection>

      <PolicySection title="Retention and security">
        <p>Retention depends on the record and purpose. Account and operational records may be kept while an account or engagement remains active. Security, audit, financial, contractual, training, certificate, investigation, evidence, and legally retained records may be kept longer where necessary for legitimate operational or legal purposes.</p>
        <p>Safeguards include access controls, role and ownership checks, encrypted transport, protected credentials, private storage, audit records, two-factor authentication options, and server-side payment verification. No online service can guarantee absolute security.</p>
      </PolicySection>

      <PolicySection title="Deletion requests and user rights">
        <p>Users may request access, correction, restriction, objection, portability, or deletion where applicable. Requests are evaluated against identity-verification, security, contractual, financial, evidentiary, and legal-retention requirements. Account deletion does not automatically erase records that must be retained.</p>
        <p>Authenticated users can submit an account-deletion request through the <Link href="/account/security" className="text-[#76f0a3] underline underline-offset-4">Security Center</Link>. Other privacy or data-deletion requests may be made through the monitored method on the <Link href="/contact" className="text-[#76f0a3] underline underline-offset-4">Contact page</Link>.</p>
      </PolicySection>

      <PolicySection title="Questions and changes">
        <p>Contact ShadowNode Operations Bureau Limited through the monitored contact method listed on the Contact page. We may update this policy as services or legal obligations change; the date above identifies the current version.</p>
      </PolicySection>
    </PublicPolicyLayout>
  );
}
