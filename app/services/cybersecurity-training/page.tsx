import type { Metadata } from "next";
import { PublicServicePage } from "@/components/public/PublicServicePage";
import { getTrustedApplicationOrigin } from "@/lib/app-origin";

const origin = getTrustedApplicationOrigin();
const canonical = origin
  ? new URL("/services/cybersecurity-training", origin).toString()
  : "/services/cybersecurity-training";

export const metadata: Metadata = {
  title: "Cybersecurity Training",
  description: "Beginner, professional and tailored cybersecurity training for individuals, students, organizations and authorized institutions.",
  alternates: { canonical },
  openGraph: {
    title: "Cybersecurity Training",
    description: "Practical cybersecurity awareness, digital-safety and tailored organizational training.",
    type: "website",
    url: canonical,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Cybersecurity Training",
  description: "Beginner, professional and tailored cybersecurity training for individuals, students, organizations and authorized institutions.",
  url: canonical,
  provider: {
    "@type": "Organization",
    name: "ShadowNode Operations Bureau Limited",
    ...(origin ? { url: origin } : {}),
  },
};

export default function CybersecurityTrainingServicePage() {
  return (
    <PublicServicePage
      title="Cybersecurity Training"
      summary="Practical training for individuals, students, professionals, organizations and authorized institutions, from beginner digital safety and staff awareness to tailored technical programmes."
      requestHref="/dashboard/client/requests/cybersecurity"
      requestLabel="Request cybersecurity training"
      structuredData={structuredData}
      sections={[
        {
          title: "Who training is for",
          items: [
            "Individuals and families building safer digital habits",
            "Students beginning cybersecurity or digital-safety learning",
            "Professionals and technical teams developing practical skills",
            "Organizations improving employee security awareness",
            "Authorized institutions requesting a tailored programme",
          ],
        },
        {
          title: "Supported subject areas",
          items: [
            "Phishing, social engineering, password attacks and malware awareness",
            "Privacy, safe internet use, identity protection and online-scam awareness",
            "Professional topics for SOC, DFIR, OSINT, penetration-testing and security teams",
            "Custom training aligned to an organization's audience, objectives and risk context",
          ],
        },
        {
          title: "Planning and delivery",
          paragraphs: [
            "After review and acceptance, the engagement can include a training plan, scheduled sessions, learning materials, progress records and feedback. Certificates may be issued where the approved programme and completion record support them.",
            "For organizations, the requester provides the intended audience and participant count. Participant access and records are then managed within the authorized training engagement.",
          ],
        },
        {
          title: "What to provide",
          items: [
            "The audience, experience level and approximate participant count",
            "Training objectives and preferred subject areas",
            "Preferred delivery format, dates and scheduling constraints",
            "Organization or institution details where applicable",
            "Accessibility, material or reporting requirements",
          ],
        },
        {
          title: "What happens next",
          paragraphs: [
            "Submitting a request does not create an engagement automatically. The team reviews scope, audience, scheduling and delivery needs before providing a quotation. Training begins only after acceptance and any required payment.",
          ],
        },
      ]}
    />
  );
}
