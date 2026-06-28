'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface ForensicFile {
  id: string
  case_id: string
  filename: string
  file_type: string
  file_size: number
  uploaded_at: string
  category: 'evidence' | 'analysis' | 'report' | 'documentation'
  status: 'processing' | 'ready' | 'archived'
  description?: string
}

interface Case {
  id: string
  case_number: string
  service_type: string
  status: string
}

export default function VaultPage() {
  const [cases, setCases] = useState<Case[]>([])
  const [selectedCase, setSelectedCase] = useState<Case | null>(null)
  const [files, setFiles] = useState<ForensicFile[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/vault/cases')
        if (response.ok) {
          const data = await response.json()
          setCases(data)
          if (data.length > 0) {
            setSelectedCase(data[0])
            loadFiles(data[0].id)
          }
        }
      } catch (error) {
        console.error('Error loading cases:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const loadFiles = async (caseId: string) => {
    try {
      const response = await fetch(`/api/vault/cases/${caseId}/files`)
      if (response.ok) {
        const data = await response.json()
        setFiles(data)
      }
    } catch (error) {
      console.error('Error loading files:', error)
    }
  }

  const handleCaseSelect = (caseItem: Case) => {
    setSelectedCase(caseItem)
    loadFiles(caseItem.id)
  }

  const filteredFiles = files.filter(file => {
    const matchesCategory = filterCategory === 'all' || file.category === filterCategory
    const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️'
    if (fileType.startsWith('video/')) return '🎬'
    if (fileType === 'application/pdf') return '📄'
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦'
    if (fileType.includes('text')) return '📝'
    return '📎'
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'evidence':
        return 'bg-accent/10 text-accent'
      case 'analysis':
        return 'bg-primary/10 text-primary'
      case 'report':
        return 'bg-secondary/10 text-secondary'
      case 'documentation':
        return 'bg-foreground/10 text-foreground'
      default:
        return 'bg-foreground/10 text-foreground'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-primary/10 text-primary'
      case 'processing':
        return 'bg-yellow-400/10 text-yellow-400'
      case 'archived':
        return 'bg-foreground/10 text-foreground/60'
      default:
        return 'bg-foreground/10 text-foreground'
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border/30 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SN</span>
            </div>
            <span className="text-xl font-bold text-primary">SHADOWNODE</span>
          </Link>
          <Link href="/dashboard" className="text-foreground/70 hover:text-primary transition text-sm">
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Secure Vault</h1>
          <p className="text-foreground/60">Access case deliverables, forensic analysis, and evidence files</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Case List Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border/30 rounded-lg p-4 sticky top-24">
              <h2 className="font-bold mb-4">Your Cases</h2>
              {loading ? (
                <p className="text-foreground/60 text-sm">Loading...</p>
              ) : cases.length === 0 ? (
                <p className="text-foreground/60 text-sm">No cases with files</p>
              ) : (
                <div className="space-y-2">
                  {cases.map(caseItem => (
                    <button
                      key={caseItem.id}
                      onClick={() => handleCaseSelect(caseItem)}
                      className={`w-full text-left p-3 rounded transition ${
                        selectedCase?.id === caseItem.id
                          ? 'bg-primary/20 border border-primary/50'
                          : 'hover:bg-foreground/5'
                      }`}
                    >
                      <p className="font-medium text-sm">{caseItem.case_number || 'Unnamed'}</p>
                      <p className="text-xs text-foreground/60 mt-1">{caseItem.service_type}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Files Area */}
          <div className="lg:col-span-3">
            {selectedCase ? (
              <>
                <div className="bg-card border border-border/30 rounded-lg p-6 mb-6">
                  <h2 className="text-2xl font-bold mb-4">{selectedCase.case_number}</h2>

                  {/* Filters */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Search Files</label>
                      <Input
                        placeholder="Search by filename..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-background border border-border/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Filter by Category</label>
                      <div className="flex gap-2 flex-wrap">
                        {['all', 'evidence', 'analysis', 'report', 'documentation'].map(cat => (
                          <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-3 py-1 rounded text-sm transition ${
                              filterCategory === cat
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-foreground/10 text-foreground/60 hover:text-foreground'
                            }`}
                          >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Files Grid */}
                {filteredFiles.length === 0 ? (
                  <div className="bg-card border border-border/30 rounded-lg p-12 text-center">
                    <p className="text-foreground/60">
                      {files.length === 0 ? 'No files in this case yet' : 'No files match your filters'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredFiles.map(file => (
                      <div
                        key={file.id}
                        className="bg-card border border-border/30 hover:border-primary/50 rounded-lg p-4 transition group cursor-pointer"
                      >
                        <div className="flex items-start gap-4">
                          <div className="text-3xl">{getFileIcon(file.file_type)}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-medium text-foreground group-hover:text-primary transition">
                                {file.filename}
                              </h3>
                              <span className={`text-xs font-medium px-2 py-1 rounded ${getCategoryColor(file.category)}`}>
                                {file.category}
                              </span>
                              <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(file.status)}`}>
                                {file.status}
                              </span>
                            </div>
                            {file.description && (
                              <p className="text-sm text-foreground/60 mb-2">{file.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-foreground/40">
                              <span>{formatFileSize(file.file_size)}</span>
                              <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <Button
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={file.status !== 'ready'}
                          >
                            {file.status === 'processing' ? 'Processing...' : 'Download'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-card border border-border/30 rounded-lg p-12 text-center">
                <p className="text-foreground/60">Select a case to view files</p>
              </div>
            )}
          </div>
        </div>

        {/* Information Section */}
        <div className="mt-12 bg-card border border-border/30 rounded-lg p-6">
          <h3 className="font-bold mb-4">Secure Vault Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-primary font-medium mb-2">File Categories</p>
              <ul className="space-y-1 text-sm text-foreground/60">
                <li>• <span className="text-accent">Evidence</span> - Raw forensic evidence and artifacts</li>
                <li>• <span className="text-primary">Analysis</span> - Detailed forensic analysis reports</li>
                <li>• <span className="text-secondary">Report</span> - Executive summaries and findings</li>
                <li>• Documentation - Case documentation and metadata</li>
              </ul>
            </div>
            <div>
              <p className="text-sm text-primary font-medium mb-2">Security & Privacy</p>
              <ul className="space-y-1 text-sm text-foreground/60">
                <li>🔐 All files encrypted at rest using AES-256</li>
                <li>🔒 SSL/TLS encryption in transit</li>
                <li>🕐 Auto-deletion 30 days after case closure</li>
                <li>📊 Audit logging on all access</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
