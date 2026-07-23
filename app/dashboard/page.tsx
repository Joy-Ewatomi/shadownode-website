'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Case {
  id: string
  case_number: string
  service_type: string
  status: 'submitted' | 'active' | 'completed'
  description: string
  budget: string
  timeline: string
  created_at: string
  updated_at: string
  case_manager?: string
}

export default function DashboardPage() {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        // In a real app, get user from session/auth
        const userCookies = document.cookie
        const userId = new URLSearchParams(userCookies).get('sb-user-id')
        
        if (!userId) {
          window.location.href = '/login'
          return
        }

        // Fetch client cases
        const response = await fetch('/api/dashboard/cases')
        if (response.ok) {
          const data = await response.json()
          setCases(data)
        }
      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border/30 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold text-sm">SOB</span>
            </div>
            <span className="text-lg sm:text-xl font-bold text-primary truncate">SHADOWNODE OPERATIONS BUREAU</span>
          </Link>
          <button
            onClick={handleLogout}
            className="text-foreground/70 hover:text-primary transition text-xs sm:text-sm whitespace-nowrap ml-4"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Client Portal</h1>
          <p className="text-xs sm:text-base text-foreground/60">Manage your intelligence cases and secure communications</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12">
          <div className="bg-card border border-border/30 rounded-lg p-4 sm:p-6">
            <p className="text-foreground/60 text-xs sm:text-sm mb-2">Total Cases</p>
            <p className="text-2xl sm:text-3xl font-bold text-primary">{cases.length}</p>
          </div>
          <div className="bg-card border border-border/30 rounded-lg p-4 sm:p-6">
            <p className="text-foreground/60 text-xs sm:text-sm mb-2">Active</p>
            <p className="text-2xl sm:text-3xl font-bold text-secondary">{cases.filter(c => c.status === 'active').length}</p>
          </div>
          <div className="bg-card border border-border/30 rounded-lg p-4 sm:p-6">
            <p className="text-foreground/60 text-xs sm:text-sm mb-2">Completed</p>
            <p className="text-2xl sm:text-3xl font-bold text-primary">{cases.filter(c => c.status === 'completed').length}</p>
          </div>
          <div className="bg-card border border-border/30 rounded-lg p-4 sm:p-6">
            <p className="text-foreground/60 text-xs sm:text-sm mb-2">Pending Review</p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground/50">{cases.filter(c => c.status === 'submitted').length}</p>
          </div>
        </div>

        {/* Cases Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Your Cases</h2>
            <Link href="/request">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                New Request
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="bg-card border border-border/30 rounded-lg p-12 text-center">
              <p className="text-foreground/60">Loading cases...</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="bg-card border border-border/30 rounded-lg p-12 text-center">
              <p className="text-foreground/60 mb-4">No cases yet. Ready to begin an investigation?</p>
              <Link href="/request">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Submit Intelligence Request
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {cases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className="bg-card border border-border/30 hover:border-primary/50 rounded-lg p-6 transition cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-bold text-lg">
                          {caseItem.case_number || 'Pending Assignment'}
                        </h3>
                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                          caseItem.status === 'active' ? 'bg-primary/20 text-primary' :
                          caseItem.status === 'completed' ? 'bg-secondary/20 text-secondary' :
                          'bg-foreground/10 text-foreground/60'
                        }`}>
                          {caseItem.status === 'active' ? 'Active' :
                           caseItem.status === 'completed' ? 'Completed' :
                           'Pending'}
                        </span>
                      </div>
                      <p className="text-foreground/60 text-sm mb-3">{caseItem.description}</p>
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <p className="text-foreground/50 text-xs">Service</p>
                          <p className="text-foreground font-medium capitalize">{caseItem.service_type}</p>
                        </div>
                        <div>
                          <p className="text-foreground/50 text-xs">Case Manager</p>
                          <p className="text-foreground font-medium">{caseItem.case_manager || 'Being Assigned'}</p>
                        </div>
                        <div>
                          <p className="text-foreground/50 text-xs">Created</p>
                          <p className="text-foreground font-medium">{new Date(caseItem.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-primary text-2xl group-hover:translate-x-1 transition">
                      →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messaging Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border/30 rounded-lg p-8">
            <h3 className="text-lg font-bold mb-4">Encrypted Messaging</h3>
            <p className="text-foreground/60 mb-6">
              Communicate securely with your case manager through our end-to-end encrypted messaging system.
            </p>
            <Button variant="outline" className="border-border/30">
              View Messages
            </Button>
          </div>

          <div className="bg-card border border-border/30 rounded-lg p-8">
            <h3 className="text-lg font-bold mb-4">Secure File Vault</h3>
            <p className="text-foreground/60 mb-6">
              Access case deliverables, evidence files, and forensic analysis reports in one encrypted location.
            </p>
            <Button variant="outline" className="border-border/30">
              Open Vault
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
