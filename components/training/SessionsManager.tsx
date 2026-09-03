"use client"
import React, { useState } from "react"

export default function SessionsManager({ initialSessions, engagementId, userRole, currentUserId, currentProfileId }: any) {
  const [sessions, setSessions] = useState(initialSessions || [])
  const [title, setTitle] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")

  async function createSession(e: React.FormEvent) {
    e.preventDefault()

    const res = await fetch(`/api/training/${engagementId}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_notes: title, scheduled_at: scheduledAt }),
    })

    const payload = await res.json()
    if (payload?.session) {
      setSessions([payload.session, ...sessions])
      setTitle("")
      setScheduledAt("")
    } else {
      alert(payload.error || "Failed to create session")
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Sessions</h3>
        {(userRole === "administrator" || userRole === "super_administrator" || userRole === "investigator" || userRole === "analyst") && (
          <form onSubmit={createSession} className="flex gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Session title/notes" className="rounded-md px-3 py-1 text-black" />
            <input value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} placeholder="YYYY-MM-DDTHH:MM" className="rounded-md px-3 py-1 text-black" />
            <button className="rounded-md bg-[#20dc73] px-3 py-1 text-black">Schedule</button>
          </form>
        )}
      </div>

      <div className="space-y-3">
        {sessions.length === 0 && <p className="text-white/50">No sessions scheduled.</p>}

        {sessions.map((s: any) => (
          <div key={s.id} className="rounded-md border border-white/5 p-3 bg-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">{s.session_notes || s.session_type || "Session"}</div>
                <div className="text-xs text-white/50">{s.scheduled_at ? new Date(s.scheduled_at).toLocaleString() : "TBD"}</div>
                {s.meeting_url && (
                  <div className="text-xs text-white/60 mt-1">Meeting: <a className="underline" href={s.meeting_url} target="_blank" rel="noreferrer">{s.meeting_url}</a></div>
                )}
                {s.location && (
                  <div className="text-xs text-white/60 mt-1">Location: {s.location}</div>
                )}
              </div>

              <div className="text-white/40">{s.status}</div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <a href={`/api/training/session/${s.id}/ics`} className="rounded-md bg-primary px-3 py-1 text-primary-foreground text-sm">Add to calendar</a>

              {/* RSVP buttons for attendees (clients/trainers) */}
              {currentUserId && (
                (() => {
                  const attendee = (s.attendees || []).find((a: any) => a.user_id === currentUserId || a.profile_id === currentProfileId)
                  const part = attendee?.partstat || null

                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/60">RSVP:</span>
                      <button onClick={async () => {
                        const res = await fetch(`/api/training/session/${s.id}/rsvp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partstat: 'ACCEPTED' }) })
                        const p = await res.json()
                        if (p?.success) {
                          setSessions(sessions.map((x: any) => x.id === s.id ? { ...x, attendees: (x.attendees || []).map((a: any) => (a.user_id === currentUserId || a.profile_id === currentProfileId) ? { ...a, partstat: 'ACCEPTED', responded_at: new Date().toISOString() } : a) } : x))
                        } else {
                          alert(p.error || 'Failed to RSVP')
                        }
                      }} className={`rounded-md px-2 py-1 text-sm ${part==='ACCEPTED' ? 'bg-green-600 text-black' : 'bg-white/5 text-white'}`}>Accept</button>

                      <button onClick={async () => {
                        const res = await fetch(`/api/training/session/${s.id}/rsvp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partstat: 'TENTATIVE' }) })
                        const p = await res.json()
                        if (p?.success) {
                          setSessions(sessions.map((x: any) => x.id === s.id ? { ...x, attendees: (x.attendees || []).map((a: any) => (a.user_id === currentUserId || a.profile_id === currentProfileId) ? { ...a, partstat: 'TENTATIVE', responded_at: new Date().toISOString() } : a) } : x))
                        } else {
                          alert(p.error || 'Failed to RSVP')
                        }
                      }} className={`rounded-md px-2 py-1 text-sm ${part==='TENTATIVE' ? 'bg-yellow-600 text-black' : 'bg-white/5 text-white'}`}>Tentative</button>

                      <button onClick={async () => {
                        const res = await fetch(`/api/training/session/${s.id}/rsvp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partstat: 'DECLINED' }) })
                        const p = await res.json()
                        if (p?.success) {
                          setSessions(sessions.map((x: any) => x.id === s.id ? { ...x, attendees: (x.attendees || []).map((a: any) => (a.user_id === currentUserId || a.profile_id === currentProfileId) ? { ...a, partstat: 'DECLINED', responded_at: new Date().toISOString() } : a) } : x))
                        } else {
                          alert(p.error || 'Failed to RSVP')
                        }
                      }} className={`rounded-md px-2 py-1 text-sm ${part==='DECLINED' ? 'bg-red-600 text-white' : 'bg-white/5 text-white'}`}>Decline</button>
                    </div>
                  )
                })()
              )}

              {(userRole === "administrator" || userRole === "super_administrator" || userRole === "investigator" || userRole === "analyst") && (
                <>
                  <button onClick={async () => {
                    const newDate = window.prompt('New date/time (YYYY-MM-DDTHH:MM) or leave blank to keep', s.scheduled_at || '')
                    if (newDate === null) return
                    const meeting = window.prompt('Meeting URL (leave blank to keep)', s.meeting_url || '')
                    const location = window.prompt('Location (leave blank to keep)', s.location || '')

                    const updates: any = {}
                    if (newDate) updates.scheduled_at = newDate
                    if (meeting !== null) updates.meeting_url = meeting || null
                    if (location !== null) updates.location = location || null

                    const res = await fetch(`/api/training/${engagementId}/schedule`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ sessionId: s.id, updates }),
                    })
                    const payload = await res.json()
                    if (payload?.session) {
                      setSessions(sessions.map((x: any) => x.id === s.id ? payload.session : x))
                    } else {
                      alert(payload.error || 'Failed to update session')
                    }
                  }} className="rounded-md bg-yellow-600 px-3 py-1 text-black text-sm">Edit</button>

                  <button onClick={async () => {
                    if (!confirm('Cancel this session?')) return
                    const res = await fetch(`/api/training/${engagementId}/schedule`, {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ sessionId: s.id }),
                    })
                    const payload = await res.json()
                    if (payload?.success) {
                      setSessions(sessions.filter((x: any) => x.id !== s.id))
                    } else {
                      alert(payload.error || 'Failed to cancel')
                    }
                  }} className="rounded-md bg-red-600 px-3 py-1 text-white text-sm">Cancel</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
