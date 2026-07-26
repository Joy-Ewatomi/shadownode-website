'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FormField } from '@/components/auth/FormField'
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator'
import { PasswordVisibilityToggle } from '@/components/auth/PasswordVisibilityToggle'
import { Mail, Lock, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Step = 'email' | 'reset' | 'success'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        setError('Failed to send reset email')
        return
      }

      setStep('reset')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 12) {
      setError('Password must be at least 12 characters')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        setError('Failed to reset password')
        return
      }

      setStep('success')
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
              {/* Progress indicator */}
              <div className="flex gap-1">
                {(['email', 'reset', 'success'] as const).map((s, i) => (
                  <motion.div
                    key={s}
                    className={cn(
                      'flex-1 h-1 rounded-full transition-colors',
                      (['email', 'reset', 'success'].indexOf(step) >= i) ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                ))}
              </div>

              {step === 'email' && (
                <>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Reset password</h1>
                    <p className="text-sm text-muted-foreground">
                      Enter your email address and we&apos;ll send you a link to reset your password.
                    </p>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <FormField label="Email" required>
                      <div className="relative">
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                          disabled={loading}
                          className="pl-10"
                        />
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                    </FormField>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Sending...' : 'Send reset link'}
                    </Button>
                  </form>
                </>
              )}

              {step === 'reset' && (
                <>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Create new password</h1>
                    <p className="text-sm text-muted-foreground">
                      Set a strong password for your account.
                    </p>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleResetSubmit} className="space-y-4">
                    <FormField label="New Password" required>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          required
                          disabled={loading}
                          className="pl-10 pr-10"
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <PasswordVisibilityToggle isVisible={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                      </div>
                      <PasswordStrengthIndicator password={password} />
                    </FormField>

                    <FormField label="Confirm Password" required>
                      <div className="relative">
                        <Input
                          type={showConfirm ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          required
                          disabled={loading}
                          className="pl-10 pr-10"
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <PasswordVisibilityToggle isVisible={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />
                      </div>
                    </FormField>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Resetting...' : 'Reset password'}
                    </Button>
                  </form>
                </>
              )}

              {step === 'success' && (
                <>
                  <div className="flex justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.6 }}
                    >
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-primary" />
                      </div>
                    </motion.div>
                  </div>

                  <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Password reset successful</h1>
                    <p className="text-sm text-muted-foreground">
                      Your password has been updated. You can now log in with your new password.
                    </p>
                  </div>

                  <Button className="w-full" asChild>
                    <Link href="/login">
                      Back to login
                    </Link>
                  </Button>
                </>
              )}

              {/* Back button */}
              {step !== 'success' && (
                <Button
                  variant="ghost"
                  className="w-full"
                  asChild
                >
                  <Link href="/login">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to login
                  </Link>
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
