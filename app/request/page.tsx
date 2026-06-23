'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AnimatePresence, motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { ArrowLeft, Check, ChevronRight, LockKeyhole, Radar, ShieldCheck, Sparkles, UserRoundCheck } from 'lucide-react'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'

const panelVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -18,
    scale: 0.98,
    transition: { duration: 0.25, ease: 'easeInOut' },
  },
}

const listVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
}

function RequestBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            'linear-gradient(rgba(39, 213, 110, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(39, 213, 110, 0.10) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
        animate={{ backgroundPosition: ['0px 0px', '56px 56px'] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/18 via-cyan-300/8 to-transparent blur-sm"
        animate={{ y: ['-35%', '115%'], opacity: [0, 0.75, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-[10%] top-[18%] h-40 w-40 rounded-full border border-primary/20"
        animate={{ scale: [1, 1.22, 1], rotate: 360, opacity: [0.35, 0.75, 0.35] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute bottom-[12%] right-[8%] h-52 w-52 rounded-full border border-amber-200/15"
        animate={{ scale: [1.12, 1, 1.12], rotate: -360, opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(39,213,110,0.16),transparent_28%),radial-gradient(circle_at_82%_78%,rgba(34,211,238,0.10),transparent_24%),linear-gradient(135deg,var(--background),rgba(7,16,17,0.94)_45%,var(--background))]" />
    </div>
  )
}

function BrandMark() {
  return (
    <motion.div
      className="w-8 h-8 bg-primary rounded flex items-center justify-center flex-shrink-0 shadow-[0_0_24px_rgba(39,213,110,0.35)]"
      whileHover={{ rotate: 3, scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 360, damping: 18 }}
    >
      <span className="text-primary-foreground font-bold text-sm">SIB</span>
    </motion.div>
  )
}

function RequestNav() {
  return (
    <nav className="border-b border-border/30 bg-background/55 backdrop-blur-xl sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <BrandMark />
          <span className="text-lg sm:text-xl font-bold text-primary truncate">SHADOWNODE INTELLIGENCE BUREAU</span>
        </Link>
      </div>
    </nav>
  )
}

export default function RequestPage() {
  const [step, setStep] = useState<'anonymous' | 'account' | 'form'>('anonymous')
  const [formData, setFormData] = useState({
    serviceType: '',
    description: '',
    timeline: '',
    contact: '',
    email: ''
  })
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [token, setToken] = useState('')
  const [submittedPrice, setSubmittedPrice] = useState<number | null>(null)

  const handleEstimatePrice = async () => {
    if (!formData.serviceType || formData.description.length < 20 || !formData.timeline) {
      return
    }

    try {
      const response = await fetch('/api/pricing/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: formData.serviceType,
          description: formData.description,
          timeline: formData.timeline
        })
      })

      if (response.ok) {
        const data = await response.json()
        setEstimatedPrice(data.estimatedPrice)
      }
    } catch (error) {
      console.error('[v0] Error estimating price:', error)
    }
  }

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Trigger price estimation after a change
    if (field === 'description' || field === 'serviceType' || field === 'timeline') {
      setTimeout(() => {
        handleEstimatePrice()
      }, 300)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        const data = await response.json()
        setToken(data.token)
        setSubmittedPrice(estimatedPrice)
        setSubmitted(true)
      }
    } catch (error) {
      console.error('Error submitting request:', error)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background">
        <RequestBackdrop />
        <RequestNav />

        <main className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20">
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            className="bg-card/88 border border-primary/25 rounded-lg p-6 sm:p-8 lg:p-12 text-center shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl"
          >
            <div className="mb-6">
              <motion.div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded bg-primary/20 border border-primary/35 flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(39,213,110,0.28)]"
                initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.2 }}
              >
                <Check className="h-7 w-7 text-primary" />
              </motion.div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Request Submitted</h1>
              <p className="text-sm sm:text-base text-foreground/60">Your intelligence request has been received and assigned a tracking token.</p>
            </div>

            <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-4 sm:space-y-6">
              <motion.div variants={itemVariants} className="bg-background/80 border border-primary/30 rounded p-4 sm:p-6 font-mono overflow-x-auto relative">
                <motion.div
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <p className="text-foreground/50 text-xs sm:text-sm mb-2">Case Reference Token:</p>
                <p className="text-primary text-base sm:text-lg break-all text-left">
                  <code>{token}</code>
                </p>
                <p className="text-foreground/50 text-xs mt-4">Save this token. Use it to check case status at /status</p>
              </motion.div>

              {submittedPrice && (
                <motion.div variants={itemVariants} className="bg-secondary/10 border border-secondary/30 rounded p-4 sm:p-6">
                  <p className="text-foreground/50 text-xs sm:text-sm mb-2">Estimated Investigation Cost</p>
                  <p className="text-2xl sm:text-3xl font-bold text-secondary">
                    ${submittedPrice.toLocaleString()}
                  </p>
                  <p className="text-xs text-foreground/50 mt-3">
                    Our case manager will contact you to confirm scope and final pricing. This estimate may be adjusted based on additional assessment details.
                  </p>
                </motion.div>
              )}
            </motion.div>

            <motion.div variants={panelVariants} initial="hidden" animate="visible" className="space-y-3 sm:space-y-4 text-left bg-background/50 border border-border/30 rounded p-4 sm:p-6 mb-6 sm:mb-8 mt-6">
              <h3 className="font-bold text-primary text-sm sm:text-base">Next Steps:</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-foreground/70">
                <li className="flex items-start gap-2 sm:gap-3">
                  <span className="text-primary font-bold mt-0.5 flex-shrink-0">1.</span>
                  <span>An initial assessment of your request will be completed within 24 hours.</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <span className="text-primary font-bold mt-0.5 flex-shrink-0">2.</span>
                  <span>You will receive contact instructions through encrypted channels.</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <span className="text-primary font-bold mt-0.5 flex-shrink-0">3.</span>
                  <span>A case manager will discuss scope, timeline, and pricing.</span>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <span className="text-primary font-bold mt-0.5 flex-shrink-0">4.</span>
                  <span>Upon agreement, investigation begins immediately.</span>
                </li>
              </ul>
            </motion.div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link href={`/status/${token}`} className="flex-1">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm sm:text-base">
                  Track Case Status
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full border-border/30 text-sm sm:text-base">
                  Return Home
                </Button>
              </Link>
            </div>

            <p className="text-xs text-foreground/40 mt-6 sm:mt-8 font-mono">
              Remember: Only you and ShadowNode know this token. Treat it with the same security as a password.
            </p>
          </motion.div>
        </main>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <RequestBackdrop />
      <RequestNav />

      <main className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Step Selector */}
        <AnimatePresence mode="wait">
        {step === 'anonymous' && (
          <motion.div
            key="anonymous"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-card/88 border border-border/30 rounded-lg p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl"
          >
            <motion.div
              className="mb-5 inline-flex items-center gap-2 rounded border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Radar className="h-3.5 w-3.5" />
              Secure intake channel online
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Initiate Intelligence Request</h1>
            <p className="text-sm sm:text-base text-foreground/60 mb-6 sm:mb-8">How would you like to proceed?</p>

            <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-3 sm:space-y-4">
              <motion.button
                variants={itemVariants}
                onClick={() => setStep('form')}
                whileHover={{ y: -4, borderColor: 'rgba(39, 213, 110, 0.65)' }}
                whileTap={{ scale: 0.99 }}
                className="w-full p-4 sm:p-6 text-left border border-primary/30 rounded bg-background/35 hover:bg-primary/5 transition group relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded border border-primary/30 bg-primary/10 text-primary">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-primary group-hover:text-primary/80 transition mb-1 sm:mb-2">
                      Anonymous Submission
                    </h3>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-primary/60 transition group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <p className="text-foreground/60 text-xs sm:text-sm">
                  Submit your request without creating an account. Receive a tracking token for status updates.
                </p>
              </motion.button>

              <motion.button
                variants={itemVariants}
                onClick={() => setStep('account')}
                whileHover={{ y: -4, borderColor: 'rgba(118, 240, 163, 0.6)' }}
                whileTap={{ scale: 0.99 }}
                className="w-full p-4 sm:p-6 text-left border border-secondary/30 rounded bg-background/35 hover:bg-secondary/5 transition group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded border border-secondary/30 bg-secondary/10 text-secondary">
                      <UserRoundCheck className="h-4 w-4" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-secondary group-hover:text-secondary/80 transition mb-1 sm:mb-2">
                      Create Client Account
                    </h3>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-secondary/60 transition group-hover:translate-x-1 group-hover:text-secondary" />
                </div>
                <p className="text-foreground/60 text-xs sm:text-sm">
                  Register for a secure client portal. Access case updates, encrypted messaging, and document vault.
                </p>
              </motion.button>

              <motion.div variants={itemVariants}>
                <Link href="/login" className="block">
                <motion.div
                  whileHover={{ y: -4, borderColor: 'rgba(232, 242, 236, 0.25)' }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full p-4 sm:p-6 text-left border border-border/30 rounded bg-background/35 hover:bg-foreground/5 transition group"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded border border-border/40 bg-foreground/5 text-foreground/70">
                    <LockKeyhole className="h-4 w-4" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold group-hover:text-primary transition mb-1 sm:mb-2">
                    Existing Account
                  </h3>
                  <p className="text-foreground/60 text-xs sm:text-sm">
                    Already have a ShadowNode account? Log in to your client portal.
                  </p>
                </motion.div>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}

        {/* Anonymous Form */}
        {step === 'form' && (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-card/88 border border-border/30 rounded-lg p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl"
          >
            <button
              type="button"
              onClick={() => setStep('anonymous')}
              className="text-xs sm:text-sm text-foreground/50 hover:text-foreground mb-4 sm:mb-6 flex items-center gap-2 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>

            <div className="mb-5 inline-flex items-center gap-2 rounded border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Encrypted assessment builder
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Anonymous Request Form</h1>
            <p className="text-sm sm:text-base text-foreground/60 mb-6 sm:mb-8">
              Your submission will be processed securely. No identifying information is stored without your consent.
            </p>

            <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-4 sm:space-y-6">
              <motion.div variants={itemVariants}>
                <label className="block text-xs sm:text-sm font-medium mb-2">Service Required</label>
                <select
                  value={formData.serviceType}
                  onChange={(e) => handleFormChange('serviceType', e.target.value)}
                  className="w-full bg-background/80 border border-border/50 rounded px-3 sm:px-4 py-2 text-foreground text-xs sm:text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                >
                  <option value="">Select a service...</option>
                  <option value="osint">OSINT - Open Source Intelligence</option>
                  <option value="forensics">FORENSICS - Digital Forensics Analysis</option>
                  <option value="hacking">ETHICAL HACKING - Penetration Testing</option>
                  <option value="mixed">MIXED - Multiple Services</option>
                </select>
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className="block text-xs sm:text-sm font-medium mb-2">Description of Request</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Describe what intelligence or security assessment you need. Be specific but avoid revealing identities if anonymity is preferred."
                  className="w-full bg-background/80 border border-border/50 rounded px-3 sm:px-4 py-2 text-foreground text-xs sm:text-sm min-h-24 sm:min-h-32 transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className="block text-xs sm:text-sm font-medium mb-2">Timeline</label>
                <select
                  value={formData.timeline}
                  onChange={(e) => handleFormChange('timeline', e.target.value)}
                  className="w-full bg-background/80 border border-border/50 rounded px-3 sm:px-4 py-2 text-foreground text-xs sm:text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                >
                  <option value="">Select timeline...</option>
                  <option value="urgent">Urgent (48 hours)</option>
                  <option value="standard">Standard (1-2 weeks)</option>
                  <option value="flexible">Flexible (As needed)</option>
                </select>
              </motion.div>

              {/* Price Estimate Display */}
              <AnimatePresence>
                {estimatedPrice && (
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.35 }}
                    className="bg-primary/10 border border-primary/30 rounded p-4 sm:p-6 relative overflow-hidden"
                  >
                    <motion.div
                      className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary/12 to-transparent"
                      animate={{ x: ['-120%', '320%'] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <p className="text-xs sm:text-sm text-foreground/60 mb-1">Estimated Price</p>
                    <p className="text-2xl sm:text-3xl font-bold text-primary mb-2">
                      ${estimatedPrice.toLocaleString()}
                    </p>
                    <p className="text-xs text-foreground/50">
                      This is an estimate based on your request details. Final pricing will be confirmed by our case manager after initial assessment.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div variants={itemVariants}>
                <label className="block text-xs sm:text-sm font-medium mb-2">Contact Method (Optional)</label>
                <Input
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="Encrypted email, ProtonMail, Signal, etc. Leave blank if you'll use token only."
                  className="bg-background/80 border border-border/50 text-xs sm:text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className="block text-xs sm:text-sm font-medium mb-2">Email for Confirmation (Required)</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="We send minimal confirmations. This email can be disposable."
                  className="bg-background/80 border border-border/50 text-xs sm:text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
              </motion.div>

              <motion.div variants={itemVariants} className="bg-background/50 border border-border/20 rounded p-3 sm:p-4">
                <p className="text-xs text-foreground/60">
                  <span className="text-primary font-bold">Privacy Notice:</span> Your request is encrypted in transit and at rest. No logs are kept beyond what is necessary for case management. All data is deleted 90 days after case closure.
                </p>
              </motion.div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { y: -2, boxShadow: '0 16px 36px rgba(39, 213, 110, 0.22)' } : undefined}
                whileTap={!loading ? { scale: 0.99 } : undefined}
                className="w-full bg-primary text-primary-foreground py-2.5 sm:py-3 rounded font-medium text-xs sm:text-sm hover:bg-primary/90 disabled:opacity-50 transition"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </motion.button>
            </motion.div>
          </motion.form>
        )}

        {/* Account Creation */}
        {step === 'account' && (
          <motion.div
            key="account"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-card/88 border border-border/30 rounded-lg p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl"
          >
            <button
              onClick={() => setStep('anonymous')}
              className="text-xs sm:text-sm text-foreground/50 hover:text-foreground mb-4 sm:mb-6 flex items-center gap-2 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Create Client Account</h1>
            <p className="text-sm sm:text-base text-foreground/60 mb-6 sm:mb-8">Account creation coming soon. For now, use anonymous submission.</p>
            <Link href="/request">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm sm:text-base">
                Back to Request Form
              </Button>
            </Link>
          </motion.div>
        )}
        </AnimatePresence>
      </main>
    </div>
  )
}
