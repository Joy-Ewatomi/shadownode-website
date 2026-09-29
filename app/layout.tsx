import type { Metadata } from "next";
import { ThreatNodeNetwork } from "@/components/animations/ThreatNodeNetwork";
import { getTrustedApplicationOrigin } from "@/lib/app-origin";
import "./globals.css";

const applicationOrigin = getTrustedApplicationOrigin();

export const metadata: Metadata = {
  metadataBase: applicationOrigin ? new URL(applicationOrigin) : undefined,
  title: {
    default: "SHADOWNODE OPERATIONS BUREAU LIMITED",
    template: "%s | SHADOWNODE OPERATIONS BUREAU LIMITED",
  },
  description:
    "Lawful open-source intelligence and cybersecurity training for authorized clients.",
  alternates: applicationOrigin ? { canonical: "/" } : undefined,
  icons: { icon: "/real1shadownodelogo.png" },
  openGraph: {
    title: "SHADOWNODE OPERATIONS BUREAU LIMITED",
    description:
      "Lawful open-source intelligence and cybersecurity training for authorized clients.",
    type: "website",
    images: [
      {
        url: "/real1shadownodelogo.png",
        alt: "SHADOWNODE OPERATIONS BUREAU LIMITED",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "SHADOWNODE OPERATIONS BUREAU LIMITED",
    description:
      "Lawful open-source intelligence and cybersecurity training for authorized clients.",
    images: ["/real1shadownodelogo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="font-sans antialiased text-foreground min-h-screen relative overflow-x-hidden">
        <ThreatNodeNetwork />
        <div className="relative z-10 w-full">{children}</div>
      </body>
    </html>
  );
}
