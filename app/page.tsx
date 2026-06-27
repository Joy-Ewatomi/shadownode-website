'use client'

import { Button } from '@/components/ui/button'
import { PageTransition } from '@/components/animations/PageTransition'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Crosshair,
  Fingerprint,
  Lock,
  Scale,
  Search,
  Shield,
  Target,
  Youtube,
  Linkedin,
  Instagram,
  Github,
} from 'lucide-react'
import Link from 'next/link'

const services = [
  {
    icon: Search,
    title: 'OSINT',
    body: 'Advanced open-source intelligence and cross-platform data correlation for litigation support.',
  },
  {
    icon: Fingerprint,
    title: 'FORENSICS',
    body: 'Cryptographically verified digital forensics and court-ready evidentiary reporting.',
  },
  {
    icon: Crosshair,
    title: 'RESEARCH',
    body: 'Proactive corporate threat hunting and syndicate intelligence mapping.',
  },
  {
    icon: Shield,
    title: 'CONSULTING',
    body: 'Strategic operational security (OPSEC) architecture and institutional risk advisory.',
  },
]

const principles = [
  {
    icon: Shield,
    title: 'OPSEC DRIVEN',
    body: 'Operational security protocols dictate every engagement, protecting both tradecraft and client identity.',
  },
  {
    icon: Scale,
    title: 'LEGAL & ETHICAL',
    body: 'Strictly compliant with NDPA and global data regulations to guarantee absolute courtroom admissibility.',
  },
  {
    icon: Lock,
    title: 'DISCREET & SECURE',
    body: 'Zero-knowledge data management infrastructures ensure client confidentiality is structurally non-negotiable.',
  },
  {
    icon: Target,
    title: 'RESULTS FOCUSED',
    body: 'High-fidelity, actionable intelligence optimized directly for executive leadership and legal counsel decision-making.',
  },
]

const navItems = [
  { label: 'SERVICES', href: '#services' },
  { label: 'ABOUT', href: '#about' },
  { label: 'METHODOLOGY', href: '#methodology' },
  { label: 'REQUEST', href: '/request', active: true },
  { label: 'CONTACT', href: '#contact' },
]

// 🟢 Custom SVG Components for platforms missing from default lucide-react sets
const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
)

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
)

const socialMedia = [
  { name: 'TikTok', icon: TikTokIcon, href: 'https://www.tiktok.com/@shadownodeib?is_from_webapp=1&sender_device=pc' },
  { name: 'YouTube', icon: Youtube, href: 'https://youtube.com/@shadownodeintelligencebureau?si=SoolMlCN1R4Bn4QD' },
  { name: 'LinkedIn', icon: Linkedin, href: 'https://www.youtube.com/@ShadowNodeIntelligenceBureau' },
  { name: 'X', icon: XIcon, href: '#' },
  { name: 'Instagram', icon: Instagram, href: '#' },
  { name: 'GitHub', icon: Github, href: '#' },
]

export default function Home() {
  return (
    <PageTransition>
      <main className="min-h-screen overflow-hidden bg-background text-foreground">
        {/* Background Decorative Grids & Glows */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_30%,rgba(38,185,99,0.16),transparent_26%),radial-gradient(circle_at_28%_18%,rgba(38,185,99,0.1),transparent_22%),linear-gradient(180deg,rgba(4,7,8,0.2),#050808_76%)]" />
          <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(38,185,99,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(38,185,99,0.22)_1px,transparent_1px)] [background-size:68px_68px]" />
          <div className="absolute inset-x-0 top-24 h-px bg-primary/20" />
          <div className="absolute left-1/2 top-28 h-[480px] w-[780px] -translate-x-1/2 opacity-20 [background-image:radial-gradient(rgba(39,213,110,0.9)_1px,transparent_1.4px)] [background-size:8px_8px] [mask-image:radial-gradient(ellipse_at_center,black_0%,black_45%,transparent_72%)]" />
          <div className="absolute right-0 top-28 h-[520px] w-[520px] rounded-full border border-primary/15 opacity-60" />
          <div className="absolute right-16 top-44 h-[360px] w-[360px] rounded-full border border-primary/10" />
        </div>

        {/* Global Navigation Bar */}
        <nav className="sticky top-0 z-30 border-b border-primary/10 bg-background/82 backdrop-blur-xl">
          <div className="mx-auto flex h-24 max-w-[1480px] items-center justify-between px-5 sm:px-8 lg:px-16">
            <Link href="/" className="flex min-w-0 items-center gap-4" aria-label="ShadowNode home">
              <div className="relative grid h-14 w-14 shrink-0 place-items-center">
                <div className="absolute inset-0 bg-primary/20 [clip-path:polygon(50%_0,95%_25%,95%_75%,50%_100%,5%_75%,5%_25%)]" />
                <div className="absolute inset-[3px] bg-background [clip-path:polygon(50%_0,95%_25%,95%_75%,50%_100%,5%_75%,5%_25%)]" />
                <span className="relative font-mono text-base tracking-wider text-white">SIB</span>
              </div>
              <div className="leading-none">
                <div className="font-mono text-xl font-bold tracking-[0.08em] text-white sm:text-2xl">
                  SHADOWNODE
                </div>
                <div className="mt-2 font-mono text-xs tracking-[0.22em] text-primary">
                  INTELLIGENCE BUREAU
                </div>
              </div>
            </Link>

            <div className="hidden items-center gap-10 font-mono text-sm tracking-[0.08em] text-white/78 lg:flex">
              {navItems.map((item) => (
                <Link key={item.label} href={item.href} className="group relative transition hover:text-primary">
                  {item.label}
                  {item.active && (
                    <span className="absolute -right-3 -top-1 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_rgba(39,213,110,0.9)]" />
                  )}
                </Link>
              ))}
            </div>

            <Link href="/request" className="hidden sm:block">
              <Button
                variant="outline"
                className="h-12 rounded-md border-primary/60 bg-transparent px-6 font-mono text-sm tracking-[0.06em] text-white hover:bg-primary/10 hover:text-primary"
              >
                INITIALIZE SECURE PORTAL
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero Segment */}
        <section className="relative z-10 mx-auto max-w-[1480px] px-5 pb-10 pt-20 sm:px-8 lg:px-16 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="mb-6 flex items-center gap-4 font-mono text-sm tracking-[0.08em] text-primary">
                <span className="h-10 w-4 border-y border-l border-primary/45" />
                CLASSIFIED INTELLIGENCE DIVISION
              </div>

              <h1 className="max-w-3xl font-mono text-[clamp(2.7rem,7vw,5.9rem)] font-black uppercase leading-[0.98] text-white">
                <span className="block drop-shadow-[0_0_18px_rgba(255,255,255,0.04)]">Invisible</span>
                <span className="block drop-shadow-[0_0_18px_rgba(255,255,255,0.04)]">Intelligence.</span>
                <span className="block text-primary drop-shadow-[0_0_20px_rgba(39,213,110,0.6)]">
                  Visible Results.
                </span>
              </h1>

              <p className="mt-8 max-w-2xl text-lg leading-8 text-white/72">
                 Institutional-grade digital investigations, threat intelligence, and court-admissible forensics 
                 designed to mitigate enterprise risk and secure legal outcomes.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link href="/request">
                  <Button className="h-14 w-full rounded-md border border-primary/70 bg-primary/10 px-9 font-mono text-base tracking-[0.06em] text-primary shadow-[0_0_28px_rgba(39,213,110,0.08)] hover:bg-primary hover:text-background sm:w-auto">
                    INITIALIZE SECURE PORTAL
                  </Button>
                </Link>
                <Link
                  href="#services"
                  className="inline-flex h-14 items-center gap-4 px-2 font-mono text-base tracking-[0.06em] text-white/88 transition hover:text-primary"
                >
                  LEARN MORE <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </motion.div>

            {/* Terminal Console Component Layout */}
            <motion.div
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12, duration: 0.7 }}
              className="relative"
            >
              <div className="absolute -inset-10 bg-primary/5 blur-3xl" />
              <div className="relative rounded-md border border-white/12 bg-[#070c0d]/82 shadow-[0_0_0_1px_rgba(39,213,110,0.08),0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur">
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 font-mono text-sm">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-primary shadow-[0_0_14px_rgba(39,213,110,0.9)]" />
                    <span className="text-primary">SIB</span>
                    <span className="text-white/45">//</span>
                    <span className="text-white/76">OPERATIONS CONSOLE</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/82">
                    SECURE <Lock className="h-4 w-4 text-primary" />
                  </div>
                </div>

                <div className="space-y-8 p-6 font-mono text-sm sm:p-8">
                  <div>
                    <p className="text-primary">$ whoami</p>
                    <p className="mt-2 text-white/58">shadownode-intelligence-bureau</p>
                  </div>

                  <div>
                    <p className="text-primary">$ cat services.txt</p>
                    <div className="mt-3 space-y-3 rounded border border-primary/20 bg-background/35 p-4">
                      {services.map((service) => (
                        <p key={service.title} className="text-white/58">
                          <span className="mr-2 text-white/32">▸</span>
                          <span className="text-primary">{service.title}:</span> {service.body}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-primary">$ client_status</p>
                    <div className="mt-3 flex items-center gap-3 text-primary">
                      <span>anonymity:</span>
                      <span className="h-4 min-w-0 flex-1 bg-primary/20">
                        <span className="block h-full w-full bg-gradient-to-r from-primary/70 to-primary" />
                      </span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Services Grid Segment */}
        <section id="services" className="relative z-10 mx-auto max-w-[1480px] px-5 py-16 sm:px-8 lg:px-16">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {services.map((service, index) => {
              const Icon = service.icon

              return (
                <motion.article
                  key={service.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.55 }}
                  viewport={{ once: true, amount: 0.2 }}
                  className="group relative min-h-[16rem] overflow-hidden rounded-md border border-primary/25 bg-card/72 p-8 backdrop-blur transition hover:-translate-y-1 hover:border-primary/70 hover:bg-card"
                >
                  <span className="absolute left-0 top-0 h-7 w-7 border-l border-t border-primary/80" />
                  <span className="absolute bottom-0 right-0 h-7 w-7 border-b border-r border-primary/80" />
                  <Icon className="mb-7 h-14 w-14 text-primary transition group-hover:drop-shadow-[0_0_16px_rgba(39,213,110,0.45)]" strokeWidth={1.45} />
                  <h2 className="font-mono text-2xl font-bold tracking-[0.04em] text-white">{service.title}</h2>
                  <p className="mt-4 leading-7 text-white/58">{service.body}</p>
                  <Link
                    href="/request"
                    className="mt-9 inline-flex items-center gap-3 font-mono text-sm tracking-[0.08em] text-primary"
                  >
                    LEARN MORE <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.article>
              )
            })}
          </div>
        </section>

        {/* About & Operational Principles Segment */}
        <section id="about" className="relative z-10 border-t border-primary/10 bg-[#070b0c]/70 pt-20 pb-12">
          <div className="mx-auto max-w-[1480px] px-5 sm:px-8 lg:px-16 mb-12">
            <p className="font-mono text-sm tracking-[0.12em] text-primary">OPERATIONAL POSTURE</p>
            <h2 className="mt-4 font-mono text-3xl font-bold uppercase text-white sm:text-4xl">
              Core Directives & Compliance
            </h2>
          </div>
          
          <div className="border-b border-primary/10 pb-12">
            <div className="mx-auto grid max-w-[1480px] gap-8 px-5 sm:px-8 md:grid-cols-2 lg:grid-cols-4 lg:px-16">
              {principles.map((principle) => {
                const Icon = principle.icon

                return (
                  <div key={principle.title} className="flex gap-5 lg:border-r lg:border-primary/20 lg:last:border-r-0">
                    <Icon className="mt-1 h-10 w-10 shrink-0 text-primary" strokeWidth={1.35} />
                    <div>
                      <h3 className="font-mono text-sm tracking-[0.08em] text-white">{principle.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/54">{principle.body}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Investigative Methodology Segment */}
        <section
          id="methodology"
          className="relative z-10 mx-auto grid max-w-[1480px] gap-8 px-5 py-24 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-16"
        >
          <div>
            <p className="font-mono text-sm tracking-[0.12em] text-primary">METHODOLOGY</p>
            <h2 className="mt-4 max-w-2xl font-mono text-3xl font-bold uppercase leading-tight text-white sm:text-5xl">
              Quiet process. Verifiable intelligence.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {['Scope', 'Collect', 'Report'].map((step, index) => (
              <div key={step} className="rounded-md border border-primary/18 bg-card/62 p-6">
                <p className="font-mono text-primary">0{index + 1}</p>
                <h3 className="mt-5 font-mono text-xl text-white">{step}</h3>
                <p className="mt-3 text-sm leading-6 text-white/56">
                  {index === 0 && 'Define tactical objectives, asset parameters, cross-border jurisdictions, and evidentiary standards.'}
                  {index === 1 && 'Gather, preserve, and cryptographically validate intelligence through chain-of-custody workflows.'}
                  {index === 2 && 'Compile institutional-grade, peer-reviewed findings optimized for executive boards and courtroom litigation.'}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Encrypted Intake Engagement / Contact Segment */}
        <section id="contact" className="relative z-10 mx-auto max-w-[1480px] px-5 pt-12 pb-20 sm:px-8 lg:px-16">
          <div className="rounded-md border border-primary/25 bg-primary/5 p-8 sm:flex sm:items-center sm:justify-between sm:p-10 shadow-[0_0_50px_rgba(39,213,110,0.02)]">
            <div>
              <p className="font-mono text-sm tracking-[0.12em] text-primary">ENCRYPTED CASE INTAKE ACTIVE</p>
              <h2 className="mt-3 font-mono text-2xl font-bold uppercase text-white sm:text-3xl">
                Establish a Secure Intake Engagement
              </h2>
            </div>
            <Link href="/request" className="mt-6 block sm:mt-0">
              <Button className="h-14 w-full rounded-md bg-primary px-8 font-mono text-background hover:bg-primary/85 sm:w-auto shadow-[0_0_20px_rgba(39,213,110,0.2)]">
                INITIALIZE SECURE PORTAL
              </Button>
            </Link>
          </div>
        </section>

        {/* Global Terminal Footer with Social Media Connect Grid */}
        <footer className="relative z-10 border-t border-primary/10 bg-background/50 px-5 py-12 text-center font-mono text-xs tracking-[0.08em] text-white/42 sm:px-8 backdrop-blur-sm">
          <div className="mx-auto max-w-[1480px] flex flex-col items-center gap-6">
            <p>© 2026 SHADOWNODE INTELLIGENCE BUREAU. ALL INQUIRIES CONFIDENTIAL.</p>
            
            <p className="text-xs">
              STATUS: <span className="text-primary animate-pulse font-bold">OPERATIONAL</span>
            </p>

            {/* 🚀 Social Media Platform Grid Placeholder Layout */}
            <div className="mt-4 flex flex-wrap justify-center gap-6 border-t border-primary/5 pt-6 w-full max-w-xl">
              {socialMedia.map((platform) => {
                const Icon = platform.icon
                return (
                  <Link
                    key={platform.name}
                    href={platform.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 rounded border border-primary/10 bg-primary/5 px-3 py-1.5 transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                    aria-label={`ShadowNode on ${platform.name}`}
                  >
                    <Icon className="h-4 w-4 text-white/60 transition-colors group-hover:text-primary" />
                    <span className="text-[10px] tracking-[0.12em] text-white/40 group-hover:text-primary">
                      {platform.name.toUpperCase()}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </footer>
      </main>
    </PageTransition>
  )
}
