"use client"
import React, { useState } from "react"

export default function ProgressManager({ initialProgress, engagementId, userRole }: any) {
  const [progress, setProgress] = useState(initialProgress || [])
  const [completion, setCompletion] = useState(100)

  async function updateProgress(moduleId: string, clientProfileId: string) {
    const res = await fetch(`/api/training/${engagementId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, clientProfileId, completion_percentage: completion }),
    })

    const payload = await res.json()
    if (payload?.progress) {
      // optimistic update - refresh list
      setProgress((p: any) => [payload.progress, ...p.filter((x: any) => x.id !== payload.progress.id)])
    } else {
      alert(payload.error || "Failed to update progress")
    }
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-white">Module Progress</h3>

      <div className="space-y-3 mt-4">
        {progress.length === 0 && <p className="text-white/50">No progress records.</p>}

        {progress.map((p: any) => (
          <div key={p.id} className="rounded-md border border-white/5 p-3 bg-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">Module: {p.module_id}</div>
                <div className="text-xs text-white/50">Client: {p.client_profile_id}</div>
              </div>

              <div className="text-white/40">{p.completion_percentage}%</div>
            </div>

            {(userRole === "administrator" || userRole === "super_administrator" || userRole === "investigator" || userRole === "analyst") && (
              <div className="mt-3 flex gap-2">
                <input type="number" value={completion} onChange={(e) => setCompletion(Number(e.target.value))} className="rounded-md px-3 py-1 text-black" />
                <button className="rounded-md bg-[#20dc73] px-3 py-1 text-black" onClick={() => updateProgress(p.module_id, p.client_profile_id)}>Update</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
