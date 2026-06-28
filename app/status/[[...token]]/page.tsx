'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Request {
  id: string
  token: string
  service_type: string
  status: 'submitted' | 'active' | 'completed'
  description: string
  budget: string
  timeline: string
  created_at: string
  updated_at: string
  case_manager?: string
  case_number?: string
}

const STATUS_COLORS = {
  submitted: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  active: { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
  completed: { color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/30' }
}

const STATUS_LABELS = {
  submitted: 'Under Review',
  active: 'Investigation Active',
  completed: 'Completed'
}

export default function StatusPage() {
  const params = useParams()
  const tokenParam = Array.isArray(params?.token) ? params.token[0] : params?.token
  
  const [token, setToken] = useState(tokenParam || '')
  const [request, setRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(!!tokenParam)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/requests/${token}`)
      
      if (!response.ok) {
        setError('Request token not found. Please check and try again.')
        setRequest(null)
      } else {
        const data = await response.json()
        setRequest(data)
        setSearched(true)
      }
    } catch (err) {
      setError('Error retrieving request status. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tokenParam) {
      setToken(tokenParam)
    }
  }, [tokenParam])

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <nav className="border-b border-border/30 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SN</span>
            </div>
            <span className="text-xl font-bold text-primary">SHADOWNODE</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {!request ? (
          <div className="bg-card border border-border/30 rounded-lg p-8">
            <h1 className="text-3xl font-bold mb-2">Case Status Tracker</h1>
            <p className="text-foreground/60 mb-8">
              Enter your case reference token to check the status of your intelligence request.
            </p>

            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Case Reference Token</label>
                <Input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your tracking token here..."
                  className="bg-background border border-border/50 font-mono text-sm"
                />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded p-4">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full bg-primary text-primary-foreground py-3 rounded font-medium hover:bg-primary/90 disabled:opacity-50 transition"
              >
                {loading ? 'Checking...' : 'Check Status'}
              </button>
            </form>

            <div className="mt-12 pt-8 border-t border-border/20">
              <h3 className="font-bold mb-4 text-foreground/80">Need help?</h3>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">•</span>
                  <span>Lost your token? Contact us at the email you provided.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">•</span>
                  <span>Want to create an account? Create a client portal account for more features.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">•</span>
                  <span>Token format: 32-character alphanumeric string.</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <button
              onClick={() => setRequest(null)}
              className="text-sm text-foreground/50 hover:text-foreground flex items-center gap-2"
            >
              ← Search Another Case
            </button>

            {/* Status Card */}
            <div className="bg-card border border-border/30 rounded-lg p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Case Status</h1>
                  <p className="text-foreground/60 font-mono text-sm">{request.token}</p>
                </div>
                <div className={`px-4 py-2 rounded-lg border ${STATUS_COLORS[request.status].border} ${STATUS_COLORS[request.status].bg}`}>
                  <p className={`font-medium text-sm ${STATUS_COLORS[request.status].color}`}>
                    {STATUS_LABELS[request.status]}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-background/50 border border-border/20 rounded p-4">
                  <p className="text-xs text-foreground/50 mb-1">Service Type</p>
                  <p className="font-medium text-foreground capitalize">{request.service_type}</p>
                </div>
                <div className="bg-background/50 border border-border/20 rounded p-4">
                  <p className="text-xs text-foreground/50 mb-1">Case Number</p>
                  <p className="font-medium text-foreground font-mono">{request.case_number || 'Pending Assignment'}</p>
                </div>
                <div className="bg-background/50 border border-border/20 rounded p-4">
                  <p className="text-xs text-foreground/50 mb-1">Submitted</p>
                  <p className="font-medium text-foreground">{new Date(request.created_at).toLocaleDateString()}</p>
                </div>
                <div className="bg-background/50 border border-border/20 rounded p-4">
                  <p className="text-xs text-foreground/50 mb-1">Case Manager</p>
                  <p className="font-medium text-foreground">{request.case_manager || 'Being Assigned'}</p>
                </div>
              </div>

              <div className="bg-background/50 border border-border/20 rounded p-4 mb-8">
                <p className="text-xs text-foreground/50 mb-2">Request Description</p>
                <p className="text-foreground">{request.description}</p>
              </div>

              {/* Timeline */}
              <div className="relative">
                <h3 className="font-bold mb-6 text-foreground/80">Case Timeline</h3>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-primary rounded-full" />
                      <div className="w-0.5 h-12 bg-primary/30" />
                    </div>
                    <div className="pb-4">
                      <p className="font-medium text-primary">Request Submitted</p>
                      <p className="text-sm text-foreground/60">{new Date(request.created_at).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${request.status === 'submitted' ? 'bg-muted' : 'bg-primary'}`} />
                      {request.status !== 'completed' && <div className="w-0.5 h-12 bg-border/30" />}
                    </div>
                    <div className="pb-4">
                      <p className={`font-medium ${request.status === 'submitted' ? 'text-foreground/50' : 'text-primary'}`}>
                        Initial Assessment
                      </p>
                      <p className="text-sm text-foreground/60">
                        {request.status === 'submitted' ? 'Expected within 24 hours' : 'Completed'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${request.status !== 'active' ? 'bg-muted' : 'bg-primary'}`} />
                      {request.status === 'completed' && <div className="w-0.5 h-12 bg-primary/30" />}
                    </div>
                    <div className="pb-4">
                      <p className={`font-medium ${request.status === 'active' || request.status === 'completed' ? 'text-primary' : 'text-foreground/50'}`}>
                        Investigation Active
                      </p>
                      <p className="text-sm text-foreground/60">
                        {request.status !== 'submitted' ? 'In Progress' : 'Pending'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${request.status === 'completed' ? 'bg-primary' : 'bg-muted'}`} />
                    </div>
                    <div>
                      <p className={`font-medium ${request.status === 'completed' ? 'text-primary' : 'text-foreground/50'}`}>
                        Delivery & Briefing
                      </p>
                      <p className="text-sm text-foreground/60">
                        {request.status === 'completed' ? 'Available for download' : 'Pending'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-card border border-border/30 rounded-lg p-6 flex flex-col sm:flex-row gap-4">
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full border-border/30">
                  Return Home
                </Button>
              </Link>
              <Link href="/request" className="flex-1">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  New Request
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
