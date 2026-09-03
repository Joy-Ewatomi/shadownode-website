"use client"
import React, { useState } from "react"

export default function ModulesManager({ initialModules, engagementId, userRole }: any) {
  const [modules, setModules] = useState(initialModules || [])
  const [title, setTitle] = useState("")

  async function createModule(e: React.FormEvent) {
    e.preventDefault()

    const res = await fetch(`/api/training/${engagementId}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })

    const payload = await res.json()
    if (payload?.module) {
      setModules([payload.module, ...modules])
      setTitle("")
    } else {
      alert(payload.error || "Failed to create module")
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Training Modules</h3>
        {(userRole === "administrator" || userRole === "super_administrator" || userRole === "investigator" || userRole === "analyst") && (
          <form onSubmit={createModule} className="flex gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New module title" className="rounded-md px-3 py-1 text-black" />
            <button className="rounded-md bg-[#20dc73] px-3 py-1 text-black">Add</button>
          </form>
        )}
      </div>

      <div className="space-y-3">
        {modules.length === 0 && <p className="text-white/50">No modules yet.</p>}

        {modules.map((m: any) => (
          <div key={m.id} className="rounded-md border border-white/5 p-3 bg-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">{m.title}</div>
                <div className="text-xs text-white/50">{m.objectives || m.description}</div>
              </div>

              <div className="text-white/40">{m.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
