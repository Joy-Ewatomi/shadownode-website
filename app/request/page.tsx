"use client"

import { PageTransition } from "@/components/animations/PageTransition"
import { motion } from "framer-motion"
import { ArrowLeft, ChevronRight, KeyRound, Search, ShieldCheck, UserPlus, Wrench } from "lucide-react"
import Link from "next/link"

const accountOptions = [
  {
    id: "register",
    title: "Create Client Account",
    description: "Register for the secure client portal to submit requests, receive updates and manage documents.",
    icon: UserPlus,
    href: "/signup",
  },
  {
    id: "login",
    title: "Existing Client",
    description: "Sign in to your client portal to start or manage a service request.",
    icon: KeyRound,
    href: "/login",
  },
]

const serviceTypes = [
  { title: "OSINT / Investigation Request", icon: Search },
  { title: "Cybersecurity Training Request", icon: ShieldCheck },
  { title: "Custom Service Request", icon: Wrench },
]

export default function RequestPage() {
  return (
    <PageTransition>
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-transparent px-4 py-16 text-foreground">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),#000_95%)]" />
        <div className="relative z-10 w-full max-w-[720px]">
          <Link href="/" className="group mb-8 inline-flex min-h-11 items-center gap-2 font-mono text-xs tracking-wider text-white/40 transition hover:text-primary">
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" aria-hidden="true" />
            RETURN TO TERMINAL
          </Link>

          <header className="mb-8">
            <div className="mb-5 inline-flex items-center gap-2 rounded border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-xs tracking-wider text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              SECURE CLIENT INTAKE
            </div>
            <h1 className="font-mono text-3xl font-bold uppercase text-white sm:text-4xl">Request ShadowNode Services</h1>
            <p className="mt-3 text-sm leading-6 text-white/45">Service requests are submitted through an authenticated client account.</p>
          </header>

          <section aria-labelledby="available-services" className="mb-6 rounded-md border border-primary/15 bg-[#070c0d]/70 p-5">
            <h2 id="available-services" className="font-mono text-xs uppercase tracking-wider text-primary">Available request types</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {serviceTypes.map(({ title, icon: Icon }) => (
                <div key={title} className="flex min-h-20 items-center gap-3 rounded border border-white/10 bg-black/25 p-3">
                  <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="text-sm font-medium leading-5 text-white/75">{title}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-4">
            {accountOptions.map((option, index) => {
              const Icon = option.icon
              return (
                <motion.div key={option.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08, duration: 0.3 }}>
                  <Link href={option.href} className="group flex min-h-24 items-center justify-between rounded-md border border-primary/15 bg-[#070c0d]/70 p-5 transition hover:border-primary/50 hover:bg-primary/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-6">
                    <span className="flex min-w-0 items-start gap-4">
                      <span className="rounded-md bg-primary/10 p-3"><Icon className="h-5 w-5 text-primary" aria-hidden="true" /></span>
                      <span className="min-w-0">
                        <span className="block text-base font-semibold text-white">{option.title}</span>
                        <span className="mt-1 block text-sm leading-6 text-white/45">{option.description}</span>
                      </span>
                    </span>
                    <ChevronRight className="ml-3 h-5 w-5 shrink-0 text-white/25 transition group-hover:text-primary" aria-hidden="true" />
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </main>
    </PageTransition>
  )
}
