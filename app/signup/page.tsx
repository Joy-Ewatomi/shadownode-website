'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useState } from 'react'

export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'signup'>('signup') // Default is signup
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/signup'
    const bodyData = tab === 'login' 
      ? { username, password } 
      : { email, username, password }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || (tab === 'login' ? 'Invalid username or password' : 'Signup failed'))
        return
      }

      window.location.href = '/dashboard'
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground flex items-center">
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(90deg, #00ff41 1px, transparent 1px), linear-gradient(#00ff41 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="w-full max-w-md mx-auto px-6 relative z-10">
        <Link href="/" className="flex items-center gap-2 mb-12 justify-center">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">SOB</span>
          </div>
          <span className="text-sm font-bold text-primary">SHADOWNODE OPERATIONS BUREAU</span>
        </Link>

        <div className="bg-card border border-border/30 rounded-lg p-8">
          {/* Tabs */}
          <div className="flex gap-0 mb-8 border-b border-border/30">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-3 text-center font-medium transition border-b-2 ${
                tab === 'login' ? 'border-primary text-primary' : 'border-transparent text-foreground/50 hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`flex-1 py-3 text-center font-medium transition border-b-2 ${
                tab === 'signup' ? 'border-primary text-primary' : 'border-transparent text-foreground/50 hover:text-foreground'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded font-medium hover:bg-primary/90 disabled:opacity-50 transition"
            >
              {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {tab === 'login' && (
            <p className="text-center text-sm text-foreground/60 mt-4">
              <a href="#" className="text-primary hover:underline">Forgot password?</a>
            </p>
          )}

          <div className="mt-6 pt-6 border-t border-border/20">
            <Link href="/request">
              <p className="text-center text-sm text-foreground/60 hover:text-foreground transition cursor-pointer">
                Prefer anonymous submission? <span className="text-primary">Submit a request</span>
              </p>
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-foreground/40 mt-8">
          Your credentials are encrypted in transit and at rest.
        </p>
      </div>
    </div>
  )
}