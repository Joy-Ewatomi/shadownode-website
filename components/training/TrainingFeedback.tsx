"use client"
import React, { useState } from "react"

export default function TrainingFeedback({ initialFeedback, engagementId, userRole, currentUserId }: any) {
  const [feedback, setFeedback] = useState(initialFeedback || [])
  const [rating, setRating] = useState(5)
  const [comments, setComments] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch(`/api/training/${engagementId}/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, comments }) })
    const p = await res.json()
    setSubmitting(false)
    if (p?.feedback) {
      setFeedback([p.feedback, ...feedback])
      setComments("")
    } else {
      alert(p.error || 'Failed to submit feedback')
    }
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-white">Feedback</h3>

      <div className="mt-4 space-y-4">
        {feedback.length === 0 && <p className="text-white/50">No feedback yet.</p>}

        {feedback.map((f: any) => (
          <div key={f.id} className="rounded-md border border-white/5 p-3 bg-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">Rating: {f.rating}</div>
                <div className="text-xs text-white/50">{f.comments}</div>
              </div>
              <div className="text-xs text-white/40">{f.created_at ? new Date(String(f.created_at)).toLocaleString() : ''}</div>
            </div>
          </div>
        ))}
      </div>

      {userRole === 'client' && (
        <form onSubmit={submitFeedback} className="mt-4 flex flex-col gap-2">
          <label className="text-sm text-white/60">Rating (1-5)</label>
          <input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="rounded-md px-3 py-1 text-black w-20" />
          <textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Comments" className="rounded-md px-3 py-1 text-black" />
          <button disabled={submitting} className="rounded-md bg-[#20dc73] px-3 py-1 text-black w-36">{submitting ? 'Submitting...' : 'Submit Feedback'}</button>
        </form>
      )}
    </div>
  )
}
