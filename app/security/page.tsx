import type { Metadata } from "next";
import { PolicySection, PublicPolicyLayout } from "@/components/public/PublicPolicyLayout";
import { validReplyTo } from "@/lib/email-address";

export const metadata: Metadata = {
  title: "Security Policy",
  description: "Responsible vulnerability reporting policy for ShadowNode Operations Bureau Limited.",
  alternates: { canonical: "/security" },
};

export default function SecurityPolicyPage() {
  const securityContact = validReplyTo(process.env.CLIENT_SERVICES_REPLY_TO);

  return (
    <PublicPolicyLayout eyebrow="Responsible disclosure" title="Security Policy" description="ShadowNode Operations Bureau Limited welcomes good-faith reports that help us protect clients, accounts, and services. This policy explains how to report a suspected vulnerability safely.">
      <p className="text-sm text-white/60"><strong className="text-white">Effective:</strong> 28 September 2026<br /><strong className="text-white">Last updated:</strong> 28 September 2026</p>

      <PolicySection title="Report a vulnerability">
        <p>Send a concise description, the affected URL or feature, potential impact, and safe reproduction steps. Remove personal data and secrets from screenshots or supporting material.</p>
        {securityContact ? (
          <p>Monitored security contact: <a href={`mailto:${securityContact}`} className="break-all text-[#76f0a3] underline underline-offset-4">{securityContact}</a></p>
        ) : (
          <p>The public security mailbox is temporarily unavailable. Use the monitored method on the Contact page and identify the message as a security report.</p>
        )}
        <p>Do not send passwords, authentication codes, session cookies, private keys, payment credentials, client evidence, or unnecessary personal information in the initial report.</p>
      </PolicySection>

      <PolicySection title="Testing boundaries">
        <p>This policy does not grant blanket authorization to test ShadowNode or any third-party system. Do not perform destructive testing, denial-of-service or load testing, social engineering, phishing, physical intrusion, privacy violations, bulk data extraction, persistence, credential attacks, malware deployment, or access to another person’s account or information.</p>
        <p>Stop testing if you encounter personal information, client material, credentials, or evidence. Do not download, retain, alter, disclose, or redistribute it. Report the issue promptly and delete any inadvertently received data after receiving safe handling instructions.</p>
      </PolicySection>

      <PolicySection title="Good-faith reporting">
        <p>We aim to acknowledge useful reports and coordinate remediation where practical. We ask researchers to act in good faith, minimize impact, preserve confidentiality, and allow reasonable time for investigation before public disclosure.</p>
        <p>ShadowNode will consider good-faith compliance with this policy when evaluating a report. This statement is not immunity, legal advice, or a promise that conduct is lawful in every jurisdiction. Researchers remain responsible for complying with applicable law and should seek independent legal advice when uncertain.</p>
      </PolicySection>

      <PolicySection title="Security safeguards">
        <p>Our controls include authenticated sessions, role and ownership checks, two-factor authentication options, protected credentials, private storage, audit records, and server-side payment verification. Controls evolve with risk, and no system can be guaranteed completely secure.</p>
      </PolicySection>
    </PublicPolicyLayout>
  );
}
