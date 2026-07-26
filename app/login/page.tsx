'use client'
import { useState } from 'react'
import Link from 'next/link'
import { EnhancedAuthModal } from '@/components/auth/EnhancedAuthModal'
import type { LoginData, SignupData } from '@/components/auth/EnhancedAuthModal'

export default function AuthPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (data: LoginData | SignupData, type: 'login' | 'signup') => {
    setLoading(true)
    setError('')

    try {
      const endpoint = type === 'login' ? '/api/auth/login' : '/api/auth/signup'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || (type === 'login' ? 'Invalid credentials' : 'Signup failed'))
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
    <div className="min-h-screen bg-transparent text-foreground flex items-center justify-center">
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(90deg, #00ff41 1px, transparent 1px), linear-gradient(#00ff41 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="w-full max-w-md mx-auto px-6 relative z-10 space-y-6">
        <EnhancedAuthModal
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />

        <div className="space-y-3">
          <Link href="/request" className="block text-center text-sm text-foreground/60 hover:text-foreground transition">
            Prefer anonymous submission? <span className="text-primary">Submit a request</span>
          </Link>
          <p className="text-center text-xs text-foreground/40">
            Your credentials are encrypted in transit and at rest.
          </p>
        </div>
      </div>
    </div>
  )
}
