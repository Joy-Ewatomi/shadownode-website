'use client'

import { Button } from '@/components/ui/button'
import { PageTransition } from '@/components/animations/PageTransition'
import { AnimatePresence, motion } from 'framer-motion'
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
  ArrowUpRight,
  Terminal,
  EyeOff
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'

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
    icon: EyeOff,
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
  { name: 'TikTok', icon: TikTokIcon, href: 'https://www.tiktok.com/@shadownodeib' },
  { name: 'YouTube', icon: Youtube, href: 'https://youtube.com/@shadownodeintelligencebureau' },
  { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com' },
  { name: 'X', icon: XIcon, href: 'https://x.com/Joy_Elvera' },
  { name: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/shadownodeintelligence' },
  { name: 'GitHub', icon: Github, href: 'https://github.com/Joy-Ewatomi' },
]

export default function Home() {
  const [activeTrack, setActiveTrack] = useState<string | null>(null)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifySuccess, setNotifySuccess] = useState<string | null>(null)

  const handleNotifySubmit = (e: FormEvent, track: string) => {
    e.preventDefault()
    if (notifyEmail) {
      setNotifySuccess(track)
      setNotifyEmail('')
    }
  }

  return (
    <PageTransition>
      <main className="relative min-h-screen overflow-hidden bg-transparent text-foreground">
        {/* Background tint sits above the global canvas without hiding the node network. */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.2)_92%)]" />
          <div className="absolute inset-x-0 top-24 h-px bg-primary/10" />
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
                 Institutional-grade digital investigations, threat intelligence, ethical hacking, and court-admissible forensics 
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
                      <p className="text-white/58"><span className="text-primary">OSINT:</span> Advanced open-source intelligence and data correlation.</p>
                      <p className="text-white/58"><span className="text-primary">FORENSICS:</span> Cryptographically verified tracking. [Jan 2027]</p>
                      <p className="text-white/58"><span className="text-primary">RED-TEAMING:</span> Authorized security testing & pentesting. [Apr 2027]</p>
                      <p className="text-white/58"><span className="text-primary">RESEARCH:</span> Corporate threat hunting and syndicate intelligence mapping.</p>
                      <p className="text-white/58"><span className="text-primary">CONSULTING:</span> Strategic OPSEC architecture and risk advisory.</p>
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

        {/* Dynamic & Complete Service Cards Grid Section */}
        <section id="services" className="relative z-10 mx-auto max-w-[1480px] px-5 py-16 sm:px-8 lg:px-16 space-y-10">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            
            {/* OSINT CARD */}
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group relative min-h-[16rem] overflow-hidden rounded-md border border-primary/25 bg-card/72 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-primary/70"
            >
              <span className="absolute left-0 top-0 h-7 w-7 border-l border-t border-primary/80" />
              <span className="absolute bottom-0 right-0 h-7 w-7 border-b border-r border-primary/80" />
              <Search className="mb-7 h-12 w-12 text-primary transition group-hover:drop-shadow-[0_0_16px_rgba(39,213,110,0.45)]" strokeWidth={1.45} />
              <h2 className="font-mono text-xl font-bold tracking-[0.04em] text-white">OSINT</h2>
              <p className="mt-4 leading-6 text-white/58 text-xs">
                Advanced open-source intelligence and cross-platform data correlation for litigation support, background verification, and fraud investigation.
              </p>
              <button
                onClick={() => setActiveTrack(activeTrack === 'osint' ? null : 'osint')}
                className="mt-9 inline-flex items-center gap-3 font-mono text-xs tracking-[0.08em] text-primary hover:underline text-left"
              >
                {activeTrack === 'osint' ? 'CLOSE MODULE —' : 'LEARN MORE →'}
              </button>
            </motion.article>

            {/* FORENSICS CARD */}
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group relative min-h-[16rem] overflow-hidden rounded-md border border-primary/25 bg-card/72 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-primary/70"
            >
              <span className="absolute left-0 top-0 h-7 w-7 border-l border-t border-primary/80" />
              <span className="absolute bottom-0 right-0 h-7 w-7 border-b border-r border-primary/80" />
              <div className="flex items-center justify-between mb-7">
                <Fingerprint className="h-12 w-12 text-primary transition group-hover:drop-shadow-[0_0_16px_rgba(39,213,110,0.45)]" strokeWidth={1.45} />
                <span className="text-[9px] font-mono text-primary border border-primary/30 bg-primary/5 px-2 py-0.5 rounded uppercase font-bold">Jan 2027</span>
              </div>
              <h2 className="font-mono text-xl font-bold tracking-[0.04em] text-white">FORENSICS</h2>
              <p className="mt-4 leading-6 text-white/58 text-xs">
                Cryptographically verified digital forensics and court-ready evidentiary reporting. Available January 2027.
              </p>
              <button
                onClick={() => setActiveTrack(activeTrack === 'forensics' ? null : 'forensics')}
                className="mt-9 inline-flex items-center gap-3 font-mono text-xs tracking-[0.08em] text-primary hover:underline text-left"
              >
                {activeTrack === 'forensics' ? 'CLOSE MODULE —' : 'LEARN MORE →'}
              </button>
            </motion.article>

            {/* ETHICAL HACKING & PENETRATION TESTING CARD */}
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group relative min-h-[16rem] overflow-hidden rounded-md border border-primary/25 bg-card/72 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-primary/70"
            >
              <span className="absolute left-0 top-0 h-7 w-7 border-l border-t border-primary/80" />
              <span className="absolute bottom-0 right-0 h-7 w-7 border-b border-r border-primary/80" />
              <div className="flex items-center justify-between mb-7">
                <Terminal className="h-12 w-12 text-primary transition group-hover:drop-shadow-[0_0_16px_rgba(39,213,110,0.45)]" strokeWidth={1.45} />
                <span className="text-[9px] font-mono text-primary border border-primary/30 bg-primary/5 px-2 py-0.5 rounded uppercase font-bold">Apr 2027</span>
              </div>
              <h2 className="font-mono text-xl font-bold tracking-[0.04em] text-white">PENTESTING</h2>
              <p className="mt-4 leading-6 text-white/58 text-xs">
                Authorized security testing, red team simulation operations, and infrastructure validation tracking. Available April 2027.
              </p>
              <button
                onClick={() => setActiveTrack(activeTrack === 'hacking' ? null : 'hacking')}
                className="mt-9 inline-flex items-center gap-3 font-mono text-xs tracking-[0.08em] text-primary hover:underline text-left"
              >
                {activeTrack === 'hacking' ? 'CLOSE MODULE —' : 'LEARN MORE →'}
              </button>
            </motion.article>

            {/* RESEARCH CARD */}
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group relative min-h-[16rem] overflow-hidden rounded-md border border-primary/25 bg-card/72 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-primary/70"
            >
              <span className="absolute left-0 top-0 h-7 w-7 border-l border-t border-primary/80" />
              <span className="absolute bottom-0 right-0 h-7 w-7 border-b border-r border-primary/80" />
              <Crosshair className="mb-7 h-12 w-12 text-primary transition group-hover:drop-shadow-[0_0_16px_rgba(39,213,110,0.45)]" strokeWidth={1.45} />
              <h2 className="font-mono text-xl font-bold tracking-[0.04em] text-white">RESEARCH</h2>
              <p className="mt-4 leading-6 text-white/58 text-xs">
                Proactive corporate threat hunting and syndicate intelligence mapping for strategic foresight and security planning.
              </p>
              <button
                onClick={() => setActiveTrack(activeTrack === 'research' ? null : 'research')}
                className="mt-9 inline-flex items-center gap-3 font-mono text-xs tracking-[0.08em] text-primary hover:underline text-left"
              >
                {activeTrack === 'research' ? 'CLOSE MODULE —' : 'LEARN MORE →'}
              </button>
            </motion.article>

            {/* CONSULTING CARD */}
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group relative min-h-[16rem] overflow-hidden rounded-md border border-primary/25 bg-card/72 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-primary/70"
            >
              <span className="absolute left-0 top-0 h-7 w-7 border-l border-t border-primary/80" />
              <span className="absolute bottom-0 right-0 h-7 w-7 border-b border-r border-primary/80" />
              <Shield className="mb-7 h-12 w-12 text-primary transition group-hover:drop-shadow-[0_0_16px_rgba(39,213,110,0.45)]" strokeWidth={1.45} />
              <h2 className="font-mono text-xl font-bold tracking-[0.04em] text-white">CONSULTING</h2>
              <p className="mt-4 leading-6 text-white/58 text-xs">
                Strategic operational security (OPSEC) architecture and institutional risk advisory for corporate and executive protection.
              </p>
              <button
                onClick={() => setActiveTrack(activeTrack === 'consulting' ? null : 'consulting')}
                className="mt-9 inline-flex items-center gap-3 font-mono text-xs tracking-[0.08em] text-primary hover:underline text-left"
              >
                {activeTrack === 'consulting' ? 'CLOSE MODULE —' : 'LEARN MORE →'}
              </button>
            </motion.article>

          </div>

          {/* Expandable Module Sub-Drawer Content Panel */}
          <AnimatePresence mode="wait">
            {activeTrack && (
              <motion.div
                key={activeTrack}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="border border-primary/20 bg-[#040809]/95 rounded p-6 sm:p-8 font-mono text-xs space-y-6 shadow-2xl relative"
              >
                {activeTrack === 'osint' && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary/10 pb-4">
                      <div>
                        <h4 className="text-primary font-bold text-base uppercase">Open Source Intelligence Framework</h4>
                        <p className="text-white/40 mt-1">Direct unearthing of public networks, digital footprints, and cross-platform correlation parameters.</p>
                      </div>
                      <Link href="/request">
                        <Button className="bg-primary text-background font-bold tracking-wider uppercase rounded-sm h-10 px-5 text-xs hover:bg-primary/85">Request Consultation</Button>
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-white/70">
                      <div>
                        <span className="text-primary font-bold block mb-1.5">// KEY SERVICES</span>
                        <ul className="space-y-1">
                          <li>• Mobile & Digital Device OSINT Identification</li>
                          <li>• Target Communication History Reconstruction</li>
                          <li>• Browser Cache & Historical Target Discovery</li>
                          <li>• Global Geolocation Metadata Extractions</li>
                        </ul>
                      </div>
                      <div>
                        <span className="text-primary font-bold block mb-1.5">// TARGET LOGICS</span>
                        <ul className="space-y-1">
                          <li>• Platform Cross-Correlation Schemes</li>
                          <li>• Documented Background Profile Verification</li>
                          <li>• Deep-Web Domain Infrastructure Audits</li>
                          <li>• Litigation Evidence Package Accumulation</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {activeTrack === 'forensics' && (
                  <>
                    <div className="border-b border-primary/10 pb-4">
                      <h4 className="text-primary font-bold text-base uppercase">Cryptographically Verified Digital Forensics</h4>
                      <p className="text-white/40 mt-1">Court-admissible file structure capture, drive imaging, and strict chain-of-custody protocols.</p>
                      <p className="text-primary/90 text-[11px] font-bold mt-2">🚨 ACTIVE LAUNCH VECTOR STATUS: ONLINE JANUARY 2027</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white/70">
                      <div>
                        <span className="text-primary font-bold block mb-1">// HARDWARE DATA</span>
                        <ul className="space-y-1">
                          <li>• Mobile Device (iOS, Android) Extraction</li>
                          <li>• Hard Drive Analysis & Master Imaging</li>
                          <li>• Hard Core Deleted Data Recovery</li>
                        </ul>
                      </div>
                      <div>
                        <span className="text-primary font-bold block mb-1">// SYSTEM MATRICES</span>
                        <ul className="space-y-1">
                          <li>• Cloud Storage Architecture Auditing</li>
                          <li>• Email Account Communication Forensics</li>
                          <li>• Cryptocurrency Wallet Node Metrics</li>
                        </ul>
                      </div>
                      <div>
                        <span className="text-primary font-bold block mb-1">// EVIDENCE POSTURE</span>
                        <ul className="space-y-1">
                          <li>• Strict Chain-of-custody Logging</li>
                          <li>• System Compromise Timeline Layouts</li>
                          <li>• Expert Courtroom Witness Report Generation</li>
                        </ul>
                      </div>
                    </div>
                    <div className="bg-primary/[0.03] border border-primary/20 p-4 rounded max-w-xl">
                      {notifySuccess === 'forensics' ? (
                        <p className="text-primary font-bold">✓ Track verified. You will be alerted immediately at launch in January 2027.</p>
                      ) : (
                        <form onSubmit={(e: FormEvent) => handleNotifySubmit(e, 'forensics')} className="space-y-2">
                          <label className="text-white/60 font-bold block">Get Notified At Launch Vector:</label>
                          <div className="flex gap-2">
                            <Input 
                              type="email" 
                              required 
                              value={notifyEmail} 
                              onChange={(e) => setNotifyEmail(e.target.value)} 
                              placeholder="Secure routing proxy address..." 
                              className="bg-background border-primary/10 text-xs h-9 text-white" 
                            />
                            <Button type="submit" className="bg-primary text-background text-xs font-bold px-4 h-9 hover:bg-primary/80">Monitor</Button>
                          </div>
                        </form>
                      )}
                    </div>
                  </>
                )}

                {activeTrack === 'hacking' && (
                  <>
                    <div className="border-b border-primary/10 pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-primary font-bold text-base uppercase">Ethical Hacking & Penetration Testing</h4>
                          <p className="text-white/40 mt-1">Authorized security testing, defensive mapping, and simulated environment campaigns targeting corporate architecture.</p>
                        </div>
                        <span className="text-[10px] font-mono text-primary border border-primary/30 bg-primary/5 px-2 py-1 rounded uppercase font-bold self-start sm:self-center">LAUNCHING APRIL 2027</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 text-white/70">
                      <div>
                        <span className="text-primary font-bold block mb-1.5">// PENETRATION TESTING</span>
                        <ul className="space-y-1 text-white/50">
                          <li>• Network Infrastructure Testing</li>
                          <li>• Application Security Assessments</li>
                          <li>• Social Engineering Audits</li>
                          <li>• Physical Security Evaluations</li>
                        </ul>
                      </div>
                      <div>
                        <span className="text-primary font-bold block mb-1.5">// VULNERABILITY ASSESSMENT</span>
                        <ul className="space-y-1 text-white/50">
                          <li>• System Exploitation Profiling</li>
                          <li>• Flaw Categorization Matrix</li>
                          <li>• Exploitability Risk Verification</li>
                          <li>• Strategic Remediation Roadmaps</li>
                        </ul>
                      </div>
                      <div>
                        <span className="text-primary font-bold block mb-1.5">// RED TEAM OPERATIONS</span>
                        <ul className="space-y-1 text-white/50">
                          <li>• Simulated Attack Exercises</li>
                          <li>• Multi-Vector Attack Campaigns</li>
                          <li>• Long-Duration Footprint Probing</li>
                          <li>• Evasion Capability Appraisals</li>
                        </ul>
                      </div>
                      <div>
                        <span className="text-primary font-bold block mb-1.5">// INFRASTRUCTURE REVIEW</span>
                        <ul className="space-y-1 text-white/50">
                          <li>• Architecture Security Diagnostics</li>
                          <li>• Segmentation Architecture Verification</li>
                          <li>• Complete Access Control Auditing</li>
                          <li>• Threat Vector Validation Models</li>
                        </ul>
                      </div>
                      <div>
                        <span className="text-primary font-bold block mb-1.5">// SECURE CODE REVIEW</span>
                        <ul className="space-y-1 text-white/50">
                          <li>• Source Code Analysis Schematics</li>
                          <li>• Vulnerability Detection Audits</li>
                          <li>• OWASP Compliance Checklists</li>
                          <li>• Secure Pipeline Integration Guides</li>
                        </ul>
                      </div>
                      <div>
                        <span className="text-primary font-bold block mb-1.5">// AWARENESS TRAINING</span>
                        <ul className="space-y-1 text-white/50">
                          <li>• Controlled Phishing Campaigns</li>
                          <li>• Dynamic Employee Attack Readiness</li>
                          <li>• Password Security Operations</li>
                          <li>• Social Engineering Countermeasures</li>
                        </ul>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-primary font-bold block mb-1.5">// INCIDENT RESPONSE SIMULATION</span>
                        <ul className="space-y-1 text-white/50">
                          <li>• Data Breach Scenario Tabletop Deployments</li>
                          <li>• Response Workflow Validation Runs</li>
                          <li>• Operational Team Readiness Assessment</li>
                          <li>• Continuity Plan Strategic Validation</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center pt-4 border-t border-primary/10">
                      <div className="bg-primary/[0.03] border border-primary/20 p-4 rounded max-w-xl w-full">
                        {notifySuccess === 'hacking' ? (
                          <p className="text-primary font-bold">✓ Direct routing active. Your system will be flagged at operational deployment in April 2027.</p>
                        ) : (
                          <form onSubmit={(e: FormEvent) => handleNotifySubmit(e, 'hacking')} className="space-y-2">
                            <label className="text-white/60 font-bold block text-[11px]">QUEUE LAUNCH VERIFICATION MONITORING:</label>
                            <div className="flex gap-2">
                              <Input 
                                type="email" 
                                required 
                                value={notifyEmail} 
                                onChange={(e) => setNotifyEmail(e.target.value)} 
                                placeholder="Secure matrix alert routing link..." 
                                className="bg-background border-primary/10 text-xs h-9 text-white" 
                              />
                              <Button type="submit" className="bg-primary text-background text-xs font-bold px-4 h-9 hover:bg-primary/80 shrink-0">GET NOTIFIED</Button>
                            </div>
                          </form>
                        )}
                      </div>
                      <Link href="/request" className="w-full sm:w-auto self-stretch sm:self-auto flex">
                        <Button variant="outline" className="border-primary/50 text-primary bg-primary/5 text-xs font-bold tracking-wider uppercase rounded-sm h-full sm:h-12 px-6 w-full hover:bg-primary hover:text-background">REQUEST PRE-LAUNCH CONSULTATION</Button>
                      </Link>
                    </div>
                  </>
                )}

                {activeTrack === 'research' && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary/10 pb-4">
                      <div>
                        <h4 className="text-primary font-bold text-base uppercase">Research & Threat Intelligence</h4>
                        <p className="text-white/40 mt-1">Proactive threat tracking, organized group profiling, and strategic foresight reports.</p>
                      </div>
                      <Link href="/request">
                        <Button className="bg-primary text-background font-bold tracking-wider uppercase rounded-sm h-10 px-5 text-xs hover:bg-primary/85">Request Consultation</Button>
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-white/70">
                      <div>
                        <span className="text-primary font-bold block mb-1.5">// COMBAT ENVIRONMENTS</span>
                        <ul className="space-y-1">
                          <li>• Corporate Threat Hunting Operations</li>
                          <li>• Criminal Syndicate Map Layouts</li>
                          <li>• Asset Theft/Fraud Group Identification</li>
                        </ul>
                      </div>
                      <div>
                        <span className="text-primary font-bold block mb-1.5">// STRATEGIC COMPLIANCE</span>
                        <ul className="space-y-1">
                          <li>• Sanction List Verification Records</li>
                          <li>• Supply Chain Vulnerability Mapping</li>
                          <li>• High-Value Competitor Threat Assessment</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {activeTrack === 'consulting' && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary/10 pb-4">
                      <div>
                        <h4 className="text-primary font-bold text-base uppercase">Operational Security & Strategic Advisory</h4>
                        <p className="text-white/40 mt-1">C-level threat mitigation blueprints, personal digital footprint scaling, and evidentiary guidance.</p>
                      </div>
                      <Link href="/request">
                        <Button className="bg-primary text-background font-bold tracking-wider uppercase rounded-sm h-10 px-5 text-xs hover:bg-primary/85">Request Consultation</Button>
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-white/70">
                      <div>
                        <span className="text-primary font-bold block mb-1.5">// DEFENSIVE OPSEC</span>
                        <ul className="space-y-1">
                          <li>• Tailored Information Security Design</li>
                          <li>• Active Threat Model Architectures</li>
                          <li>• Executive Footprint Reduction Auditing</li>
                        </ul>
                      </div>
                      <div>
                        <span className="text-primary font-bold block mb-1.5">// ENTERPRISE RISK</span>
                        <ul className="space-y-1">
                          <li>• Organization-wide Security Gap Analysis</li>
                          <li>• Legal Evidence Admissibility Consultation</li>
                          <li>• Operational Intelligence Capability Vetting</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Integrated Intelligence Packages Segment */}
        <section className="relative z-10 mx-auto max-w-[1480px] px-5 sm:px-8 lg:px-16">
          <div className="bg-[#05090a]/50 border border-primary/10 rounded-md p-6 sm:p-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-primary/10 pb-4 gap-4">
              <div className="space-y-1">
                <h2 className="font-mono text-xs font-bold tracking-[0.2em] text-primary uppercase">Integrated Intelligence Packages</h2>
                <p className="font-mono text-[11px] text-white/40">Synthesized multi-vector bundles combining core fields for complex corporate and judicial operations.</p>
              </div>
              <Link href="/request" className="font-mono text-xs text-primary hover:underline flex items-center gap-1.5">
                View All Package Options <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
              <div className="border border-primary/5 bg-[#030607]/90 rounded p-5 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Fraud Investigation Complete</h4>
                <p className="text-[11px] text-white/40 leading-5">Merges cross-platform open source mapping, storage diagnostic extractions, and network mapping to compile fully court-admissible action reports.</p>
              </div>
              <div className="border border-primary/5 bg-[#030607]/90 rounded p-5 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Corporate Due Diligence Complete</h4>
                <p className="text-[11px] text-white/40 leading-5">Deploys deep-vector corporate asset hunting, structural vulnerability profiling, and background mapping on organization principals prior to M&A ventures.</p>
              </div>
              <div className="border border-primary/5 bg-[#030607]/90 rounded p-5 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Security Threat Assessment Complete</h4>
                <p className="text-[11px] text-white/40 leading-5">Uncovers and catalogues total public enterprise footprint exposures, tracks active external actors, and deploys high-grade OPSEC defenses.</p>
              </div>
              <div className="border border-primary/5 bg-[#030607]/90 rounded p-5 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Litigation Support Complete</h4>
                <p className="text-[11px] text-white/40 leading-5">Pairs advanced target intelligence gathering with verified cryptographic evidence parameters to prepare robust, expert-witness legal filings.</p>
              </div>
            </div>
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
                  {index === 0 && 'Define tactical objectives, asset parameters, cross-border jurisdictions, and security baseline metrics.'}
                  {index === 1 && 'Gather intelligence, exploit network flaws with authorization boundaries, and log step-by-step verification proofs.'}
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

            {/* Social Media Platform Grid Placeholder Layout */}
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
