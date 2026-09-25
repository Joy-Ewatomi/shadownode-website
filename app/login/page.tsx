'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, Eye, Github, Lock, Mail, Shield, Zap } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { evaluatePassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS } from '@/lib/password-policy'
import { PageTransition } from '@/components/animations/PageTransition'
import { motion } from 'framer-motion'

export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberDevice, setRememberDevice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorMethod, setTwoFactorMethod] = useState<'totp' | 'recovery'>('totp')

  const passwordChecks = useMemo(() => {
    const policy = evaluatePassword(password)
    return PASSWORD_REQUIREMENTS.map((requirement) => ({
      label: requirement.label,
      valid: policy.checks[requirement.id],
    }))
  }, [password])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const pathname = window.location.pathname

      if (pathname.endsWith('/signup') || params.get('tab') === 'signup') {
        setTab('signup')
      }

      if (params.get('twoFactorRequired') === '1') {
        setTwoFactorRequired(true)
        setError('Enter the code from your authenticator app.')
      }

      if (params.get('loggedOut') === 'all') {
        setSuccess('All devices were logged out successfully.')
      }

      if (params.get('passwordReset') === '1') {
        setSuccess('Password reset successfully. Sign in with your new password.')
      }

      const oauthError = params.get('oauthError')
      const oauthMessages: Record<string, string> = {
        provider_access_denied: 'Sign-in was cancelled or access was denied by the provider.',
        provider_error: 'The OAuth provider could not complete sign-in. Please try again.',
        missing_code: 'The provider did not return a sign-in code. Please try again.',
        missing_state: 'The sign-in response was incomplete. Please try again.',
        missing_cookie: 'Your sign-in session expired or cookies were unavailable. Please try again.',
        state_mismatch: 'The sign-in session could not be verified. Please try again.',
        missing_client_id: 'OAuth sign-in is temporarily unavailable.',
        missing_client_secret: 'OAuth sign-in is temporarily unavailable.',
      }
      if (oauthError && oauthMessages[oauthError]) {
        setError(oauthMessages[oauthError])
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const submittedPassword = isSignup ? String(formData.get('newPassword') ?? '') : password
    const submittedConfirmation = isSignup ? String(formData.get('confirmNewPassword') ?? '') : confirmPassword
    setLoading(true)
    setError('')
    setSuccess('')

    const endpoint = twoFactorRequired ? '/api/auth/2fa/verify' : tab === 'login' ? '/api/auth/login' : '/api/auth/signup'
    const bodyData = tab === 'login'
      ? twoFactorRequired ? { code: twoFactorCode, method: twoFactorMethod } : { username, password, rememberDevice }
      : { email, username, password: submittedPassword, confirmPassword: submittedConfirmation }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Authentication failed')
        return
      }

      if (data.requiresTwoFactor) {
        setTwoFactorRequired(true)
        setError('Enter the code from your authenticator app.')
        return
      }

      if (tab === 'signup') {
        setTab('login')
        setSuccess('Account created. Check your email to verify it, then sign in.')
        setPassword('')
        setConfirmPassword('')
      } else {
        window.location.href = '/dashboard'
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isSignup = tab === 'signup' && !twoFactorRequired

  return (

    <PageTransition>

    <main className="relative min-h-svh px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0"/>
        <div className="absolute inset-0"/>
        <div className="absolute"/>
        <div className="absolute"/>
        <div className="absolute"/>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-5xl flex-col items-center justify-center gap-5">
        <section className={`w-full overflow-hidden rounded-lg border border-[#123a2d] bg-[#06110f]/95 shadow-[0_0_70px_rgba(0,255,120,0.12)] backdrop-blur-xl ${isSignup ? 'max-w-3xl' : 'max-w-xl'}`}>
          <div className="border-b border-white/5 px-6 py-5 text-center sm:px-8">
            <h1 className="font-serif text-3xl font-bold text-[#20dc73]">ShadowNode</h1>
            <p className="mt-1 font-serif text-sm text-white/55">Enterprise Security Portal</p>
          </div>

          <div className="px-5 py-5 sm:px-8 sm:py-6">
            {!twoFactorRequired && (
              <div className="mb-5 grid grid-cols-2 rounded-md border border-white/8 bg-[#091714] p-1">
                {(['login', 'signup'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTab(item)}
                    className={`h-9 rounded font-serif text-sm transition ${tab === item ? 'bg-[#0d1d19] text-white shadow-inner' : 'text-white/55 hover:text-white'}`}
                  >
                    {item === 'login' ? 'Login' : 'Sign up'}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className={isSignup ? 'grid gap-4 md:grid-cols-2' : 'space-y-4'}>
                {twoFactorRequired ? (
                  <div className="space-y-3">
                    <Field label={twoFactorMethod === 'totp' ? 'Authentication code' : 'Recovery code'} required>
                      <Input className="h-10 border-[#19352d] bg-[#fffdd1] text-black" inputMode={twoFactorMethod === 'totp' ? 'numeric' : 'text'} autoComplete="one-time-code" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} placeholder={twoFactorMethod === 'totp' ? '123456' : 'XXXX-XXXX-XXXX-XXXX'} required minLength={twoFactorMethod === 'totp' ? 6 : 16} maxLength={twoFactorMethod === 'totp' ? 6 : 19} />
                    </Field>
                    <button type="button" className="text-sm text-[#20e978] hover:underline" onClick={() => { setTwoFactorMethod((current) => current === 'totp' ? 'recovery' : 'totp'); setTwoFactorCode(''); setError('') }}>
                      {twoFactorMethod === 'totp' ? 'Use a recovery code' : 'Use an authenticator code'}
                    </button>
                  </div>
                ) : (
                  <>
                    <Field label="Username" required>
                      <Input className="h-10 border-[#19352d] bg-[#fffdd1] text-black placeholder:text-black/35" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your-username" required />
                    </Field>

                    {isSignup && (
                      <Field label="Email" required>
                        <InputShell icon={<Mail className="h-4 w-4" />}>
                          <Input className="h-10 border-0 bg-transparent pl-10 text-white placeholder:text-white/45 focus-visible:ring-0" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
                        </InputShell>
                      </Field>
                    )}
                  </>
                )}

                {!twoFactorRequired && <Field label="Password" required>
                  <InputShell icon={<Lock className="h-4 w-4" />} trailing={<Eye className="h-4 w-4" />}>
                    <Input className="h-10 border-0 bg-transparent px-10 text-white placeholder:text-white/45 focus-visible:ring-0" type="password" name={isSignup ? "newPassword" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" required minLength={isSignup ? PASSWORD_MIN_LENGTH : undefined} maxLength={isSignup ? PASSWORD_MAX_LENGTH : undefined} />
                  </InputShell>
                </Field>}

                {isSignup && (
                  <Field label="Confirm Password" required>
                    <InputShell icon={<Lock className="h-4 w-4" />} trailing={<Eye className="h-4 w-4" />}>
                      <Input className="h-10 border-0 bg-transparent px-10 text-white placeholder:text-white/45 focus-visible:ring-0" type="password" name="confirmNewPassword" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••••••" required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} />
                    </InputShell>
                  </Field>
                )}
              </div>

              {isSignup && (
                <div aria-live="polite" aria-label="Password requirements" className="grid gap-x-6 gap-y-1 border-t border-[#20dc73] pt-2 text-xs text-white/75 sm:grid-cols-3">
                  {passwordChecks.map((check) => (
                    <span key={check.label} className={check.valid ? 'text-[#7dffb0]' : 'text-white/45'}>
                      <Check className="mr-1 inline h-3 w-3" />{check.label}
                    </span>
                  ))}
                </div>
              )}

              {tab === 'login' && !twoFactorRequired && (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <label className="flex items-center gap-2 text-white/60">
                    <input type="checkbox" checked={rememberDevice} onChange={(e) => setRememberDevice(e.target.checked)} className="h-4 w-4 rounded border-white/20 accent-[#29d96f]" />
                    Remember device
                  </label>
                  <Link href="/forgot-password" className="text-[#20e978] hover:underline">Forgot password?</Link>
                </div>
              )}

              {error && (
                <div className="rounded border border-[#ff6b6b]/30 bg-[#ff6b6b]/10 px-3 py-2 text-sm text-[#ffd1d1]">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded border border-[#20dc73]/35 bg-[#20dc73]/10 px-3 py-2 text-sm text-[#c7ffe6]">
                  {success}
                </div>
              )}

              <Button type="submit" disabled={loading} className="h-11 w-full rounded-md bg-[#2dd873] font-serif text-base text-black hover:bg-[#37f082] disabled:opacity-60">
                {loading ? 'Authenticating...' : twoFactorRequired ? 'Verify code' : tab === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            {!twoFactorRequired && (
              <>
                <Divider label={tab === 'login' ? 'OR CONTINUE WITH' : 'OR SIGN UP WITH'} />
                <div className="grid grid-cols-2 gap-3">
                  <OAuthButton provider="google" label="Google" icon={<span className="text-base">◎</span>} />
                  <OAuthButton provider="github" label="GitHub" icon={<Github className="h-4 w-4" />} />
                </div>
              </>
            )}

            <div className="mt-5 flex flex-wrap gap-2 border-t border-white/5 pt-4 text-xs">
              <TrustChip icon={<Lock className="h-3 w-3" />} label="TLS 1.3" />
              <TrustChip icon={<Shield className="h-3 w-3" />} label="AES-256" />
              <TrustChip icon={<Zap className="h-3 w-3" />} label="Zero Trust" />
              <TrustChip icon={<Eye className="h-3 w-3" />} label="Secure Session" />
            </div>
          </div>
        </section>

        <div className="text-center font-serif text-sm text-white/45">
          <p className="text-xs text-white/30">Your credentials are encrypted in transit and at rest.</p>
        </div>
      </div>
    </main>
    </PageTransition>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block font-serif text-sm text-white/60">
      {label} {required ? <span className="text-[#ff5f66]">*</span> : null}
      <div className="mt-2">{children}</div>
    </label>
  )
}

function InputShell({ icon, trailing, children }: { icon: React.ReactNode; trailing?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative rounded-md border border-[#19352d] bg-[#091714] text-white/58">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
      {children}
      {trailing ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span> : null}
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-white/6" />
      <span className="font-serif text-xs text-white/45">{label}</span>
      <span className="h-px flex-1 bg-white/6" />
    </div>
  )
}

function OAuthButton({ provider, label, icon }: { provider: string; label: string; icon: React.ReactNode }) {
  return (
    <a href={`/api/auth/oauth/${provider}`} className="flex h-10 items-center justify-center gap-2 rounded-md border border-white/7 bg-[#091714] font-serif text-sm text-white/80 transition hover:border-[#20dc73]/45">
      {icon}
      {label}
    </a>
  )
}

function TrustChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-[#2cd877]/35 px-2 py-1 font-serif text-white/85">
      {icon}
      {label}
    </span>
  )
}
