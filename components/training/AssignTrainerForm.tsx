"use client"

import React, { useEffect, useRef, useState } from "react"

type TrainerSuggestion = {
  id: string
  full_name: string
  user_id: string | null
  role: string | null
}

type AssignTrainerFormProps = {
  engagementId: string
  currentTrainer: string | null
}

export default function AssignTrainerForm({
  engagementId,
  currentTrainer,
}: AssignTrainerFormProps) {
  const [isOpen, setIsOpen] = useState(false)

  const [trainerProfileId, setTrainerProfileId] = useState("")
  const [selectedTrainer, setSelectedTrainer] =
    useState<TrainerSuggestion | null>(null)

  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] =
    useState<TrainerSuggestion[]>([])

  const [showSuggestions, setShowSuggestions] =
    useState(false)

  const [highlightedIndex, setHighlightedIndex] =
    useState(-1)

  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const timerRef = useRef<number | null>(null)
  const searchContainerRef =
    useRef<HTMLDivElement | null>(null)

  function resetForm() {
    setTrainerProfileId("")
    setSelectedTrainer(null)
    setQuery("")
    setSuggestions([])
    setShowSuggestions(false)
    setHighlightedIndex(-1)
    setReason("")
    setError("")
    setSuccess("")
    setLoading(false)
  }

  function openModal() {
    resetForm()
    setIsOpen(true)
  }

  function closeModal() {
    if (loading) return

    setIsOpen(false)
    resetForm()
  }

  useEffect(() => {
    if (!isOpen) return

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal()
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    )

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      )
    }
  }, [isOpen, loading])

  useEffect(() => {
    if (!isOpen) return

    if (!query.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }

    timerRef.current = window.setTimeout(
      async () => {
        try {
          const res = await fetch(
            `/api/training/trainer-search?q=${encodeURIComponent(
              query.trim(),
            )}`,
          )

          if (!res.ok) {
            throw new Error(
              `Trainer search failed: ${res.status}`,
            )
          }

          const payload = await res.json()

          const trainers: TrainerSuggestion[] =
            Array.isArray(payload?.trainers)
              ? payload.trainers
              : []

          setSuggestions(trainers)
          setShowSuggestions(true)
          setHighlightedIndex(
            trainers.length > 0 ? 0 : -1,
          )
        } catch (searchError) {
          console.error(
            "TRAINER SEARCH ERROR:",
            searchError,
          )

          setSuggestions([])
          setShowSuggestions(false)
        }
      },
      250,
    )

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [query, isOpen])

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!searchContainerRef.current) return

      if (!(event.target instanceof Node)) return

      if (
        !searchContainerRef.current.contains(
          event.target,
        )
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener(
      "mousedown",
      onClickOutside,
    )

    return () => {
      document.removeEventListener(
        "mousedown",
        onClickOutside,
      )
    }
  }, [])

  function chooseSuggestion(
    trainer: TrainerSuggestion,
  ) {
    setTrainerProfileId(trainer.id)
    setSelectedTrainer(trainer)
    setQuery(trainer.full_name)
    setShowSuggestions(false)
    setHighlightedIndex(-1)
    setError("")
  }

  function removeTrainer() {
    setTrainerProfileId("")
    setSelectedTrainer(null)
    setQuery("")
    setSuggestions([])
    setShowSuggestions(false)
    setHighlightedIndex(-1)
  }

  function onInputKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (
      suggestions.length === 0 ||
      !showSuggestions
    ) {
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()

      setHighlightedIndex((index) =>
        Math.min(
          index + 1,
          suggestions.length - 1,
        ),
      )
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()

      setHighlightedIndex((index) =>
        Math.max(index - 1, 0),
      )
    }

    if (event.key === "Enter") {
      if (
        highlightedIndex >= 0 &&
        highlightedIndex < suggestions.length
      ) {
        event.preventDefault()

        chooseSuggestion(
          suggestions[highlightedIndex],
        )
      }
    }

    if (event.key === "Escape") {
      event.preventDefault()
      setShowSuggestions(false)
    }
  }

  function formatRole(
    role: string | null,
  ): string {
    if (!role) {
      return "Unknown Role"
    }

    return role
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase(),
      )
  }

  async function assignTrainer(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError("")
    setSuccess("")

    if (!trainerProfileId || !selectedTrainer) {
      setError(
        "Please select a trainer before submitting.",
      )
      return
    }

    const trimmedReason = reason.trim()

    if (!trimmedReason) {
      setError(
        "Please provide a reason for proposing this trainer.",
      )
      return
    }

    if (trimmedReason.length < 20) {
      setError(
        "Please provide a more detailed reason. Explain the trainer's relevant background, education, experience, or specialization.",
      )
      return
    }

    if (trimmedReason.length > 2000) {
      setError(
        "The assignment reason must be 2000 characters or less.",
      )
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        `/api/training/${engagementId}/assign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trainerProfileId,
            reason: trimmedReason,
          }),
        },
      )

      const payload = await response.json()

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error ||
            "Failed to submit trainer assignment.",
        )
      }

      if (payload.pending_approval) {
        setSuccess(
          "Trainer proposal submitted successfully. It is now pending Super Administrator approval.",
        )
      } else {
        setSuccess(
          "Trainer assigned successfully.",
        )
      }

      setTimeout(() => {
        window.location.reload()
      }, 1400)
    } catch (assignmentError) {
      console.error(
        "TRAINER ASSIGNMENT ERROR:",
        assignmentError,
      )

      setError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "An error occurred while submitting the trainer assignment.",
      )

      setLoading(false)
    }
  }

  return (
    <>
      <div className="mt-2">
        <p className="text-xs text-white/50">
          Assigned:{" "}
          {currentTrainer || "Not assigned"}
        </p>

        <button
          type="button"
          onClick={openModal}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#20dc73]/40 bg-[#06150d] px-4 py-2 text-sm font-medium text-[#20dc73] transition hover:border-[#20dc73] hover:bg-[#0b2a18]"
        >
          <span className="text-base">
            +
          </span>

          {currentTrainer
            ? "Assign Trainer"
            : "Select Trainer"}
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeModal()
            }
          }}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#143b28] bg-[#020806] shadow-2xl shadow-black/60"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-trainer-title"
          >
            <div className="sticky top-0 z-20 flex items-start justify-between border-b border-[#143b28] bg-[#020806] px-6 py-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#20dc73]">
                  Training Operations
                </p>

                <h2
                  id="assign-trainer-title"
                  className="mt-1 text-xl font-semibold text-white"
                >
                  Assign Trainer
                </h2>

                <p className="mt-1 max-w-lg text-sm text-white/50">
                  Select a suitable trainer and provide
                  the reason for the proposed assignment.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                aria-label="Close"
                className="rounded-lg p-2 text-xl leading-none text-white/40 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={assignTrainer}
              className="space-y-6 px-6 py-6"
            >
              <div
                ref={searchContainerRef}
                className="relative"
              >
                <label
                  htmlFor="trainer-search"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Select Trainer
                  <span className="ml-1 text-[#20dc73]">
                    *
                  </span>
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                    🔍
                  </span>

                  <input
                    id="trainer-search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value)
                      setTrainerProfileId("")
                      setSelectedTrainer(null)
                      setError("")
                    }}
                    onFocus={() => {
                      if (
                        suggestions.length > 0
                      ) {
                        setShowSuggestions(true)
                      }
                    }}
                    onKeyDown={onInputKeyDown}
                    placeholder="Search trainer by name..."
                    autoComplete="off"
                    className="w-full rounded-xl border border-[#143b28] bg-[#06150d] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#20dc73]/60 focus:ring-1 focus:ring-[#20dc73]/20"
                  />
                </div>

                {showSuggestions &&
                  suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border border-[#143b28] bg-[#020806] p-1 shadow-2xl">
                      {suggestions.map(
                        (trainer, index) => (
                          <button
                            key={trainer.id}
                            type="button"
                            onMouseDown={(
                              event,
                            ) => {
                              event.preventDefault()
                              chooseSuggestion(
                                trainer,
                              )
                            }}
                            className={`flex w-full items-center justify-between gap-4 rounded-lg px-4 py-3 text-left transition ${
                              index ===
                              highlightedIndex
                                ? "bg-[#0b2a18]"
                                : "hover:bg-[#06150d]"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">
                                {
                                  trainer.full_name
                                }
                              </p>

                              <p className="mt-0.5 text-xs text-white/40">
                                Trainer profile
                              </p>
                            </div>

                            <span className="shrink-0 rounded-full border border-[#20dc73]/20 bg-[#20dc73]/5 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#20dc73]">
                              {formatRole(
                                trainer.role,
                              )}
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                  )}

                {showSuggestions &&
                  query.trim() &&
                  suggestions.length === 0 && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-[#143b28] bg-[#020806] px-4 py-4 text-sm text-white/40 shadow-2xl">
                      No active trainer-capable users found.
                    </div>
                  )}
              </div>

              {selectedTrainer && (
                <div className="rounded-xl border border-[#20dc73]/20 bg-[#06150d] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#20dc73]/70">
                        Selected Trainer
                      </p>

                      <p className="mt-1 text-base font-semibold text-white">
                        {
                          selectedTrainer.full_name
                        }
                      </p>

                      <p className="mt-1 text-xs text-[#20dc73]">
                        {formatRole(
                          selectedTrainer.role,
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={removeTrainer}
                      disabled={loading}
                      className="text-xs text-white/40 transition hover:text-white disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-end justify-between gap-4">
                  <label
                    htmlFor="assignment-reason"
                    className="text-sm font-medium text-white"
                  >
                    Reason for Assignment
                    <span className="ml-1 text-[#20dc73]">
                      *
                    </span>
                  </label>

                  <span className="text-[10px] text-white/30">
                    {reason.length}/2000
                  </span>
                </div>

                <textarea
                  id="assignment-reason"
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  placeholder="Explain why this person is suitable for this training engagement. Consider their background, education, cybersecurity experience, specialization, certifications, or relevant skills."
                  rows={6}
                  maxLength={2000}
                  disabled={loading}
                  className="w-full resize-none rounded-xl border border-[#143b28] bg-[#06150d] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-[#20dc73]/60 focus:ring-1 focus:ring-[#20dc73]/20 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <div className="mt-2 grid gap-2 text-[11px] text-white/35 sm:grid-cols-2">
                  <span>
                    • Relevant professional background
                  </span>

                  <span>
                    • Education and qualifications
                  </span>

                  <span>
                    • Cybersecurity experience
                  </span>

                  <span>
                    • Specialization or technical skills
                  </span>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-[#20dc73]/20 bg-[#20dc73]/5 px-4 py-3 text-sm text-[#20dc73]">
                  {success}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-[#143b28] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="rounded-xl border border-[#143b28] px-5 py-2.5 text-sm font-medium text-white/60 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !selectedTrainer ||
                    !reason.trim()
                  }
                  className="rounded-xl bg-[#20dc73] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#32e982] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading
                    ? "Submitting..."
                    : "Submit for Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}