import Link from "next/link";

const policyLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/security", label: "Security Policy" },
  { href: "/contact", label: "Contact" },
];

export function PublicPolicyLayout({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-transparent px-5 py-10 text-[#e8f2ec] sm:px-8 sm:py-14">
      <article className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-mono text-xs uppercase text-[#76f0a3] underline decoration-[#27d56e]/60 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27d56e]"
        >
          ShadowNode Operations Bureau
        </Link>
        <header className="mt-8 border-b border-white/10 pb-8">
          <p className="font-mono text-xs uppercase text-[#76f0a3]">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">{description}</p>
        </header>

        <div className="policy-content mt-9 space-y-9 text-base leading-7 text-white/80">
          {children}
        </div>

        <footer className="mt-12 border-t border-white/10 pt-7">
          <p className="text-sm text-white/60">ShadowNode Operations Bureau Limited</p>
          <nav aria-label="Legal and support" className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm">
            {policyLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="min-h-11 content-center text-[#76f0a3] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27d56e]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </footer>
      </article>
    </main>
  );
}

export function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-white sm:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
