'use client'

import { PageTransition } from '@/components/animations/PageTransition'
import { motion } from 'framer-motion'
import { Shield, UserPlus, KeyRound, ChevronRight, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const intakeOptions = [
  {
    id: 'anonymous',
    title: 'Anonymous Submission',
    description: 'Submit your request without creating an account. Receive a tracking token for status updates.',
    icon: Shield,
    href: '/request/anonymous',
  },
  {
    id: 'register',
    title: 'Create Client Account',
    description: 'Register for a secure client portal. Access case updates, encrypted messaging, and document vault.',
    icon: UserPlus,
    href: '/signup',
  },
  {
    id: 'login',
    title: 'Existing Account',
    description: 'Already have a ShadowNode account? Log in to your client portal.',
    icon: KeyRound,
    href: '/login',
  },
]

export default function RequestPage() {
  return (
    <PageTransition>
      <main className="min-h-screen relative overflow-hidden bg-transparent text-foreground flex flex-col justify-center items-center px-4 py-16">
        
        {/* Background Atmosphere Grids (Matching Landers) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),#000_95%)]" />
        </div>

        {/* Outer Portal Container */}
        <div className="relative z-10 w-full max-w-[680px]">
          
          {/* Return Action */}
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 font-mono text-xs tracking-wider text-white/40 hover:text-primary transition mb-8 group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            RETURN TO TERMINAL
          </Link>

          {/* Header Dashboard Info */}
          <div className="mb-10 text-left">
            <div className="inline-flex items-center gap-2 rounded border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-xs tracking-wider text-primary mb-6">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              SECURE INTAKE CHANNEL ONLINE
            </div>
            <h1 className="font-mono text-3xl font-bold tracking-wide text-white sm:text-4xl uppercase">
              Initiate Intelligence Request
            </h1>
            <p className="mt-3 font-mono text-sm text-white/40">
              How would you like to proceed?
            </p>
          </div>

          {/* Interactive Option Grid Container */}
          <div className="space-y-4">
            {intakeOptions.map((option, index) => {
              const Icon = option.icon
              return (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.4 }}
                >
                  <Link
                    href={option.href}
                    className="group flex items-center justify-between rounded-md border border-primary/15 bg-[#070c0d]/70 p-6 backdrop-blur transition-all duration-300 hover:border-primary/50 hover:bg-primary/[0.02] hover:shadow-[0_0_30px_rgba(39,213,110,0.03)]"
                  >
                    <div className="flex items-start gap-5">
                      {/* Icon Container Bracket */}
                      <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded border border-primary/20 bg-primary/5 transition-colors group-hover:border-primary/50 text-primary">
                        <Icon className="h-5 w-5" strokeWidth={1.5} />
                      </div>
                      
                      {/* Text Data Block */}
                      <div className="space-y-1.5 pr-4">
                        <h2 className="font-mono text-lg font-bold tracking-wide text-primary transition-colors group-hover:text-white">
                          {option.title}
                        </h2>
                        <p className="text-sm leading-6 text-white/50 transition-colors group-hover:text-white/70">
                          {option.description}
                        </p>
                      </div>
                    </div>

                    {/* Unified Floating Action Indicator */}
                    <ChevronRight 
                      className="h-5 w-5 shrink-0 text-primary/40 transition-all duration-300 group-hover:text-primary group-hover:translate-x-1" 
                      strokeWidth={1.5}
                    />
                  </Link>
                </motion.div>
              )
            })}
          </div>

          {/* Micro-Disclaimer Text Footer */}
          <div className="mt-8 text-center font-mono text-[10px] tracking-widest text-white/20">
            SECURE SHA-256 END-TO-END DATA MANAGEMENT PROXIES LAYERED BY DEFAULT
          </div>
        </div>
      </main>
    </PageTransition>
  )
}
