"use client";

import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/animations/PageTransition";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Crosshair,
  Fingerprint,
  Lock,
  Scale,
  Search,
  Shield,
  Target,
  Users,
  Youtube,
  Linkedin,
  Instagram,
  Github,
  ArrowUpRight,
  Terminal,
  EyeOff,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ServiceTrackDetails from "@/components/public/ServiceTrackDetails";

// Keep future-service content ready in source without advertising unavailable work.
// Change this to true only when those services are genuinely available.
const SHOW_PLANNED_SERVICES = false;

const principles = [
  {
    icon: Shield,
    title: "SECURITY BY DESIGN",
    body: "Access controls, careful information handling and defined workflows support each engagement.",
  },
  {
    icon: Scale,
    title: "LEGAL & ETHICAL",
    body: "Work is accepted only for lawful, authorized purposes and handled under applicable privacy, contractual, and evidentiary requirements.",
  },
  {
    icon: EyeOff,
    title: "CONFIDENTIAL HANDLING",
    body: "Encryption, audit records and operational procedures help protect client and engagement information.",
  },
  {
    icon: Target,
    title: "CLEAR REPORTING",
    body: "Clear findings, documented sources and stated limitations help clients make informed decisions.",
  },
];

const navItems = [
  { label: "SERVICES", href: "#services" },
  { label: "ABOUT", href: "#about" },
  { label: "METHODOLOGY", href: "#methodology" },
  { label: "REQUEST", href: "/request", active: true },
  { label: "CONTACT", href: "#contact" },
];

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

const socialMedia = [
  {
    name: "TikTok",
    icon: TikTokIcon,
    href: "https://www.tiktok.com/@shadownodeob",
  },
  {
    name: "YouTube",
    icon: Youtube,
    href: "http://www.youtube.com/@ShadowNodeOperationsBureau",
  },
  { name: "LinkedIn", icon: Linkedin, href: "https://www.linkedin.com/in/joy-ewatomi-559250366/" },
  { name: "X", icon: XIcon, href: "https://x.com/Joy_Elvera" },
  {
    name: "Instagram",
    icon: Instagram,
    href: "https://www.instagram.com/shadownodeob/",
  },
  { name: "GitHub", icon: Github, href: "https://github.com/Joy-Ewatomi" },
];

export default function Home() {
  const [publicProfile, setPublicProfile] = useState<null | {
    founder_name: string; biography: string | null; location: string | null
    linkedin_url: string; contact_email: string; booking_url: string | null
    has_portrait: boolean; has_sample_report: boolean; sample_report_name: string | null
  }>(null);
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const trackTriggerRef = useRef<HTMLElement | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    fetch("/api/public/site-profile", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((profile) => { if (profile) setPublicProfile(profile) })
      .catch(() => undefined);
  }, []);

  const handleTrackToggle = (track: string) => {
    setActiveTrack((current) => {
      if (current === track) return null;
      trackTriggerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      return track;
    });
  };

  const closeTrack = () => {
    setActiveTrack(null);
    window.setTimeout(() => trackTriggerRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!activeTrack) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeTrack();
        return;
      }
      if (event.key === "Tab" && modalRef.current) {
        const focusable = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTrack]);

  const currentYear = new Date().getFullYear();

  return (
    <PageTransition>
      <main className="relative min-h-screen overflow-x-hidden text-foreground">
        {/* Global Navigation Bar */}
        <nav className="relative sticky top-0 z-30 border-b border-primary/10 bg-background/82 backdrop-blur-xl">
          <div className="mx-auto flex h-24 max-w-[1480px] items-center justify-between px-5 sm:px-8 lg:px-16">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-4"
              aria-label="ShadowNode home"
            >
              <div className="relative grid h-14 w-14 shrink-0 place-items-center">
                <div className="absolute inset-0 bg-primary/20 [clip-path:polygon(50%_0,95%_25%,95%_75%,50%_100%,5%_75%,5%_25%)]" />
                <div className="absolute inset-[3px] bg-background [clip-path:polygon(50%_0,95%_25%,95%_75%,50%_100%,5%_75%,5%_25%)]" />
                <span className="relative font-mono text-base tracking-wider text-white">
                  SOB
                </span>
              </div>
              <div className="leading-none">
                <div className="font-mono text-xl font-bold tracking-[0.08em] text-white sm:text-2xl">
                  SHADOWNODE
                </div>
                <div className="mt-2 font-mono text-xs tracking-[0.22em] text-primary">
                  OPERATIONS BUREAU
                </div>
              </div>
            </Link>

            <div className="hidden items-center gap-10 font-mono text-sm tracking-[0.08em] text-white/78 lg:flex">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group relative transition hover:text-primary"
                >
                  {item.label}
                  {item.active && (
                    <span className="absolute -right-3 -top-1 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_rgba(39,213,110,0.9)]" />
                  )}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link href="/request" className="hidden sm:inline-flex">
                <Button
                  variant="outline"
                  className="h-12 rounded-md border-primary/60 bg-transparent px-6 font-mono text-sm tracking-[0.06em] text-white hover:bg-primary/10 hover:text-primary"
                >
                  SUBMIT A SERVICE REQUEST
                </Button>
              </Link>
              <button
                type="button"
                onClick={() => setMobileNavOpen((prev) => !prev)}
                aria-expanded={mobileNavOpen}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
              >
                <span className="sr-only">
                  {mobileNavOpen ? "Close menu" : "Open menu"}
                </span>
                {mobileNavOpen ? (
                  <XIcon className="h-5 w-5" />
                ) : (
                  <span className="flex h-5 w-5 flex-col justify-between">
                    <span className="block h-[2px] w-full rounded-full bg-current" />
                    <span className="block h-[2px] w-full rounded-full bg-current" />
                    <span className="block h-[2px] w-full rounded-full bg-current" />
                  </span>
                )}
              </button>
            </div>
          </div>

          {mobileNavOpen && (
            <div className="absolute inset-x-0 top-full z-20 border-t border-primary/10 bg-background/95 px-5 py-4 backdrop-blur-xl shadow-2xl lg:hidden">
              <div className="mx-auto flex max-w-[1480px] flex-col gap-3 sm:px-8">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className="rounded-md border border-primary/10 bg-[#040809]/80 px-4 py-3 text-sm font-mono uppercase tracking-[0.18em] text-white transition hover:border-primary/50 hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/request"
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex h-12 items-center justify-center rounded-md border border-primary/60 bg-primary/10 px-5 text-sm font-mono uppercase tracking-[0.06em] text-primary transition hover:bg-primary/20"
                >
                  SUBMIT A SERVICE REQUEST
                </Link>
              </div>
            </div>
          )}
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
                LAWFUL OSINT &amp; CYBERSECURITY TRAINING
              </div>

              <h1 className="max-w-3xl font-mono text-[clamp(2.5rem,7vw,5rem)] font-black uppercase leading-[1.02] text-white">
                <span className="block">Lawful OSINT.</span>
                <span className="mt-2 block text-primary">
                  Practical cybersecurity training.
                </span>
              </h1>

              <p className="mt-8 max-w-2xl text-lg leading-8 text-white/72">
                Lawful open-source intelligence and practical cybersecurity
                training for individuals and organizations that need clear,
                documented and responsibly handled support.
              </p>

              <div className="mt-5 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-white/70">
                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(39,213,110,0.8)]" />
                Founder-led. Mission-driven. Built for lawful, discreet and
                evidence-oriented work.
              </div>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link href="/request">
                  <Button className="h-16 w-full rounded-lg border border-primary/70 bg-gradient-to-r from-primary/95 via-primary to-primary/80 px-10 font-mono text-base font-bold tracking-[0.08em] text-background shadow-[0_0_30px_rgba(39,213,110,0.22)] transition hover:scale-[1.01] hover:bg-primary sm:w-auto">
                    SUBMIT A SERVICE REQUEST
                  </Button>
                </Link>
                <Link
                  href="#services"
                  className="inline-flex h-16 items-center gap-4 rounded-lg border border-white/10 bg-white/5 px-5 font-mono text-base tracking-[0.06em] text-white/88 transition hover:border-primary/40 hover:text-primary"
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
                    <span className="text-primary">SOB</span>
                    <span className="text-white/45">//</span>
                    <span className="text-white/76">SERVICE OVERVIEW</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/82">
                    SECURE <Lock className="h-4 w-4 text-primary" />
                  </div>
                </div>

                <div className="space-y-8 p-6 font-mono text-sm sm:p-8">
                  <div>
                    <p className="text-primary">WHO WE ARE</p>
                    <p className="mt-2 text-white/58">
                      shadownode-operations-bureau
                    </p>
                  </div>

                  <div>
                    <p className="text-primary">AVAILABLE SERVICES</p>
                    <div className="mt-3 space-y-3 rounded border border-primary/20 bg-background/35 p-4">
                      <p className="text-white/58">
                        <span className="text-primary">OSINT</span>{" "}
                        // AVAILABLE NOW
                      </p>
                      <p className="text-white/58">
                        <span className="text-primary">CYBERSECURITY TRAINING</span>{" "}
                        // AVAILABLE NOW
                      </p>
                      {SHOW_PLANNED_SERVICES && (
                        <>
                          <p className="text-white/58">DIGITAL FORENSICS // PLANNED</p>
                          <p className="text-white/58">ETHICAL HACKING // PLANNED</p>
                          <p className="text-white/58">GOVERNMENT CONSULTING // IN DEVELOPMENT</p>
                          <p className="text-white/58">CORRECTIONAL INTELLIGENCE // PLANNED</p>
                          <p className="text-white/58">LEGAL ADVISORY // PLANNED</p>
                          <p className="text-white/58">RESEARCH // PLANNED</p>
                          <p className="text-white/58">OPSEC CONSULTING // PLANNED</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-primary">HOW TO BEGIN</p>
                    <div className="mt-3 flex items-center gap-3 text-primary">
                      <span>secure account:</span>
                      <span className="h-4 min-w-0 flex-1 bg-primary/20">
                        <span className="block h-full w-full bg-gradient-to-r from-primary/70 to-primary" />
                      </span>
                      <span>required for requests</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Dynamic & Complete Service Cards Grid Section */}
        <section
          id="services"
          className="relative z-10 mx-auto max-w-[1480px] space-y-10 px-5 py-16 sm:px-8 lg:px-16"
        >
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Available now</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Services built for clear, responsible outcomes</h2>
            <p className="mt-4 text-base leading-7 text-white/65">Choose lawful public-source investigation support or practical cybersecurity training tailored to your needs.</p>
          </div>
          <div className={`grid w-full grid-cols-1 gap-6 ${SHOW_PLANNED_SERVICES ? "sm:grid-cols-2 xl:grid-cols-3" : "mx-auto max-w-6xl md:grid-cols-2"}`}>
            {/* 1. OSINT */}
            <Link href="/services/osint" className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <motion.article
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group relative flex h-full min-h-[18rem] cursor-pointer flex-col overflow-hidden rounded-md border border-primary/25 bg-card/72 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-primary/70 sm:p-7 lg:aspect-[16/9] lg:min-h-0 lg:p-8"
              >
              <span className="absolute left-0 top-0 h-7 w-7 border-l border-t border-primary/80" />
              <span className="absolute bottom-0 right-0 h-7 w-7 border-b border-r border-primary/80" />
              <div className="mb-7 flex items-center justify-between gap-3">
                <Search className="h-12 w-12 text-primary transition group-hover:drop-shadow-[0_0_16px_rgba(39,213,110,0.45)]" strokeWidth={1.45} />
                <span className="rounded border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[10px] font-bold uppercase text-primary">Available now</span>
              </div>
              <h2 className="font-mono text-xl font-bold tracking-[0.04em] text-white">
                OSINT
              </h2>
              <p className="mt-4 leading-6 text-white/70 text-sm">
                Lawful public-source research, digital-footprint analysis and
                documented reporting for authorized investigations.
              </p>
              <span className="mt-auto inline-flex min-h-11 items-end gap-3 pt-8 font-mono text-xs tracking-[0.08em] text-primary transition group-hover:underline">
                LEARN MORE <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
              </motion.article>
            </Link>

            {/* 2. CYBERSECURITY TRAINING */}
            <Link href="/services/cybersecurity-training" className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <motion.article
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group relative flex h-full min-h-[18rem] cursor-pointer flex-col overflow-hidden rounded-md border border-primary/25 bg-card/72 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-primary/70 sm:p-7 lg:aspect-[16/9] lg:min-h-0 lg:p-8"
              >
              <span className="absolute left-0 top-0 h-7 w-7 border-l border-t border-primary/80" />
              <span className="absolute bottom-0 right-0 h-7 w-7 border-b border-r border-primary/80" />
              <div className="mb-7 flex items-center justify-between gap-3">
                <GraduationCap className="h-12 w-12 text-primary transition group-hover:drop-shadow-[0_0_16px_rgba(39,213,110,0.45)]" strokeWidth={1.45} />
                <span className="rounded border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[10px] font-bold uppercase text-primary">Available now</span>
              </div>
              <h2 className="font-mono text-xl font-bold tracking-[0.04em] text-white">
                CYBERSECURITY TRAINING
              </h2>
              <p className="mt-4 text-sm leading-6 text-white/70">
                Practical digital-safety, awareness and tailored technical training for individuals and organizations.
              </p>
              <span className="mt-auto inline-flex min-h-11 items-end gap-3 pt-8 font-mono text-xs tracking-[0.08em] text-primary transition group-hover:underline">
                LEARN MORE <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
              </motion.article>
            </Link>

            {SHOW_PLANNED_SERVICES && (<>
            {/* Future services are retained here and hidden until launch. */}
            {/* 2. DIGITAL FORENSICS */}
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              onClick={() => handleTrackToggle("forensics")}
              className="group relative min-h-[16rem] cursor-pointer overflow-hidden rounded-md border border-primary/25 bg-card/72 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-primary/70"
            >
              <span className="absolute left-0 top-0 h-7 w-7 border-l border-t border-primary/80" />
              <span className="absolute bottom-0 right-0 h-7 w-7 border-b border-r border-primary/80" />
              <div className="flex items-center justify-between mb-7">
                <Fingerprint
                  className="h-12 w-12 text-primary transition group-hover:drop-shadow-[0_0_16px_rgba(39,213,110,0.45)]"
                  strokeWidth={1.45}
                />
                <span className="text-[9px] font-mono text-primary border border-primary/30 bg-primary/5 px-2 py-0.5 rounded uppercase font-bold">
                  Planned Jan 2027
                </span>
              </div>
              <h2 className="font-mono text-xl font-bold tracking-[0.04em] text-white">
                DIGITAL FORENSICS
              </h2>
              <p className="mt-4 leading-6 text-white/70 text-sm">
                Planned capability for authorized device examination, data
                recovery and documented evidence handling.
              </p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleTrackToggle("forensics");
                }}
                className="mt-9 inline-flex items-center gap-3 font-mono text-xs tracking-[0.08em] text-primary hover:underline text-left transition"
              >
                {activeTrack === "forensics"
                  ? "CLOSE MODULE —"
                  : "LEARN MORE →"}
              </button>
            </motion.article>

            {/* 3. ETHICAL HACKING */}
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              onClick={() => handleTrackToggle("hacking")}
              className="group relative min-h-[16rem] cursor-pointer overflow-hidden rounded-md border border-primary/25 bg-card/72 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-primary/70"
            >
              <span className="absolute left-0 top-0 h-7 w-7 border-l border-t border-primary/80" />
              <span className="absolute bottom-0 right-0 h-7 w-7 border-b border-r border-primary/80" />
              <div className="flex items-center justify-between mb-7">
                <Terminal
                  className="h-12 w-12 text-primary transition group-hover:drop-shadow-[0_0_16px_rgba(39,213,110,0.45)]"
                  strokeWidth={1.45}
                />
                <span className="text-[9px] font-mono text-primary border border-primary/30 bg-primary/5 px-2 py-0.5 rounded uppercase font-bold">
                  Target Apr 2027
                </span>
              </div>
              <h2 className="font-mono text-xl font-bold tracking-[0.04em] text-white">
                ETHICAL HACKING
              </h2>
              <p className="mt-4 leading-6 text-white/70 text-sm">
                Authorized penetration testing, red team operations, and
                vulnerability assessments.
              </p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleTrackToggle("hacking");
                }}
                className="mt-9 inline-flex items-center gap-3 font-mono text-xs tracking-[0.08em] text-primary hover:underline text-left transition"
              >
                {activeTrack === "hacking" ? "CLOSE MODULE —" : "LEARN MORE →"}
              </button>
            </motion.article>

            {/* 4. GOVERNMENT CONSULTING */}
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              onClick={() => handleTrackToggle("gov")}
              className="group relative min-h-[16rem] cursor-pointer overflow-hidden rounded-md border border-primary/25 bg-card/72 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-primary/70"
            >
              <span className="absolute left-0 top-0 h-7 w-7 border-l border-t border-primary/80" />
              <span className="absolute bottom-0 right-0 h-7 w-7 border-b border-r border-primary/80" />
              <Users
                className="mb-7 h-12 w-12 text-primary transition group-hover:drop-shadow-[0_0_16px_rgba(39,213,110,0.45)]"
                strokeWidth={1.45}
              />
              <span className="text-[9px] font-mono text-primary border border-primary/30 bg-primary/5 px-2 py-0.5 rounded uppercase font-bold">
                In development
              </span>
              <h2 className="font-mono text-xl font-bold tracking-[0.04em] text-white">
                GOVERNMENT CONSULTING
              </h2>
              <p className="mt-4 leading-6 text-white/70 text-sm">
                Planned advisory and capacity-building support for authorized
                public institutions.
              </p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleTrackToggle("gov");
                }}
                className="mt-9 inline-flex items-center gap-3 font-mono text-xs tracking-[0.08em] text-primary hover:underline text-left transition"
              >
                {activeTrack === "gov" ? "CLOSE MODULE —" : "LEARN MORE →"}
              </button>
            </motion.article>

            {/* 5. CORRECTIONAL INTELLIGENCE */}
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              onClick={() => handleTrackToggle("correctional")}
              className="group relative min-h-[16rem] cursor-pointer overflow-hidden rounded-md border border-primary/25 bg-card/72 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-primary/70"
            >
              <span className="absolute left-0 top-0 h-7 w-7 border-l border-t border-primary/80" />
              <span className="absolute bottom-0 right-0 h-7 w-7 border-b border-r border-primary/80" />
              <Shield
                className="mb-7 h-12 w-12 text-primary transition group-hover:drop-shadow-[0_0_16px_rgba(39,213,110,0.45)]"
                strokeWidth={1.45}
              />
              <span className="text-[9px] font-mono text-primary border border-primary/30 bg-primary/5 px-2 py-0.5 rounded uppercase font-bold">
                Planned service
              </span>
              <h2 className="font-mono text-xl font-bold tracking-[0.04em] text-white">
                CORRECTIONAL INTELLIGENCE
              </h2>
              <p className="mt-4 leading-6 text-white/70 text-sm">
                Planned intelligence and security support for authorized
                correctional institutions.
              </p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleTrackToggle("correctional");
                }}
                className="mt-9 inline-flex items-center gap-3 font-mono text-xs tracking-[0.08em] text-primary hover:underline text-left transition"
              >
                {activeTrack === "correctional"
                  ? "CLOSE MODULE —"
                  : "LEARN MORE →"}
              </button>
            </motion.article>

            {/* 6. LEGAL & COMPLIANCE */}
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              onClick={() => handleTrackToggle("legal")}
              className="group relative min-h-[16rem] cursor-pointer overflow-hidden rounded-md border border-primary/25 bg-card/72 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-primary/70"
            >
              <span className="absolute left-0 top-0 h-7 w-7 border-l border-t border-primary/80" />
              <span className="absolute bottom-0 right-0 h-7 w-7 border-b border-r border-primary/80" />
              <Scale
                className="mb-7 h-12 w-12 text-primary transition group-hover:drop-shadow-[0_0_16px_rgba(39,213,110,0.45)]"
                strokeWidth={1.45}
              />
              <span className="text-[9px] font-mono text-primary border border-primary/30 bg-primary/5 px-2 py-0.5 rounded uppercase font-bold">
                Planned service
              </span>
              <h2 className="font-mono text-xl font-bold tracking-[0.04em] text-white">
                LEGAL ADVISORY
              </h2>
              <p className="mt-4 leading-6 text-white/70 text-sm">
                Planned technical investigation and digital-evidence support
                for clients and retained legal professionals.
              </p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleTrackToggle("legal");
                }}
                className="mt-9 inline-flex items-center gap-3 font-mono text-xs tracking-[0.08em] text-primary hover:underline text-left transition"
              >
                {activeTrack === "legal" ? "CLOSE MODULE —" : "LEARN MORE →"}
              </button>
            </motion.article>

            {/* 7. RESEARCH & THREAT HUNTING */}
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              onClick={() => handleTrackToggle("research")}
              className="group relative min-h-[16rem] cursor-pointer overflow-hidden rounded-md border border-primary/25 bg-card/72 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-primary/70"
            >
              <span className="absolute left-0 top-0 h-7 w-7 border-l border-t border-primary/80" />
              <span className="absolute bottom-0 right-0 h-7 w-7 border-b border-r border-primary/80" />
              <Crosshair
                className="mb-7 h-12 w-12 text-primary transition group-hover:drop-shadow-[0_0_16px_rgba(39,213,110,0.45)]"
                strokeWidth={1.45}
              />
              <span className="text-[9px] font-mono text-primary border border-primary/30 bg-primary/5 px-2 py-0.5 rounded uppercase font-bold">
                Planned service
              </span>
              <h2 className="font-mono text-xl font-bold tracking-[0.04em] text-white">
                RESEARCH
              </h2>
              <p className="mt-4 leading-6 text-white/70 text-sm">
                Planned research and monitoring for digital threats, suspicious
                activity and emerging risks.
              </p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleTrackToggle("research");
                }}
                className="mt-9 inline-flex items-center gap-3 font-mono text-xs tracking-[0.08em] text-primary hover:underline text-left transition"
              >
                {activeTrack === "research" ? "CLOSE MODULE —" : "LEARN MORE →"}
              </button>
            </motion.article>

            {/* 8. STRATEGIC CONSULTING & OPSEC */}
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              onClick={() => handleTrackToggle("opsec")}
              className="group relative min-h-[16rem] cursor-pointer overflow-hidden rounded-md border border-primary/25 bg-card/72 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-primary/70"
            >
              <span className="absolute left-0 top-0 h-7 w-7 border-l border-t border-primary/80" />
              <span className="absolute bottom-0 right-0 h-7 w-7 border-b border-r border-primary/80" />
              <Shield
                className="mb-7 h-12 w-12 text-primary transition group-hover:drop-shadow-[0_0_16px_rgba(39,213,110,0.45)]"
                strokeWidth={1.45}
              />
              <span className="text-[9px] font-mono text-primary border border-primary/30 bg-primary/5 px-2 py-0.5 rounded uppercase font-bold">
                Planned service
              </span>
              <h2 className="font-mono text-xl font-bold tracking-[0.04em] text-white">
                OPSEC CONSULTING
              </h2>
              <p className="mt-4 leading-6 text-white/70 text-sm">
                Planned guidance for reducing digital exposure and improving
                organizational information handling.
              </p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleTrackToggle("opsec");
                }}
                className="mt-9 inline-flex items-center gap-3 font-mono text-xs tracking-[0.08em] text-primary hover:underline text-left transition"
              >
                {activeTrack === "opsec" ? "CLOSE MODULE —" : "LEARN MORE →"}
              </button>
            </motion.article>
            </>)}
          </div>

          <AnimatePresence mode="wait">
            {SHOW_PLANNED_SERVICES && activeTrack && (
              <motion.div
                key={activeTrack}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 px-4 py-8 backdrop-blur-sm sm:px-6"
                onClick={closeTrack}
              >
                <motion.div
                  ref={modalRef}
                  initial={
                    reduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={
                    reduceMotion
                      ? undefined
                      : { opacity: 0, y: 10, scale: 0.98 }
                  }
                  transition={{ duration: reduceMotion ? 0 : 0.18 }}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Service details"
                  className="relative w-full max-w-5xl max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] overflow-y-auto rounded-lg border border-primary/20 bg-[#040809]/95 p-6 sm:p-8 font-mono text-xs space-y-6 shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    autoFocus
                    onClick={closeTrack}
                    className="absolute right-4 top-4 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-primary transition hover:border-primary/50 hover:bg-primary/20"
                  >
                    Close
                  </button>
                  <ServiceTrackDetails trackKey={activeTrack} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* About & Operational Principles Segment */}
        <section
          id="about"
          className="relative z-10 border-t border-primary/10 bg-[#070b0c]/70 pt-20 pb-12"
        >
          <div className="mx-auto max-w-[1480px] px-5 sm:px-8 lg:px-16 mb-12">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-sm tracking-[0.12em] text-primary">
                HOW WE WORK
              </p>
            </div>
            <h2 className="mt-4 font-mono text-3xl font-bold uppercase text-white sm:text-4xl">
              Clear standards for every engagement
            </h2>
          </div>

          <div className="border-b border-primary/10 pb-12">
            <div className="mx-auto grid max-w-[1480px] gap-8 px-5 sm:px-8 md:grid-cols-2 lg:grid-cols-4 lg:px-16">
              {principles.map((principle) => {
                const Icon = principle.icon;

                return (
                  <div
                    key={principle.title}
                    className="flex gap-5 lg:border-r lg:border-primary/20 lg:last:border-r-0"
                  >
                    <Icon
                      className="mt-1 h-10 w-10 shrink-0 text-primary"
                      strokeWidth={1.35}
                    />
                    <div>
                      <h3 className="font-mono text-sm tracking-[0.08em] text-white">
                        {principle.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-white/54">
                        {principle.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mx-auto grid max-w-[1480px] gap-8 px-5 pt-12 sm:px-8 md:grid-cols-[minmax(0,18rem)_1fr] lg:px-16">
            <div className="aspect-[4/5] overflow-hidden rounded-md border border-primary/20 bg-[#06110f]">
              {publicProfile?.has_portrait ? (
                <img src="/api/public/site-profile/portrait" alt="Joy Ewatomi, founder of ShadowNode Operations Bureau Limited" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center font-mono text-sm text-white/45">Founder portrait</div>
              )}
            </div>
            <div className="self-center">
              <p className="font-mono text-sm uppercase tracking-[0.12em] text-primary">Founder</p>
              <h3 className="mt-3 text-3xl font-bold text-white">{publicProfile?.founder_name || "Joy Ewatomi"}</h3>
              {publicProfile?.location && <p className="mt-2 text-sm text-white/55">{publicProfile.location}</p>}
              {publicProfile?.biography ? <p className="mt-5 max-w-3xl whitespace-pre-line text-base leading-8 text-white/72">{publicProfile.biography}</p> : <p className="mt-5 max-w-2xl text-base leading-8 text-white/65">Founder of ShadowNode Operations Bureau Limited, building lawful, documented and responsibly delivered OSINT and cybersecurity training services.</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={publicProfile?.linkedin_url || "https://www.linkedin.com/in/joy-ewatomi-559250366/"} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded border border-primary/40 px-4 py-2 text-sm text-primary hover:bg-primary/10"><Linkedin className="h-4 w-4" /> LinkedIn</a>
                {publicProfile?.has_sample_report && <a href="/api/public/site-profile/sample-report" className="inline-flex min-h-11 items-center rounded border border-white/20 px-4 py-2 text-sm text-white hover:border-primary/50">View anonymized sample report</a>}
              </div>
            </div>
          </div>
        </section>

        {/* Investigative Methodology Segment */}
        <section
          id="methodology"
          className="relative z-10 mx-auto grid max-w-[1480px] gap-8 px-5 py-24 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-16"
        >
          <div>
            <p className="font-mono text-sm tracking-[0.12em] text-primary">
              METHODOLOGY
            </p>
            <h2 className="mt-4 max-w-2xl font-mono text-3xl font-bold uppercase leading-tight text-white sm:text-5xl">
              Quiet process. Verifiable intelligence.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {["Scope", "Collect", "Report"].map((step, index) => (
              <div
                key={step}
                className="rounded-md border border-primary/18 bg-card/62 p-6"
              >
                <p className="font-mono text-primary">0{index + 1}</p>
                <h3 className="mt-5 font-mono text-xl text-white">{step}</h3>
                <p className="mt-3 text-sm leading-6 text-white/56">
                  {index === 0 &&
                    "Define the lawful purpose, research question, scope, authorization and reporting needs."}
                  {index === 1 &&
                    "Collect relevant public information or deliver the agreed training plan, with documented work and appropriate controls."}
                  {index === 2 &&
                    "Provide a clear report or training record with outcomes, sources and limitations where applicable."}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Encrypted Intake Engagement / Contact Segment */}
        <section
          id="contact"
          className="relative z-10 mx-auto max-w-[1480px] px-5 pt-12 pb-20 sm:px-8 lg:px-16"
        >
          <div className="rounded-md border border-primary/25 bg-primary/5 p-8 sm:flex sm:items-center sm:justify-between sm:p-10 shadow-[0_0_50px_rgba(39,213,110,0.02)]">
            <div>
              <p className="font-mono text-sm tracking-[0.12em] text-primary">
                START A CONVERSATION
              </p>
              <h2 className="mt-3 font-mono text-2xl font-bold uppercase text-white sm:text-3xl">
                Ask a question or submit a service request
              </h2>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:mt-0 sm:flex-row">
              {publicProfile?.booking_url && <a href={publicProfile.booking_url} target="_blank" rel="noopener noreferrer"><Button variant="outline" className="h-14 w-full rounded-md border-primary/50 bg-transparent px-7 font-mono text-white hover:bg-primary/10 hover:text-primary sm:w-auto">BOOK AN INTRO CALL</Button></a>}
              <Link href="/contact">
                <Button variant="outline" className="h-14 w-full rounded-md border-primary/50 bg-transparent px-7 font-mono text-white hover:bg-primary/10 hover:text-primary sm:w-auto">
                  CONTACT US
                </Button>
              </Link>
              <Link href="/request">
                <Button className="h-14 w-full rounded-md bg-primary px-7 font-mono text-background hover:bg-primary/85 sm:w-auto shadow-[0_0_20px_rgba(39,213,110,0.2)]">
                  SUBMIT A REQUEST
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Global Terminal Footer with Social Media Connect Grid */}
        <footer className="relative z-10 border-t border-primary/10 bg-background/50 px-5 py-12 text-center font-mono text-xs tracking-[0.08em] text-white/42 sm:px-8 backdrop-blur-sm">
          <div className="mx-auto max-w-[1480px] flex flex-col items-center gap-6">
            <p>© {currentYear} SHADOWNODE OPERATIONS BUREAU LIMITED.</p>
            <p className="max-w-2xl text-center text-[11px] leading-6 text-white/48">
              Confidentiality notice: all engagement records, communications,
              and case materials are handled with strict discretion and
              protected in accordance with applicable legal and contractual
              standards.
            </p>

            <p className="text-xs">
              STATUS:{" "}
              <span className="text-primary animate-pulse font-bold">
                OPERATIONAL
              </span>
            </p>

            <p className="text-white/40 text-xs mt-4">
              Services are provided only for lawful, authorized purposes.
              Outcomes and acceptance by courts, regulators, or other third
              parties are not guaranteed.
            </p>

            <nav
              aria-label="Legal and support"
              className="flex flex-wrap justify-center gap-x-5 gap-y-3 text-[11px] text-white/75"
            >
              <Link
                href="/privacy"
                className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Terms of Service
              </Link>
              <Link
                href="/security"
                className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Security
              </Link>
              <Link
                href="/contact"
                className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Contact
              </Link>
            </nav>

            {/* Social Media Platform Grid */}
            <div className="mt-4 flex flex-wrap justify-center gap-6 border-t border-primary/5 pt-6 w-full max-w-xl">
              {socialMedia.map((platform) => {
                const Icon = platform.icon;
                return (
                  <Link
                    key={platform.name}
                    href={platform.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 rounded border border-primary/10 bg-primary/5 px-3 py-1.5 transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                    aria-label={`ShadowNode on ${platform.name}`}
                  >
                    <Icon className="h-4 w-4 text-white/80 transition-colors group-hover:text-primary" />
                    <span className="text-[10px] tracking-[0.12em] text-white/40 group-hover:text-primary">
                      {platform.name.toUpperCase()}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </footer>
      </main>
    </PageTransition>
  );
}
