'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useEffect, useState } from 'react'

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
  client_email?: string
  is_anonymous: boolean
}

const STATUS_COLORS = {
  submitted: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  active: { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
  completed: { color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/30' }
}

export default function AdminDashboard() {
  const [requests, setRequests] = useState<Request[]>([])
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'active' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [assignmentForm, setAssignmentForm] = useState({ caseNumber: '', caseManager: '', status: 'active' })

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const response = await fetch('/api/admin/requests')
        if (response.ok) {
          const data = await response.json()
          setRequests(data)
          filterRequests(data, statusFilter, searchQuery)
        }
      } catch (error) {
        console.error('Error loading requests:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRequests()
  }, [])

  const filterRequests = (items: Request[], status: string, search: string) => {
    let filtered = items

    if (status !== 'all') {
      filtered = filtered.filter(r => r.status === status)
    }

    if (search) {
      const query = search.toLowerCase()
      filtered = filtered.filter(r =>
        r.token.includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.client_email?.toLowerCase().includes(query) ||
        r.case_number?.includes(query)
      )
    }

    setFilteredRequests(filtered)
  }

  const handleStatusFilter = (status: any) => {
    setStatusFilter(status)
    filterRequests(requests, status, searchQuery)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    filterRequests(requests, statusFilter, query)
  }

  const handleAssignCase = async () => {
    if (!selectedRequest) return

    try {
      const response = await fetch(`/api/admin/requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_number: assignmentForm.caseNumber,
          case_manager: assignmentForm.caseManager,
          status: assignmentForm.status
        })
      })

      if (response.ok) {
        const updated = await response.json()
        const updatedRequests = requests.map(r => r.id === updated.id ? updated : r)
        setRequests(updatedRequests)
        filterRequests(updatedRequests, statusFilter, searchQuery)
        setSelectedRequest(updated)
        setAssignmentForm({ caseNumber: '', caseManager: '', status: 'active' })
      }
    } catch (error) {
      console.error('Error updating case:', error)
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border/30 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SIB</span>
            </div>
            <span className="text-xl font-bold text-primary">SHADOWNODE INTELLIGENCE BUREAU</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-foreground/60">Admin Portal</span>
            <button className="text-foreground/70 hover:text-primary transition text-sm">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Case Management</h1>
          <p className="text-foreground/60">Review, assign, and manage intelligence requests</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-card border border-border/30 rounded-lg p-6">
            <p className="text-foreground/60 text-sm mb-2">Total Requests</p>
            <p className="text-3xl font-bold text-primary">{requests.length}</p>
          </div>
          <div className="bg-card border border-border/30 rounded-lg p-6">
            <p className="text-foreground/60 text-sm mb-2">Pending Review</p>
            <p className="text-3xl font-bold text-yellow-400">{requests.filter(r => r.status === 'submitted').length}</p>
          </div>
          <div className="bg-card border border-border/30 rounded-lg p-6">
            <p className="text-foreground/60 text-sm mb-2">Active Cases</p>
            <p className="text-3xl font-bold text-primary">{requests.filter(r => r.status === 'active').length}</p>
          </div>
          <div className="bg-card border border-border/30 rounded-lg p-6">
            <p className="text-foreground/60 text-sm mb-2">Completed</p>
            <p className="text-3xl font-bold text-secondary">{requests.filter(r => r.status === 'completed').length}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Requests List */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border/30 rounded-lg p-6 mb-6">
              <div className="flex flex-col gap-4">
                <Input
                  placeholder="Search by token, email, case number..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="bg-background border border-border/50"
                />
                <div className="flex gap-2">
                  {(['all', 'submitted', 'active', 'completed'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusFilter(status)}
                      className={`px-4 py-2 rounded text-sm font-medium transition ${
                        statusFilter === status
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border border-border/30 text-foreground/60 hover:text-foreground'
                      }`}
                    >
                      {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="bg-card border border-border/30 rounded-lg p-12 text-center">
                <p className="text-foreground/60">Loading requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="bg-card border border-border/30 rounded-lg p-12 text-center">
                <p className="text-foreground/60">No requests found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map(request => (
                  <div
                    key={request.id}
                    onClick={() => {
                      setSelectedRequest(request)
                      setAssignmentForm({
                        caseNumber: request.case_number || '',
                        caseManager: request.case_manager || '',
                        status: request.status
                      })
                    }}
                    className={`bg-card border rounded-lg p-4 cursor-pointer transition hover:border-primary/50 ${
                      selectedRequest?.id === request.id ? 'border-primary/50 bg-primary/5' : 'border-border/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-mono text-sm text-foreground/60">{request.token.slice(0, 8)}...</p>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_COLORS[request.status].bg} ${STATUS_COLORS[request.status].color}`}>
                            {request.status}
                          </span>
                        </div>
                        <p className="text-foreground text-sm mb-2">{request.description.substring(0, 100)}...</p>
                        <div className="flex items-center gap-4 text-xs text-foreground/50">
                          <span>{request.service_type}</span>
                          <span>{request.is_anonymous ? 'Anonymous' : request.client_email}</span>
                          <span>{new Date(request.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Case Details & Assignment */}
          <div className="lg:col-span-1">
            {selectedRequest ? (
              <div className="bg-card border border-border/30 rounded-lg p-6 sticky top-24">
                <h2 className="text-lg font-bold mb-4">Case Details</h2>

                <div className="space-y-4 mb-6 pb-6 border-b border-border/20">
                  <div>
                    <p className="text-xs text-foreground/50 mb-1">Service Type</p>
                    <p className="font-medium capitalize text-foreground">{selectedRequest.service_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/50 mb-1">Budget</p>
                    <p className="font-medium text-foreground">{selectedRequest.budget}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/50 mb-1">Timeline</p>
                    <p className="font-medium text-foreground capitalize">{selectedRequest.timeline}</p>
                  </div>
                  {!selectedRequest.is_anonymous && (
                    <div>
                      <p className="text-xs text-foreground/50 mb-1">Client Email</p>
                      <p className="font-mono text-sm text-foreground">{selectedRequest.client_email}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-sm">Assignment</h3>

                  <div>
                    <label className="block text-xs font-medium mb-2 text-foreground/60">Case Number</label>
                    <Input
                      value={assignmentForm.caseNumber}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, caseNumber: e.target.value })}
                      placeholder="e.g., SN-2026-001"
                      className="bg-background border border-border/50 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-2 text-foreground/60">Case Manager</label>
                    <Input
                      value={assignmentForm.caseManager}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, caseManager: e.target.value })}
                      placeholder="Agent name"
                      className="bg-background border border-border/50 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-2 text-foreground/60">Status</label>
                    <select
                      value={assignmentForm.status}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, status: e.target.value as any })}
                      className="w-full bg-background border border-border/50 rounded px-3 py-2 text-sm text-foreground"
                    >
                      <option value="submitted">Pending Review</option>
                      <option value="active">Active Investigation</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <Button
                    onClick={handleAssignCase}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Update Case
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border/30 rounded-lg p-6 text-center sticky top-24">
                <p className="text-foreground/60 text-sm">Select a request to view details and assign a case manager</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
