"use client"
import React, { useState, useEffect, useRef } from "react"

export default function AssignTrainerForm({ engagementId, currentTrainer }: { engagementId: string; currentTrainer: string | null }) {
  const [trainerProfileId, setTrainerProfileId] = useState("")
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Array<{ id: string; full_name: string }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  const timerRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!query) {
      setSuggestions([])
      return
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }

    timerRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/training/trainer-search?q=${encodeURIComponent(query)}`)
        const payload = await res.json()
        setSuggestions(payload.trainers || [])
        setShowSuggestions(true)
        setHighlightedIndex(payload.trainers && payload.trainers.length ? 0 : -1)
      } catch (err) {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 250)

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [query])

  async function assign(e: React.FormEvent) {
    e.preventDefault()
    if (!trainerProfileId) {
      alert("Select a trainer from suggestions")
      return
    }

    setLoading(true)

    const res = await fetch(`/api/training/${engagementId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainerProfileId }),
    })

    const payload = await res.json()
    setLoading(false)

    if (payload?.success) {
      alert("Trainer assigned")
      window.location.reload()
    } else {
      alert(payload.error || "Failed to assign trainer")
    }
  }

  function chooseSuggestion(item: { id: string; full_name: string }) {
    setTrainerProfileId(item.id)
    setQuery(item.full_name)
    setShowSuggestions(false)
    setHighlightedIndex(-1)
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current) return
      if (!(e.target instanceof Node)) return
      if (!containerRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }

    window.addEventListener("mousedown", onClickOutside)
    return () => window.removeEventListener("mousedown", onClickOutside)
  }, [])

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestions || suggestions.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1))
      setShowSuggestions(true)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex((i) => Math.max(i - 1, 0))
      setShowSuggestions(true)
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault()
        chooseSuggestion(suggestions[highlightedIndex])
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
    }
  }

  return (
    <div ref={containerRef} className="mt-2 relative">
      <p className="text-xs text-white/50">Assigned: {currentTrainer || "Not assigned"}</p>

      <form onSubmit={assign} className="mt-2">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setTrainerProfileId("") }}
            placeholder="Search trainer by name"
            className="rounded-md px-3 py-1 text-black w-72"
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={onInputKeyDown}
          />
          <button disabled={loading} className="rounded-md bg-[#20dc73] px-3 py-1 text-black">Assign</button>
        </div>

        {trainerProfileId && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-black">
            <span className="text-sm font-medium">{query}</span>
            <button type="button" onClick={() => { setTrainerProfileId(""); setQuery(""); }} className="text-xs text-gray-600">Remove</button>
          </div>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-40 mt-2 max-h-48 w-72 overflow-auto rounded-md bg-white/95 p-1 text-black shadow-lg">
            {suggestions.map((s, idx) => (
              <li
                key={s.id}
                onMouseDown={(ev) => { ev.preventDefault(); chooseSuggestion(s) }}
                className={`cursor-pointer rounded px-2 py-1 ${idx === highlightedIndex ? 'bg-gray-200' : ''}`}
              >
                {s.full_name}
              </li>
            ))}
          </ul>
        )}
      </form>
    </div>
  )
}
