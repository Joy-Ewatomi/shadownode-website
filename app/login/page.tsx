'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('twoFactorRequired') === '1') {
      setTwoFactorRequired(true)
      setError('Enter the code from your authenticator app.')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const endpoint = twoFactorRequired ? '/api/auth/2fa/verify' : tab === 'login' ? '/api/auth/login' : '/api/auth/signup'
    const bodyData = tab === 'login' 
      ? twoFactorRequired ? { code: twoFactorCode } : { username, password }
      : { email, username, password, confirmPassword }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      })

      const data = await response.json()

      if (!response.ok) {

    setError(
   data.error || "Authentication failed"
)

    return

}

      if (data.requiresTwoFactor) {
        setTwoFactorRequired(true)
        setError('Enter the code from your authenticator app.')
        return
      }


if(tab==="signup"){

setTab("login")

setError("Account created. Please sign in.")

setPassword("")

}
else{

window.location.href="/dashboard"

}
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-foreground flex items-center justify-center">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(39,255,118,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(33,255,143,0.1),transparent_22%)] opacity-80" />
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: 'linear-gradient(90deg, rgba(0,255,65,0.12) 1px, transparent 1px), linear-gradient(rgba(0,255,65,0.12) 1px, transparent 1px)',
          backgroundSize: '56px 56px'
        }} />
      </div>

      <div className="w-full max-w-md mx-auto px-6 relative z-10">
        <Link href="/" className="flex items-center gap-2 mb-12 justify-center">
          <div className="w-10 h-10 bg-[#0b2d12] border border-[#14fd7f]/15 rounded flex items-center justify-center shadow-[0_0_20px_rgba(0,255,110,0.15)]">
            <span className="text-[#8cffac] font-bold text-sm">SOB</span>
          </div>
          <span className="text-sm font-bold text-[#8cffac] tracking-[0.18em]">SHADOWNODE OPERATIONS BUREAU</span>
        </Link>

        <div className="relative overflow-hidden rounded-[2rem] border border-[#3cff8d]/20 bg-[#08110c]/95 p-8 shadow-[0_0_80px_rgba(24,255,100,0.18)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(31,255,117,0.16),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(21,255,130,0.08),transparent_20%)]" />
          <div className="relative z-10">
          {/* Tabs */}
          <div className="mb-8 flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-1 shadow-[0_0_30px_rgba(0,255,95,0.12)]">
            <button
              onClick={() => setTab('login')}
              className={`min-w-[140px] rounded-full px-5 py-2 text-sm font-semibold transition ${
                tab === 'login'
                  ? 'bg-[#05110c] text-[#7bf69f] shadow-[0_0_24px_rgba(0,255,90,0.22)]'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`min-w-[140px] rounded-full px-5 py-2 text-sm font-semibold transition ${
                tab === 'signup'
                  ? 'bg-[#05110c] text-[#7bf69f] shadow-[0_0_24px_rgba(0,255,90,0.22)]'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {twoFactorRequired ? (
              <div>
                <label className="block text-sm font-medium mb-2">Authentication code</label>
                <Input type="text" inputMode="numeric" autoComplete="one-time-code" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} placeholder="123456" required minLength={6} maxLength={6} />
              </div>
            ) : <>
            {tab === 'signup' && (
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="yourusername"
                required
              />
            </div>
            </>}

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={12}
              />
            </div>

            {!twoFactorRequired && tab === 'signup' && (
              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={12}
                />
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full border border-[#00ff75]/40 bg-gradient-to-r from-[#00e65a] via-[#24ff84] to-[#1bd58f] px-6 py-3 text-sm font-semibold tracking-[0.04em] text-black shadow-[0_0_30px_rgba(0,255,135,0.25)] transition duration-300 hover:scale-[1.005] hover:shadow-[0_0_38px_rgba(0,255,135,0.33)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? 'AUTHENTICATING...'
                : twoFactorRequired
                ? 'VERIFY CODE'
                : tab === 'login'
                ? 'ENTER SECURE PORTAL'
                : 'CREATE CLIENT PROFILE'
              }
            </Button>
          </form>

          {!twoFactorRequired && tab === 'login' && (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {['google', 'microsoft', 'github'].map((provider) => (
                <a key={provider} href={`/api/auth/oauth/${provider}`} className="rounded border border-border/40 px-2 py-2 text-center text-xs capitalize hover:border-primary">{provider}</a>
              ))}
            </div>
          )}

          {tab === 'login' && (
            <p className="text-center text-sm text-foreground/60 mt-4">
              <Link href="/forgot-password" className="text-[#7bf69f] hover:underline">Forgot password?</Link>
            </p>
          )}

          <div className="mt-6 pt-6 border-t border-[#00ff75]/15">
            <Link href="/request">
              <p className="text-center text-sm text-foreground/60 hover:text-foreground transition cursor-pointer">
                Prefer anonymous submission? <span className="text-[#7bf69f]">Submit a request</span>
              </p>
            </Link>
          </div>
        </div>
        </div>

        <p className="text-center text-xs text-foreground/40 mt-8">
          Your credentials are encrypted in transit and at rest.
        </p>
      </div>
    </div>
  )
}
