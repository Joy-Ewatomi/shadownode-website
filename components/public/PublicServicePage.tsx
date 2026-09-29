import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";

type ContentSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

type PublicServicePageProps = {
  title: string;
  summary: string;
  requestHref: string;
  requestLabel: string;
  sections: ContentSection[];
  structuredData: Record<string, unknown>;
};

const workflow = [
  "Submit a request through the authenticated portal",
  "Administrative review",
  "Quotation",
  "Acceptance and payment",
  "Engagement",
];

export function PublicServicePage({
  title,
  summary,
  requestHref,
  requestLabel,
  sections,
  structuredData,
}: PublicServicePageProps) {
  return (
    <main className="relative min-h-screen overflow-x-hidden text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="min-w-0 font-mono text-sm font-bold uppercase text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            ShadowNode Operations Bureau
          </Link>
          <nav aria-label="Public navigation" className="flex items-center gap-4 text-sm">
            <Link className="text-white/75 hover:text-primary" href="/request">
              Request
            </Link>
            <Link className="text-white/75 hover:text-primary" href="/contact">
              Contact
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-white/10 px-4 pb-14 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs font-bold uppercase text-primary">
            Available now
          </p>
          <h1 className="mt-4 max-w-4xl font-mono text-4xl font-black uppercase leading-tight text-white sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/80">
            {summary}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={requestHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 font-mono text-sm font-bold uppercase text-background transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {requestLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/request"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/20 px-6 py-3 font-mono text-sm font-bold uppercase text-white transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Client portal access
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
          {sections.map((section) => (
            <section key={section.title} aria-labelledby={section.title.toLowerCase().replaceAll(" ", "-")}>
              <h2
                id={section.title.toLowerCase().replaceAll(" ", "-")}
                className="font-mono text-xl font-bold uppercase text-white"
              >
                {section.title}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-4 leading-7 text-white/75">
                  {paragraph}
                </p>
              ))}
              {section.items ? (
                <ul className="mt-4 space-y-3">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3 leading-7 text-white/75">
                      <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </div>

      <section className="border-y border-white/10 bg-black/25 px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="service-workflow">
        <div className="mx-auto max-w-6xl">
          <h2 id="service-workflow" className="font-mono text-2xl font-bold uppercase text-white">
            How an engagement begins
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {workflow.map((step, index) => (
              <li key={step} className="border-l-2 border-primary/60 pl-4 text-sm leading-6 text-white/75">
                <span className="block font-mono text-xs text-primary">0{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-8 flex gap-3 border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-white/75">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <p>
              Submit sensitive case or training information only through the authenticated portal, not ordinary email.
            </p>
          </div>
        </div>
      </section>

      <footer className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 text-sm text-white/65 sm:flex-row sm:items-center sm:justify-between">
          <p>ShadowNode Operations Bureau Limited</p>
          <nav aria-label="Legal and contact links" className="flex flex-wrap gap-x-5 gap-y-3">
            <Link href="/privacy" className="hover:text-primary">Privacy</Link>
            <Link href="/terms" className="hover:text-primary">Terms</Link>
            <Link href="/security" className="hover:text-primary">Security</Link>
            <Link href="/contact" className="hover:text-primary">Contact</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
