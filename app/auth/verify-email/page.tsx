'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')

  const handleResend = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        setError('Failed to resend verification email')
        return
      }

      setResent(true)
      setTimeout(() => setResent(false), 3000)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground flex items-center justify-center">
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(90deg, #00ff41 1px, transparent 1px), linear-gradient(#00ff41 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="w-full max-w-md mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
            <div className="p-8 space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Header */}
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Verify your email</h1>
                <p className="text-sm text-muted-foreground">
                  We&apos;ve sent a verification link to your email address. Click the link to activate your account.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Success Alert */}
              {resent && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert className="border-primary/30 bg-primary/10">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-primary">
                      Verification email sent. Check your inbox.
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={handleResend}
                  disabled={loading || resent}
                  className="w-full"
                >
                  {loading ? 'Sending...' : resent ? 'Email sent!' : 'Resend verification email'}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <Link href="/login">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to login
                  </Link>
                </Button>
              </div>

              {/* Info */}
              <div className="text-center text-xs text-muted-foreground space-y-1">
                <p>Didn&apos;t receive the email? Check your spam folder or contact support.</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
