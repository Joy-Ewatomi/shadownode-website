"use client"
import React, { useState } from "react"

export default function MaterialsManager({ initialMaterials, engagementId, userRole }: any) {
  const [materials, setMaterials] = useState(initialMaterials || [])
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")

  async function createMaterial(e: React.FormEvent) {
    e.preventDefault()

    const res = await fetch(`/api/training/${engagementId}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, external_url: url }),
    })

    const payload = await res.json()
    if (payload?.material) {
      setMaterials([payload.material, ...materials])
      setTitle("")
      setUrl("")
    } else {
      alert(payload.error || "Failed to upload material")
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Materials</h3>
        {(userRole === "administrator" || userRole === "super_administrator" || userRole === "investigator" || userRole === "analyst") && (
          <form onSubmit={createMaterial} className="flex gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Material title" className="rounded-md px-3 py-1 text-black" />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="External URL" className="rounded-md px-3 py-1 text-black" />
            <button className="rounded-md bg-[#20dc73] px-3 py-1 text-black">Upload</button>
          </form>
        )}
      </div>

      <div className="space-y-3">
        {materials.length === 0 && <p className="text-white/50">No materials yet.</p>}

        {materials.map((m: any) => (
          <div key={m.id} className="rounded-md border border-white/5 p-3 bg-black/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">{m.title}</div>
                <div className="text-xs text-white/50">{m.material_type || m.external_url}</div>
              </div>

              <div className="text-white/40">{m.visibility}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
