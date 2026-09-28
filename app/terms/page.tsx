import type { Metadata } from "next";
import { PolicySection, PublicPolicyLayout } from "@/components/public/PublicPolicyLayout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing lawful use of ShadowNode Operations Bureau Limited services.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PublicPolicyLayout eyebrow="Service terms" title="Terms of Service" description="These terms govern access to the website and services provided by ShadowNode Operations Bureau Limited.">
      <p className="text-sm text-white/60"><strong className="text-white">Effective:</strong> 28 September 2026<br /><strong className="text-white">Last updated:</strong> 28 September 2026</p>

      <PolicySection title="Lawful and authorized use">
        <p>Users must provide accurate information and have lawful authority for every request, target, system, account, dataset, file, and instruction they submit. Services must not be used for unauthorized access, surveillance, harassment, stalking, credential theft, exploitation, unlawful investigations, privacy violations, or evasion of legal restrictions.</p>
        <p>ShadowNode may decline, pause, limit, or report work that appears unlawful, deceptive, unsafe, outside professional scope, or unsupported by adequate authority.</p>
      </PolicySection>

      <PolicySection title="Accounts and service requests">
        <p>Users are responsible for account security and activity performed through their account. A submitted request is an invitation for review and does not guarantee acceptance. Scope, timing, responsibilities, and deliverables are established through the accepted quotation or other written engagement terms.</p>
      </PolicySection>

      <PolicySection title="Quotations, payments, and cancellations">
        <p>Quotations may expire or be revised when scope, assumptions, taxes, exchange rates, timing, or required resources change. Work may depend on acceptance and verified payment. Browser callback parameters do not prove payment; payment status is determined through server-side provider verification.</p>
        <p>Cancellation, rescheduling, refund, and non-refundable cost treatment depends on the accepted quotation and work already performed or committed. Nothing in these terms removes non-excludable rights available under applicable law.</p>
      </PolicySection>

      <PolicySection title="Evidence and submitted materials">
        <p>Users must be entitled to provide submitted materials and must use approved secure channels. Users should not upload irrelevant personal data, malware, stolen credentials, or unlawfully obtained material. ShadowNode may preserve integrity and audit records, restrict unsafe content, and retain material when required for an active engagement or applicable obligation.</p>
      </PolicySection>

      <PolicySection title="Intellectual property and permitted use">
        <p>Each party retains rights in material it owned before an engagement. Rights to engagement-specific deliverables are governed by the accepted quotation or written agreement. ShadowNode methods, templates, software, and general know-how remain protected unless expressly assigned. Users may not copy, resell, reverse engineer, or misuse protected platform content except as permitted by law or written agreement.</p>
      </PolicySection>

      <PolicySection title="Technical support, not legal representation">
        <p>Investigative, cybersecurity, forensic, research, training, and operational services provide technical or analytical support. ShadowNode is not acting as the user’s lawyer and does not provide legal representation through the portal. Users should obtain qualified legal advice for legal strategy, admissibility, regulatory duties, or court procedures.</p>
      </PolicySection>

      <PolicySection title="Availability, limitations, and termination">
        <p>Services may be interrupted for maintenance, security, provider failures, emergencies, or circumstances beyond reasonable control. No investigative outcome, recovery, completion date, court acceptance, regulatory result, or uninterrupted availability is guaranteed.</p>
        <p>To the extent permitted by applicable law and any accepted engagement terms, liability may be limited for indirect or consequential losses and to amounts associated with the affected service. The precise enforceability of limitations depends on applicable law. Access may be suspended or terminated for material breach, unlawful use, non-payment, security risk, or legal necessity.</p>
      </PolicySection>
    </PublicPolicyLayout>
  );
}
