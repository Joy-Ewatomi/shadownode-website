'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { useState } from 'react'

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

  const handleSubmit = async (e: React.FormEvent) => {
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
      <div className="min-h-screen bg-gradient-to-br from-background via-slate-900 to-background">
        <nav className="border-b border-border/30 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center flex-shrink-0">
                <span className="text-primary-foreground font-bold text-sm">SIB</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-primary truncate">SHADOWNODE INTELLIGENCE BUREAU</span>
            </Link>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20">
          <div className="bg-card border border-border/30 rounded-lg p-6 sm:p-8 lg:p-12 text-center">
            <div className="mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl sm:text-2xl text-primary">✓</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Request Submitted</h1>
              <p className="text-sm sm:text-base text-foreground/60">Your intelligence request has been received and assigned a tracking token.</p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="bg-background border border-primary/30 rounded p-4 sm:p-6 font-mono overflow-x-auto">
                <p className="text-foreground/50 text-xs sm:text-sm mb-2">Case Reference Token:</p>
                <p className="text-primary text-base sm:text-lg break-all text-left">
                  <code>{token}</code>
                </p>
                <p className="text-foreground/50 text-xs mt-4">Save this token. Use it to check case status at /status</p>
              </div>

              {submittedPrice && (
                <div className="bg-secondary/10 border border-secondary/30 rounded p-4 sm:p-6">
                  <p className="text-foreground/50 text-xs sm:text-sm mb-2">Estimated Investigation Cost</p>
                  <p className="text-2xl sm:text-3xl font-bold text-secondary">
                    ${submittedPrice.toLocaleString()}
                  </p>
                  <p className="text-xs text-foreground/50 mt-3">
                    Our case manager will contact you to confirm scope and final pricing. This estimate may be adjusted based on additional assessment details.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3 sm:space-y-4 text-left bg-background/50 border border-border/30 rounded p-4 sm:p-6 mb-6 sm:mb-8">
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
            </div>

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
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-900 to-background">
      <nav className="border-b border-border/30 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold text-sm">SIB</span>
            </div>
            <span className="text-lg sm:text-xl font-bold text-primary truncate">SHADOWNODE INTELLIGENCE BUREAU</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Step Selector */}
        {step === 'anonymous' && (
          <div className="bg-card border border-border/30 rounded-lg p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Initiate Intelligence Request</h1>
            <p className="text-sm sm:text-base text-foreground/60 mb-6 sm:mb-8">How would you like to proceed?</p>

            <div className="space-y-3 sm:space-y-4">
              <button
                onClick={() => setStep('form')}
                className="w-full p-4 sm:p-6 text-left border border-primary/30 rounded hover:bg-primary/5 transition group"
              >
                <h3 className="text-base sm:text-lg font-bold text-primary group-hover:text-primary/80 transition mb-1 sm:mb-2">
                  Anonymous Submission
                </h3>
                <p className="text-foreground/60 text-xs sm:text-sm">
                  Submit your request without creating an account. Receive a tracking token for status updates.
                </p>
              </button>

              <button
                onClick={() => setStep('account')}
                className="w-full p-4 sm:p-6 text-left border border-secondary/30 rounded hover:bg-secondary/5 transition group"
              >
                <h3 className="text-base sm:text-lg font-bold text-secondary group-hover:text-secondary/80 transition mb-1 sm:mb-2">
                  Create Client Account
                </h3>
                <p className="text-foreground/60 text-xs sm:text-sm">
                  Register for a secure client portal. Access case updates, encrypted messaging, and document vault.
                </p>
              </button>

              <Link href="/login" className="block">
                <div className="w-full p-4 sm:p-6 text-left border border-border/30 rounded hover:bg-foreground/5 transition group">
                  <h3 className="text-base sm:text-lg font-bold group-hover:text-primary transition mb-1 sm:mb-2">
                    Existing Account
                  </h3>
                  <p className="text-foreground/60 text-xs sm:text-sm">
                    Already have a ShadowNode account? Log in to your client portal.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Anonymous Form */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="bg-card border border-border/30 rounded-lg p-6 sm:p-8">
            <button
              type="button"
              onClick={() => setStep('anonymous')}
              className="text-xs sm:text-sm text-foreground/50 hover:text-foreground mb-4 sm:mb-6 flex items-center gap-2"
            >
              ← Back
            </button>

            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Anonymous Request Form</h1>
            <p className="text-sm sm:text-base text-foreground/60 mb-6 sm:mb-8">
              Your submission will be processed securely. No identifying information is stored without your consent.
            </p>

            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2">Service Required</label>
                <select
                  value={formData.serviceType}
                  onChange={(e) => handleFormChange('serviceType', e.target.value)}
                  className="w-full bg-background border border-border/50 rounded px-3 sm:px-4 py-2 text-foreground text-xs sm:text-sm"
                  required
                >
                  <option value="">Select a service...</option>
                  <option value="osint">OSINT - Open Source Intelligence</option>
                  <option value="forensics">FORENSICS - Digital Forensics Analysis</option>
                  <option value="hacking">ETHICAL HACKING - Penetration Testing</option>
                  <option value="mixed">MIXED - Multiple Services</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2">Description of Request</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Describe what intelligence or security assessment you need. Be specific but avoid revealing identities if anonymity is preferred."
                  className="w-full bg-background border border-border/50 rounded px-3 sm:px-4 py-2 text-foreground text-xs sm:text-sm min-h-24 sm:min-h-32"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2">Timeline</label>
                <select
                  value={formData.timeline}
                  onChange={(e) => handleFormChange('timeline', e.target.value)}
                  className="w-full bg-background border border-border/50 rounded px-3 sm:px-4 py-2 text-foreground text-xs sm:text-sm"
                  required
                >
                  <option value="">Select timeline...</option>
                  <option value="urgent">Urgent (48 hours)</option>
                  <option value="standard">Standard (1-2 weeks)</option>
                  <option value="flexible">Flexible (As needed)</option>
                </select>
              </div>

              {/* Price Estimate Display */}
              {estimatedPrice && (
                <div className="bg-primary/10 border border-primary/30 rounded p-4 sm:p-6">
                  <p className="text-xs sm:text-sm text-foreground/60 mb-1">Estimated Price</p>
                  <p className="text-2xl sm:text-3xl font-bold text-primary mb-2">
                    ${estimatedPrice.toLocaleString()}
                  </p>
                  <p className="text-xs text-foreground/50">
                    This is an estimate based on your request details. Final pricing will be confirmed by our case manager after initial assessment.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2">Contact Method (Optional)</label>
                <Input
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="Encrypted email, ProtonMail, Signal, etc. Leave blank if you'll use token only."
                  className="bg-background border border-border/50 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2">Email for Confirmation (Required)</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="We send minimal confirmations. This email can be disposable."
                  className="bg-background border border-border/50 text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="bg-background/50 border border-border/20 rounded p-3 sm:p-4">
                <p className="text-xs text-foreground/60">
                  <span className="text-primary font-bold">Privacy Notice:</span> Your request is encrypted in transit and at rest. No logs are kept beyond what is necessary for case management. All data is deleted 90 days after case closure.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-2.5 sm:py-3 rounded font-medium text-xs sm:text-sm hover:bg-primary/90 disabled:opacity-50 transition"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}

        {/* Account Creation */}
        {step === 'account' && (
          <div className="bg-card border border-border/30 rounded-lg p-6 sm:p-8">
            <button
              onClick={() => setStep('anonymous')}
              className="text-xs sm:text-sm text-foreground/50 hover:text-foreground mb-4 sm:mb-6 flex items-center gap-2"
            >
              ← Back
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Create Client Account</h1>
            <p className="text-sm sm:text-base text-foreground/60 mb-6 sm:mb-8">Account creation coming soon. For now, use anonymous submission.</p>
            <Link href="/request">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm sm:text-base">
                Back to Request Form
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
