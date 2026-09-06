"use client"

import React, { useMemo, useState } from "react"

type TrainingModule = {
  id: string
  title: string | null
  description?: string | null
  objectives?: string | null
  status?: string | null
  completion_percentage?: number | null
  module_order?: number | null
  created_at?: string | null
  updated_at?: string | null
}

type ModulesManagerProps = {
  initialModules?: TrainingModule[]
  engagementId: string
  canManageModules?: boolean
}

function formatStatus(status: string | null | undefined) {
  return String(status || "not_started")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getStatusClass(status: string | null | undefined) {
  const normalized = String(
    status || "not_started",
  ).toLowerCase()

  if (normalized === "completed") {
    return "border-[#20dc73]/20 bg-[#20dc73]/5 text-[#20dc73]"
  }

  if (normalized === "in_progress") {
    return "border-yellow-400/20 bg-yellow-400/5 text-yellow-300"
  }

  return "border-white/10 bg-white/[0.03] text-white/40"
}

export default function ModulesManager({
  initialModules = [],
  engagementId,
  canManageModules = false,
}: ModulesManagerProps) {
  const [modules, setModules] =
    useState<TrainingModule[]>(initialModules)

  const [title, setTitle] = useState("")
  const [description, setDescription] =
    useState("")
  const [objectives, setObjectives] =
    useState("")

  const [showCreateForm, setShowCreateForm] =
    useState(false)

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState("")

  const [success, setSuccess] =
    useState("")

  const roadmapStats = useMemo(() => {
    const total = modules.length

    const completed = modules.filter(
      (module) =>
        module.status === "completed" ||
        Number(
          module.completion_percentage ?? 0,
        ) >= 100,
    ).length

    const inProgress = modules.filter(
      (module) =>
        module.status === "in_progress" ||
        (Number(
          module.completion_percentage ?? 0,
        ) > 0 &&
          Number(
            module.completion_percentage ?? 0,
          ) < 100),
    ).length

    const overall =
      total > 0
        ? Math.round(
            modules.reduce(
              (sum, module) =>
                sum +
                Math.min(
                  100,
                  Math.max(
                    0,
                    Number(
                      module.completion_percentage ??
                        0,
                    ),
                  ),
                ),
              0,
            ) / total,
          )
        : 0

    return {
      total,
      completed,
      inProgress,
      overall,
    }
  }, [modules])

  async function createModule(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault()

    setError("")
    setSuccess("")

    const trimmedTitle = title.trim()
    const trimmedDescription =
      description.trim()
    const trimmedObjectives =
      objectives.trim()

    if (!trimmedTitle) {
      setError("Please enter a module title.")
      return
    }

    if (trimmedTitle.length < 3) {
      setError(
        "Module title must be at least 3 characters.",
      )
      return
    }

    if (trimmedTitle.length > 200) {
      setError(
        "Module title must be 200 characters or less.",
      )
      return
    }

    setLoading(true)

    try {
      const nextModuleOrder =
        modules.length > 0
          ? Math.max(
              ...modules.map((module, index) =>
                Number.isFinite(
                  Number(module.module_order),
                )
                  ? Number(module.module_order)
                  : index + 1,
              ),
            ) + 1
          : 1

      const res = await fetch(
        `/api/training/${engagementId}/plan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: trimmedTitle,

            description:
              trimmedDescription ||
              undefined,

            objectives:
              trimmedObjectives ||
              undefined,

            module_order:
              nextModuleOrder,
          }),
        },
      )

      const payload = await res.json()

      if (!res.ok) {
        throw new Error(
          payload?.error ||
            "Failed to create training module.",
        )
      }

      if (!payload?.module) {
        throw new Error(
          "The server did not return the created module.",
        )
      }

      setModules((current) => [
        ...current,
        payload.module,
      ])

      setTitle("")
      setDescription("")
      setObjectives("")
      setShowCreateForm(false)

      setSuccess(
        "Curriculum module created successfully.",
      )
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create training module.",
      )
    } finally {
      setLoading(false)
    }
  }

  const sortedModules = [...modules].sort(
    (a, b) => {
      const orderA =
        Number(a.module_order ?? 999999)

      const orderB =
        Number(b.module_order ?? 999999)

      return orderA - orderB
    },
  )

  return (
    <div className="space-y-6">
      {/* =====================================================
          ROADMAP HEADER
      ===================================================== */}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#20dc73]/60">
            Curriculum
          </p>

          <h3 className="mt-2 text-xl font-semibold text-white">
            Curriculum Roadmap
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
            The structured learning path for this
            training engagement. Modules define what
            the client will learn and provide the
            foundation for tracking training progress.
          </p>
        </div>

        {canManageModules && (
          <button
            type="button"
            onClick={() => {
              setError("")
              setSuccess("")
              setShowCreateForm(
                (current) => !current,
              )
            }}
            className="shrink-0 rounded-md border border-[#20dc73]/30 bg-[#20dc73]/5 px-4 py-2.5 text-sm font-medium text-[#20dc73] transition hover:bg-[#20dc73]/10"
          >
            {showCreateForm
              ? "Close"
              : "+ Add Module"}
          </button>
        )}
      </div>

      {/* =====================================================
          ROADMAP STATS
      ===================================================== */}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RoadmapStat
          label="Modules"
          value={String(
            roadmapStats.total,
          )}
        />

        <RoadmapStat
          label="Completed"
          value={String(
            roadmapStats.completed,
          )}
        />

        <RoadmapStat
          label="In Progress"
          value={String(
            roadmapStats.inProgress,
          )}
        />

        <RoadmapStat
          label="Overall Progress"
          value={`${roadmapStats.overall}%`}
        />
      </div>

      {/* =====================================================
          OVERALL PROGRESS
      ===================================================== */}

      <div className="rounded-xl border border-[#143b28] bg-[#020806]/70 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/30">
              Roadmap Progress
            </p>

            <p className="mt-1 text-sm text-white/55">
              Progress is calculated from the
              modules in this curriculum.
            </p>
          </div>

          <span className="font-mono text-sm font-semibold text-[#20dc73]">
            {roadmapStats.overall}%
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-[#20dc73] transition-all"
            style={{
              width: `${roadmapStats.overall}%`,
            }}
          />
        </div>
      </div>

      {/* =====================================================
          CREATE MODULE
      ===================================================== */}

      {canManageModules &&
        showCreateForm && (
          <form
            onSubmit={createModule}
            className="rounded-xl border border-[#20dc73]/20 bg-[#04100b]/80 p-5"
          >
            <div className="mb-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#20dc73]/60">
                Curriculum Builder
              </p>

              <h4 className="mt-1 text-base font-semibold text-white">
                Add Curriculum Module
              </h4>

              <p className="mt-1 text-sm text-white/40">
                Define the next stage of the
                client's learning path.
              </p>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-white/35">
                  Module Title
                </label>

                <input
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  placeholder="e.g. Cybersecurity Fundamentals"
                  maxLength={200}
                  disabled={loading}
                  autoFocus
                  className="w-full rounded-md border border-[#143b28] bg-[#020806] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/50 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-white/35">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value,
                    )
                  }
                  placeholder="Describe what this module covers."
                  rows={3}
                  disabled={loading}
                  className="w-full resize-none rounded-md border border-[#143b28] bg-[#020806] px-3 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/50 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-white/35">
                  Learning Objectives
                </label>

                <textarea
                  value={objectives}
                  onChange={(e) =>
                    setObjectives(
                      e.target.value,
                    )
                  }
                  placeholder="What should the client understand or be able to do after completing this module?"
                  rows={4}
                  disabled={loading}
                  className="w-full resize-none rounded-md border border-[#143b28] bg-[#020806] px-3 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/50 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setError("")
                }}
                disabled={loading}
                className="rounded-md border border-white/10 px-4 py-2.5 text-sm text-white/50 transition hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  loading ||
                  !title.trim()
                }
                className="rounded-md bg-[#20dc73] px-5 py-2.5 text-sm font-medium text-black transition hover:bg-[#39e582] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Creating..."
                  : "Create Module"}
              </button>
            </div>
          </form>
        )}

      {/* =====================================================
          NOTICES
      ===================================================== */}

      {!canManageModules && (
        <div className="rounded-lg border border-[#143b28] bg-[#020806]/70 px-4 py-3">
          <p className="text-sm text-white/50">
            You have view access to this curriculum.
            Module management is available only to the
            approved trainer for this engagement or a
            Super Administrator.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-300">
            {error}
          </p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-[#20dc73]/20 bg-[#20dc73]/5 px-4 py-3">
          <p className="text-sm text-[#20dc73]">
            {success}
          </p>
        </div>
      )}

      {/* =====================================================
          ROADMAP
      ===================================================== */}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/25">
              Learning Path
            </p>

            <h4 className="mt-1 text-sm font-semibold text-white">
              Curriculum Modules
            </h4>
          </div>

          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/25">
            {modules.length}{" "}
            {modules.length === 1
              ? "Module"
              : "Modules"}
          </span>
        </div>

        {sortedModules.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#143b28] bg-[#020806]/70 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#143b28] bg-[#06150d]">
              <span className="font-mono text-[#20dc73]/60">
                01
              </span>
            </div>

            <p className="mt-4 text-sm font-medium text-white/60">
              Curriculum roadmap is empty.
            </p>

            <p className="mt-1 text-xs leading-5 text-white/30">
              {canManageModules
                ? "Create the first module to begin building the learning path."
                : "The training team has not created the curriculum yet."}
            </p>

            {canManageModules && (
              <button
                type="button"
                onClick={() =>
                  setShowCreateForm(true)
                }
                className="mt-5 rounded-md border border-[#20dc73]/20 bg-[#20dc73]/5 px-4 py-2 text-xs font-medium text-[#20dc73] transition hover:bg-[#20dc73]/10"
              >
                + Create First Module
              </button>
            )}
          </div>
        )}

        {sortedModules.length > 0 && (
          <div className="relative space-y-4">
            <div className="absolute bottom-6 left-[22px] top-6 hidden w-px bg-[#143b28] sm:block" />

            {sortedModules.map(
              (module, index) => {
                const moduleNumber =
                  module.module_order ??
                  index + 1

                const completion = Math.min(
                  100,
                  Math.max(
                    0,
                    Number(
                      module.completion_percentage ??
                        0,
                    ),
                  ),
                )

                const status =
                  module.status ||
                  "not_started"

                return (
                  <div
                    key={module.id}
                    className="group relative rounded-xl border border-[#143b28] bg-[#020806]/90 p-5 transition hover:border-[#20dc73]/30 hover:bg-[#06150d]/95"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row">
                      {/* Module marker */}

                      <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#143b28] bg-[#06150d]">
                        <span className="font-mono text-xs font-semibold text-[#20dc73]/70">
                          {String(
                            moduleNumber,
                          ).padStart(2, "0")}
                        </span>
                      </div>

                      {/* Module content */}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#20dc73]/50">
                                Module{" "}
                                {String(
                                  moduleNumber,
                                ).padStart(
                                  2,
                                  "0",
                                )}
                              </span>

                              <span
                                className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${getStatusClass(
                                  status,
                                )}`}
                              >
                                {formatStatus(
                                  status,
                                )}
                              </span>
                            </div>

                            <h5 className="mt-2 text-base font-semibold text-white">
                              {module.title ||
                                "Untitled Module"}
                            </h5>
                          </div>

                          <span className="shrink-0 font-mono text-sm font-semibold text-[#20dc73]">
                            {completion}%
                          </span>
                        </div>

                        {(module.description ||
                          module.objectives) && (
                          <div className="mt-4 space-y-3">
                            {module.description && (
                              <p className="text-sm leading-6 text-white/45">
                                {
                                  module.description
                                }
                              </p>
                            )}

                            {module.objectives && (
                              <div>
                                <p className="mb-1.5 text-[9px] uppercase tracking-[0.14em] text-white/25">
                                  Learning Objectives
                                </p>

                                <p className="whitespace-pre-wrap text-sm leading-6 text-white/40">
                                  {
                                    module.objectives
                                  }
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Progress */}

                        <div className="mt-5">
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#0b1d13]">
                            <div
                              className="h-full rounded-full bg-[#20dc73] transition-all"
                              style={{
                                width: `${completion}%`,
                              }}
                            />
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-[0.12em] text-white/20">
                              Completion
                            </span>

                            <span className="text-[10px] text-white/30">
                              {completion ===
                              100
                                ? "Module complete"
                                : completion >
                                  0
                                ? "In progress"
                                : "Not started"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 h-px bg-[#143b28]/80" />
                      </div>
                    </div>
                  </div>
                )
              },
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function RoadmapStat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-[#143b28] bg-[#020806]/70 p-4">
      <p className="text-[9px] uppercase tracking-[0.15em] text-white/25">
        {label}
      </p>

      <p className="mt-2 font-mono text-lg font-semibold text-[#20dc73]">
        {value}
      </p>
    </div>
  )
}