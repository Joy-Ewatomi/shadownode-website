"use client"
import React, { useState } from "react"

export default function CompleteTrainingButton({ engagementId }: { engagementId: string }) {
  const [loading, setLoading] = useState(false)

  async function markComplete() {
    if (!confirm("Mark this training as complete?")) return

    setLoading(true)

    const res = await fetch(`/api/training/${engagementId}/complete`, {
      method: "POST",
    })

    const payload = await res.json()
    setLoading(false)

    if (payload?.success) {
      alert("Training marked completed")
      window.location.reload()
    } else {
      alert(payload.error || "Failed to complete training")
    }
  }

  return (
    <button onClick={markComplete} disabled={loading} className="rounded-md bg-[#20dc73] px-3 py-1 text-black">
      {loading ? "Processing..." : "Mark Training Complete"}
    </button>
  )
}
