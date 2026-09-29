import type { Metadata } from "next";
import { PublicServicePage } from "@/components/public/PublicServicePage";
import { getTrustedApplicationOrigin } from "@/lib/app-origin";

const origin = getTrustedApplicationOrigin();
const canonical = origin ? new URL("/services/osint", origin).toString() : "/services/osint";

export const metadata: Metadata = {
  title: "Lawful Open-Source Intelligence (OSINT)",
  description: "Lawful OSINT research, digital-footprint analysis, domain intelligence, due diligence and documented public-source reporting for authorized clients.",
  alternates: { canonical },
  openGraph: {
    title: "Lawful Open-Source Intelligence (OSINT)",
    description: "Evidence-oriented public-source research and reporting for lawful, authorized investigations.",
    type: "website",
    url: canonical,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Lawful Open-Source Intelligence (OSINT)",
  description: "Evidence-oriented public-source research and reporting for lawful, authorized investigations.",
  url: canonical,
  provider: {
    "@type": "Organization",
    name: "ShadowNode Operations Bureau Limited",
    ...(origin ? { url: origin } : {}),
  },
};

export default function OsintServicePage() {
  return (
    <PublicServicePage
      title="Lawful Open-Source Intelligence (OSINT)"
      summary="OSINT is the structured collection and analysis of information available from lawful public sources. We help authorized clients understand digital activity, document relevant sources and turn scattered public information into a clear report."
      requestHref="/dashboard/client/requests/osint"
      requestLabel="Submit an OSINT request"
      structuredData={structuredData}
      sections={[
        {
          title: "What OSINT can help investigate",
          items: [
            "Public-source identity and digital-footprint research",
            "Domain, website and internet-infrastructure intelligence",
            "Public social-media and username research",
            "Corporate and reputational due diligence",
            "Documentation of relevant public sources for authorized investigations",
          ],
        },
        {
          title: "Evidence-oriented reporting",
          paragraphs: [
            "Where relevant, work records source locations, access timestamps and research context. Reports distinguish observed information from analysis and document important limitations.",
          ],
          items: [
            "A scoped written report",
            "Documented public sources and timestamps where applicable",
            "Relevant findings, analytical context and stated limitations",
            "Preserved public-source material where lawful and technically possible",
          ],
        },
        {
          title: "What to provide",
          items: [
            "A clear question or objective",
            "Known names, usernames, domains, organizations or other lawful starting points",
            "Relevant dates and context",
            "Your authority and lawful purpose for requesting the work",
            "Any deadline and the decisions the report needs to support",
          ],
        },
        {
          title: "Boundaries and limitations",
          paragraphs: [
            "We do not provide hacking, private-account access, unrestricted surveillance or access to confidential government databases. Requests must have a lawful purpose and appropriate authorization.",
            "Public information can be incomplete, outdated or misleading. A correlation between records is not automatic proof of identity, ownership or wrongdoing. Identification, recovery of funds and legal admissibility are never guaranteed.",
          ],
        },
      ]}
    />
  );
}
