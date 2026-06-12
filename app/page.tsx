'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useState } from 'react'

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-900 to-background">
      {/* Grid background effect */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(90deg, #94e945 1px, transparent 1px), linear-gradient(#00ff41 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="border-b border-border/30 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center flex-shrink-0">
                <span className="text-primary-foreground font-bold text-sm">SIB</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-primary truncate">SHADOWNODE INTELLIGENCE BUREAU</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 ml-4">
              <Link href="/request" className="text-xs sm:text-sm text-foreground/70 hover:text-primary transition whitespace-nowrap">
                New Request
              </Link>
              <Link href="/login" className="text-xs sm:text-sm text-foreground/70 hover:text-primary transition whitespace-nowrap">
                Login
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <div className="inline-block mb-4 sm:mb-6 px-3 sm:px-4 py-2 rounded border border-primary/30 bg-primary/5 text-primary text-xs sm:text-sm font-mono">
                &gt; CLASSIFIED INTELLIGENCE DIVISION
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6 text-balance leading-tight">
                <span className="text-primary">Invisible</span> Intelligence.<br />
                <span className="text-secondary">Visible</span> Results.
              </h1>
              
              <p className="text-base sm:text-lg lg:text-xl text-foreground/70 mb-6 sm:mb-8 max-w-xl leading-relaxed">
                <p>Professional intelligence bureau specializing in digital investigations.</p>
                <p>OSINT: Open-source intelligence gathering and investigative research.</p>
                <p>FORENSICS: Digital evidence analysis, chain-of-custody compliance, court-admissible documentation.</p>
                <p>SECURITY RESEARCH: Understanding attack methodologies and system vulnerabilities to strengthen client security posture.</p>
                <p>Professional methodology. Institutional-grade standards.</p>
                <p>Invisible intelligence. Visible results.</p>
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link href="/request" className="w-full sm:w-auto">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm sm:text-base px-6 sm:px-8 py-5 sm:py-6">
                    Initiate Request
                  </Button>
                </Link>
                <Link href="#services" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full border-secondary/50 text-secondary hover:bg-secondary/10 text-sm sm:text-base px-6 sm:px-8 py-5 sm:py-6">
                    Explore Services
                  </Button>
                </Link>
              </div>

              <p className="mt-6 sm:mt-8 text-xs sm:text-sm text-foreground/50 font-mono">
                Status: <span className="text-primary">OPERATIONAL</span> | Uptime: 99.97%
              </p>
            </div>

            <div className="relative hidden sm:block">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur-3xl" />
              <div className="relative bg-card border border-border/30 rounded-lg p-6 sm:p-8 backdrop-blur">
                <div className="space-y-4 font-mono text-xs sm:text-sm">
                  <div>
                    <span className="text-muted-foreground">$</span>
                    <span className="text-foreground ml-2">whoami</span>
                  </div>
                  <div className="text-primary ml-4">shadownode-intelligence-bureau</div>
                  
                  <div className="mt-6">
                    <span className="text-muted-foreground">$</span>
                    <span className="text-foreground ml-2">cat services.txt</span>
                  </div>
                  <div className="text-secondary ml-4 space-y-2">
                    <div>├─ OSINT: Open-source intelligence gathering</div>
                    <div>├─ FORENSICS: Digital evidence analysis</div>
                    <div>├─ HACKING: Ethical penetration testing</div>
                    <div>└─ SECURE: End-to-end encrypted comms</div>
                  </div>

                  <div className="mt-6">
                    <span className="text-muted-foreground">$</span>
                    <span className="text-foreground ml-2">client_status</span>
                  </div>
                  <div className="text-accent ml-4">anonymity: ████████████ 100%</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-4xl font-bold mb-3 sm:mb-4">Our Services</h2>
            <p className="text-sm sm:text-base lg:text-lg text-foreground/60 max-w-2xl">
              Your specific intelligence requirements handled by our elite team of analysts, forensic specialists, and security professionals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* OSINT Card */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition duration-300" />
              <div className="relative bg-card border border-border/30 hover:border-primary/50 rounded-lg p-6 sm:p-8 transition duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-sm sm:text-base flex-shrink-0">
                    01
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold">OSINT</h3>
                </div>
                <p className="text-foreground/70 mb-4">
                  Open-source intelligence gathering from public data, social networks, and web infrastructure. Comprehensive intelligence profiles in 24-48 hours.
                </p>
                <ul className="space-y-2 text-sm text-foreground/60">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-primary rounded-full" />
                    Individual background checks
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-primary rounded-full" />
                    Organization monitoring
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-primary rounded-full" />
                    Threat landscape analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-primary rounded-full" />
                    Data leak verification
                  </li>
                </ul>
              </div>
            </div>

            {/* Forensics Card */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition duration-300" />
              <div className="relative bg-card border border-border/30 hover:border-secondary/50 rounded-lg p-6 sm:p-8 transition duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-secondary/20 flex items-center justify-center text-secondary font-bold text-sm sm:text-base flex-shrink-0">
                    02
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold">FORENSICS</h3>
                </div>
                <p className="text-foreground/70 mb-4">
                  Digital forensics analysis for incident response, eDiscovery, and evidence recovery. Chain of custody maintained throughout.
                </p>
                <ul className="space-y-2 text-sm text-foreground/60">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-secondary rounded-full" />
                    Device forensics (mobile, desktop)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-secondary rounded-full" />
                    Network traffic analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-secondary rounded-full" />
                    Memory dump analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-secondary rounded-full" />
                    Log analysis & timeline
                  </li>
                </ul>
              </div>
            </div>

            {/* Ethical Hacking Card */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition duration-300" />
              <div className="relative bg-card border border-border/30 hover:border-accent/50 rounded-lg p-6 sm:p-8 transition duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-accent/20 flex items-center justify-center text-accent font-bold text-sm sm:text-base flex-shrink-0">
                    03
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold">ETHICAL HACKING</h3>
                </div>
                <p className="text-foreground/70 mb-4">
                  Authorized penetration testing and vulnerability assessments. Identify security weaknesses before adversaries do.
                </p>
                <ul className="space-y-2 text-sm text-foreground/60">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-accent rounded-full" />
                    Web application testing
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-accent rounded-full" />
                    Infrastructure assessment
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-accent rounded-full" />
                    Social engineering tests
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-accent rounded-full" />
                    Red team operations
                  </li>
                </ul>
              </div>
            </div>

            {/* Security Card */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition duration-300" />
              <div className="relative bg-card border border-border/30 hover:border-primary/50 rounded-lg p-6 sm:p-8 transition duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-sm sm:text-base flex-shrink-0">
                    04
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold">SECURE COMMS</h3>
                </div>
                <p className="text-foreground/70 mb-4">
                  End-to-end encrypted communication for case discussions, updates, and sensitive information exchange.
                </p>
                <ul className="space-y-2 text-sm text-foreground/60">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-primary rounded-full" />
                    E2E encrypted messaging
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-primary rounded-full" />
                    Secure file transfer
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-primary rounded-full" />
                    PGP key management
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-primary rounded-full" />
                    Communication logs: 30-day retention
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-lg blur-2xl" />
            <div className="relative bg-card/50 border border-primary/30 rounded-lg p-8 sm:p-12 text-center backdrop-blur">
              <h2 className="text-2xl sm:text-3xl lg:text-3xl font-bold mb-3 sm:mb-4">
                Ready to Begin Your Investigation?
              </h2>
              <p className="text-sm sm:text-base text-foreground/70 mb-6 sm:mb-8 max-w-2xl mx-auto">
                Submit your intelligence request anonymously or create a secure client account. Either way, your privacy is paramount.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Link href="/request" className="w-full sm:w-auto">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-6 sm:px-8 py-5 sm:py-6 text-sm sm:text-base">
                    Anonymous Request
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full border-secondary/50 text-secondary hover:bg-secondary/10 px-6 sm:px-8 py-5 sm:py-6 text-sm sm:text-base">
                    Client Portal
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/30 mt-12 sm:mt-16 lg:mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 mb-8 sm:mb-12">
              <div>
                <h4 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">Services</h4>
                <ul className="space-y-2 text-xs sm:text-sm text-foreground/60">
                  <li><a href="#services" className="hover:text-primary transition">OSINT</a></li>
                  <li><a href="#services" className="hover:text-primary transition">Forensics</a></li>
                  <li><a href="#services" className="hover:text-primary transition">Ethical Hacking</a></li>
                  <li><a href="#services" className="hover:text-primary transition">Secure Comms</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">Access</h4>
                <ul className="space-y-2 text-xs sm:text-sm text-foreground/60">
                  <li><Link href="/request" className="hover:text-primary transition">New Request</Link></li>
                  <li><Link href="/login" className="hover:text-primary transition">Client Login</Link></li>
                  <li><Link href="/status" className="hover:text-primary transition">Case Status</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">Legal</h4>
                <ul className="space-y-2 text-xs sm:text-sm text-foreground/60">
                  <li><a href="#" className="hover:text-primary transition">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-primary transition">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-primary transition">Ethics</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">Security</h4>
                <ul className="space-y-2 text-xs sm:text-sm text-foreground/60">
                  <li><a href="#" className="hover:text-primary transition">PGP Key</a></li>
                  <li><a href="#" className="hover:text-primary transition">Bug Bounty</a></li>
                  <li><a href="#" className="hover:text-primary transition">Status</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-border/20 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-foreground/40">
              <p>© 2026 ShadowNode Intelligence Bureau. All inquiries confidential.</p>
              <p className="mt-2 font-mono text-xs">STATUS: <span className="text-primary">OPERATIONAL</span></p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
