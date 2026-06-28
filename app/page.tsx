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
  Terminal,
  EyeOff
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'

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
      <main className="min-h-screen overflow-hidden bg-transparent text-foreground relative">
        
        {/* BASE BACKGROUND DECORATIONS */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),#000_92%)]" />
          <div className="absolute inset-x-0 top-24 h-px bg-primary/10" />
        </div>

        {/* STICKY HEADER NAVIGATION (Layer 3 - z-30) */}
        {/* Keeps links, buttons, and dropdowns safely interactive above the moving canvas nodes */}
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

        {/* HERO INTERFACE COMPONENT PANEL (Layer 3 - z-20) */}
        {/* Pushed to z-20 so it layers perfectly on top of the moving matrix particles */}
        <section className="relative z-20 mx-auto max-w-[1480px] px-5 pb-10 pt-20 sm:px-8 lg:px-16 lg:pt-24">
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

            {/* Terminal Console Layout Window */}
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

        {/* SERVICES CONTENT SECTION (Layer 3 - z-20) */}
        <section id="services" className="relative z-20 mx-auto max-w-[1480px] px-5 py-16 sm:px-8 lg:px-16 space-y-10">
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

            {/* ETHICAL HACKING CARD */}
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

          {/* Drawer Modules Expansion Code */}
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
                        <ul className="space-y-1">
                          <li>• Network Infrastructure Testing</li>
                          <li>• Application Security Assessments</li>
                          <li>• Social Engineering Audits</li>
                          <li>• Physical Security Evaluations</li>
                        </ul>
                      </div>
                      <div>
                        <span className="text-primary font-bold block mb-1.5">// VULNERABILITY ASSESSMENT</span>
                        <ul className="space-y-1">
                          <li>• System Exploitation Profiling</li>
                          <li>• Flaw Categorization Matrix</li>
                          <li>• Exploitability Risk Verification</li>
                          <li>• Strategic Remediation Roadmaps</li>
                        </ul>
                      </div>
                      <div>
                        <span className="text-primary font-bold block mb-1.5">// RED TEAM OPERATIONS</span>
                        <ul className="space-y-1">
                          <li>• Simulated Attack Exercises</li>
                          <li>• Multi-Vector Attack Campaigns</li>
                          <li>• Long-Duration Footprint Probing</li>
                          <li>• Evasion Capability Appraisals</li>
                        </ul>
                      </div>
                      <div>
                        <span className="text-primary font-bold block mb-1.5">// INFRASTRUCTURE REVIEW</span>
                        <ul className="space-y-1">
                          <li>• Architecture Security Diagnostics</li>
                          <li>• Segmentation Architecture Verification</li>
                          <li>• Complete Access Control Auditing</li>
                          <li>• Threat Vector Validation Models</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {activeTrack === 'research' && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary/10 pb-4">
                      <div>
                        <h4 className="text-primary font-bold text-base uppercase">Syndicate Intelligence & Proactive Threat Hunting</h4>
                        <p className="text-white/40 mt-1">Deep threat actor profiling, underground node monitoring, and risk intelligence vectors.</p>
                      </div>
                      <Link href="/request">
                        <Button className="bg-primary text-background font-bold tracking-wider uppercase rounded-sm h-10 px-5 text-xs hover:bg-primary/85">Initiate Research Request</Button>
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-white/70">
                      <div>
                        <span className="text-primary font-bold block mb-1.5">// CYBER THREAT HUNTING</span>
                        <ul className="space-y-1">
                          <li>• Darknet Network Intelligence Mapping</li>
                          <li>• Leaked Credential & Database Tracking</li>
                          <li>• Targeted Attack Surface Auditing</li>
                        </ul>
                      </div>
                      <div>
                        <span className="text-primary font-bold block mb-1.5">// CORPORATE RISK MONITORING</span>
                        <ul className="space-y-1">
                          <li>• Corporate Espionage Vector Analysis</li>
                          <li>• Bad-Actor & Brand Damage Discovery</li>
                          <li>• Inside Threat Detection Paradigms</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {activeTrack === 'consulting' && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary/10 pb-4">
                      <div>
                        <h4 className="text-primary font-bold text-base uppercase">Strategic Operational Security (OPSEC) Architecture</h4>
                        <p className="text-white/40 mt-1">Institutional defense planning, risk management modeling, and physical/digital secure communications integration.</p>
                      </div>
                      <Link href="/request">
                        <Button className="bg-primary text-background font-bold tracking-wider uppercase rounded-sm h-10 px-5 text-xs hover:bg-primary/85">Request Advisory</Button>
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white/70">
                      <div>
                        <span className="text-primary font-bold block mb-1">// SECURE SYSTEMS</span>
                        <ul className="space-y-1">
                          <li>• Zero-Knowledge Workspace Design</li>
                          <li>• Encrypted Network Implementations</li>
                          <li>• Hardened Node Comms Protocols</li>
                        </ul>
                      </div>
                      <div>
                        <span className="text-primary font-bold block mb-1">// EXECUTIVE PROTECTION</span>
                        <ul className="space-y-1">
                          <li>• Digital Footprint Reduction</li>
                          <li>• VIP Travel Profile Assessments</li>
                          <li>• Threat Mitigation Modeling</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </PageTransition>
  )
}
