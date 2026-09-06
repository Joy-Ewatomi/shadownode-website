"use client"
import React, { useState } from "react"

type TrainingCertificateProps = {
  certificate: any
  engagementId: string
  userRole: string
  canIssueCertificate: boolean
}

export default function TrainingCertificate({
  certificate,
  engagementId,
  userRole,
  canIssueCertificate,
}: TrainingCertificateProps){
  const [cert, setCert] = useState(certificate || null)
  const [loading, setLoading] = useState(false)

  async function issue() {
    if (!confirm('Issue certificate of completion?')) return
    setLoading(true)
    const res = await fetch(`/api/training/${engagementId}/certificate`, { method: 'POST' })
    const p = await res.json()
    setLoading(false)
    if (p?.certificate_id) {
      setCert({ id: p.certificate_id, certificate_number: p.certificate_number, issued_at: new Date().toISOString() })
      alert('Certificate issued')
    } else {
      alert(p.error || 'Failed to issue certificate')
    }
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-white">Certificate</h3>

      <div className="mt-4">
        {cert ? (
          <div className="rounded-md border border-white/5 p-3 bg-black/20">
            <div className="font-semibold text-white">Certificate of Completion</div>
            <div className="text-xs text-white/50">Number: {cert.certificate_number}</div>
            <div className="text-xs text-white/50">Issued: {cert.issued_at ? new Date(String(cert.issued_at)).toLocaleDateString() : ''}</div>
            {cert.verification_url && (
              <div className="mt-2"><a href={cert.verification_url} target="_blank" rel="noreferrer" className="underline">Verify Certificate</a></div>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-white/5 p-3 bg-black/20">
            <p className="text-white/50">No certificate has been issued yet.</p>
            {canIssueCertificate && (
              <div className="mt-3">
                <button onClick={issue} disabled={loading} className="rounded-md bg-[#20dc73] px-3 py-1 text-black">{loading ? 'Processing...' : 'Issue Certificate'}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
