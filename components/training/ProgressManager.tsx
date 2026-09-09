"use client"

import {
  useMemo,
  useState,
} from "react"

type TrainingModule = {
  id: string

  title?: string | null
  description?: string | null
  objectives?: unknown

  module_order?: number | string | null
  status?: string | null
  completion_percentage?: number | string | null

  material_count?: number | string | null
  completed_material_count?: number | string | null

  session_count?: number | string | null
  attended_session_count?: number | string | null
  completed_session_count?: number | string | null

  created_at?: string | null
  updated_at?: string | null

  [key: string]: unknown
}

type TrainingModuleProgress = {
  id: string

  training_engagement_id?: string | null
  module_id?: string | null
  client_profile_id?: string | null

  status?: string | null
  completion_percentage?: number | string | null

  trainer_notes?: string | null

  started_at?: string | null
  completed_at?: string | null

  module_title?: string | null
  module_order?: number | string | null

  material_count?: number | string | null
  completed_material_count?: number | string | null

  session_count?: number | string | null
  completed_session_count?: number | string | null

  material_progress?: number | string | null
  session_progress?: number | string | null

  material_readiness_percentage?:
    | number
    | string
    | null

  all_materials_completed?:
    | boolean
    | null

  created_at?: string | null
  updated_at?: string | null

  [key: string]: unknown
}

type TrainingMaterial = {
  id: string

  training_engagement_id?: string | null
  module_id?: string | null

  title?: string | null
  description?: string | null
  material_type?: string | null

  file_url?: string | null
  external_url?: string | null
  visibility?: string | null

  uploaded_by?: string | null

  created_at?: string | null
  updated_at?: string | null

  [key: string]: unknown
}

type TrainingMaterialProgress = {
  id: string

  training_engagement_id?: string | null
  material_id?: string | null
  client_profile_id?: string | null

  status?: string | null
  progress_percentage?: number | string | null

  watched_seconds?: number | null
  duration_seconds?: number | null

  pages_viewed?: number | null
  total_pages?: number | null

  started_at?: string | null
  completed_at?: string | null
  last_accessed_at?: string | null

  module_id?: string | null
  module_title?: string | null
  material_title?: string | null

  module_order?: number | string | null

  [key: string]: unknown
}

type TrainingSession = {
  id: string

  module_id?: string | null

  status?: string | null
  attendance_status?: string | null

  scheduled_at?: string | null

  [key: string]: unknown
}

type ProgressManagerProps = {
  engagementId: string
  engagementNumber?: string | null
  engagementStatus?: string | null

  initialModules?: TrainingModule[]
  initialProgress?: TrainingModuleProgress[]

  initialMaterials?: TrainingMaterial[]
  initialMaterialProgress?: TrainingMaterialProgress[]

  initialSessions?: TrainingSession[]

  canManageProgress?: boolean
}

function numberValue(
  value:
    | number
    | string
    | null
    | undefined,
): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return 0
  }

  return parsed
}

function clampProgress(
  value:
    | number
    | string
    | null
    | undefined,
): number {
  return Math.min(
    100,
    Math.max(
      0,
      numberValue(value),
    ),
  )
}

function formatPercentage(
  value: number,
): string {
  return `${Math.round(value)}%`
}

function normalizeStatus(
  value:
    | string
    | null
    | undefined,
): string {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/\s+/g, "_") ||
    "not_started"
  )
}

function statusLabel(
  status: string,
): string {
  switch (
    normalizeStatus(status)
  ) {
    case "completed":
      return "Completed"

    case "in_progress":
      return "In Progress"

    case "not_started":
      return "Not Started"

    default:
      return status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) =>
          letter.toUpperCase(),
        )
  }
}

function statusClasses(
  status: string,
): string {
  switch (
    normalizeStatus(status)
  ) {
    case "completed":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"

    case "in_progress":
      return "border-blue-500/30 bg-blue-500/10 text-blue-300"

    case "not_started":
      return "border-white/10 bg-white/[0.04] text-white/50"

    default:
      return "border-white/10 bg-white/[0.04] text-white/60"
  }
}

function materialProgressCompleted(
  progress: TrainingMaterialProgress,
): boolean {
  if (
    normalizeStatus(
      progress.status,
    ) === "completed"
  ) {
    return true
  }

  return (
    numberValue(
      progress.progress_percentage,
    ) >= 100
  )
}

function sessionCompleted(
  session: TrainingSession,
): boolean {
  return (
    normalizeStatus(
      session.status,
    ) === "completed"
  )
}

export default function ProgressManager({
  engagementId,
  engagementNumber,
  engagementStatus,
  initialModules = [],
  initialProgress = [],
  initialMaterials = [],
  initialMaterialProgress = [],
  initialSessions = [],
  canManageProgress = false,
}: ProgressManagerProps) {
  const [
    progress,
    setProgress,
  ] = useState<
    TrainingModuleProgress[]
  >(initialProgress)

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState<string | null>(null)

  /*
   * The backend is the source of truth for
   * calculated module progress.
   */
  const progressMap = useMemo(() => {
    const map = new Map<
      string,
      TrainingModuleProgress
    >()

    for (const item of progress) {
      if (!item.module_id) {
        continue
      }

      map.set(
        item.module_id,
        item,
      )
    }

    return map
  }, [progress])

  /*
   * Client-specific material activity.
   */
  const materialProgressByModule =
    useMemo(() => {
      const map = new Map<
        string,
        {
          total: number
          completed: number
        }
      >()

      for (
        const material of
          initialMaterials
      ) {
        const moduleId =
          material.module_id

        if (!moduleId) {
          continue
        }

        const current =
          map.get(moduleId) || {
            total: 0,
            completed: 0,
          }

        current.total += 1

        const materialProgress =
          initialMaterialProgress.find(
            (item) =>
              item.material_id ===
              material.id,
          )

        if (
          materialProgress &&
          materialProgressCompleted(
            materialProgress,
          )
        ) {
          current.completed += 1
        }

        map.set(
          moduleId,
          current,
        )
      }

      return map
    }, [
      initialMaterials,
      initialMaterialProgress,
    ])

  /*
   * Session activity.
   */
  const sessionStatsByModule =
    useMemo(() => {
      const map = new Map<
        string,
        {
          total: number
          completed: number
          attended: number
        }
      >()

      for (
        const session of initialSessions
      ) {
        const moduleId =
          session.module_id

        if (!moduleId) {
          continue
        }

        const current =
          map.get(moduleId) || {
            total: 0,
            completed: 0,
            attended: 0,
          }

        current.total += 1

        if (
          sessionCompleted(
            session,
          )
        ) {
          current.completed += 1
        }

        if (
          normalizeStatus(
            session.attendance_status,
          ) === "attended"
        ) {
          current.attended += 1
        }

        map.set(
          moduleId,
          current,
        )
      }

      return map
    }, [initialSessions])

  const modules = useMemo(() => {
    return [...initialModules]
      .sort(
        (a, b) =>
          numberValue(
            a.module_order,
          ) -
          numberValue(
            b.module_order,
          ),
      )
      .map((module) => {
        const savedProgress =
          progressMap.get(
            module.id,
          )

        const moduleProgress =
          clampProgress(
            savedProgress
              ?.completion_percentage ??
              0,
          )

        const moduleStatus =
          normalizeStatus(
            savedProgress?.status ??
              "not_started",
          )

        const materialStats =
          materialProgressByModule.get(
            module.id,
          ) || {
            total:
              numberValue(
                savedProgress?.material_count ??
                  module.material_count,
              ),

            completed:
              numberValue(
                savedProgress?.completed_material_count ??
                  module.completed_material_count,
              ),
          }

        const sessionStats =
          sessionStatsByModule.get(
            module.id,
          )

        const sessionTotal =
          sessionStats?.total ??
          numberValue(
            savedProgress?.session_count ??
              module.session_count,
          )

        const sessionsCompleted =
          sessionStats?.completed ??
          numberValue(
            savedProgress?.completed_session_count ??
              module.completed_session_count,
          )

        const sessionsAttended =
          sessionStats?.attended ??
          numberValue(
            module.attended_session_count,
          )

        return {
          module,

          progress:
            moduleProgress,

          status:
            moduleStatus,

          materialTotal:
            materialStats.total,

          materialCompleted:
            materialStats.completed,

          materialProgress:
            clampProgress(
              savedProgress
                ?.material_progress ??
                (
                  materialStats.total >
                    0
                    ? (
                        materialStats.completed /
                        materialStats.total
                      ) *
                      100
                    : 0
                ),
            ),

          sessionTotal,

          sessionsAttended,

          sessionsCompleted,

          sessionProgress:
            clampProgress(
              savedProgress
                ?.session_progress ??
                (
                  sessionTotal >
                    0
                    ? (
                        sessionsCompleted /
                        sessionTotal
                      ) *
                      100
                    : 0
                ),
            ),

          trainerNotes:
            savedProgress?.trainer_notes ||
            null,

          completedAt:
            savedProgress?.completed_at ||
            null,
        }
      })
  }, [
    initialModules,
    progressMap,
    materialProgressByModule,
    sessionStatsByModule,
  ])

  const overallProgress =
    useMemo(() => {
      if (!modules.length) {
        return 0
      }

      return (
        modules.reduce(
          (sum, item) =>
            sum + item.progress,
          0,
        ) / modules.length
      )
    }, [modules])

  const completedModules =
    modules.filter(
      (item) =>
        item.progress >= 100,
    ).length

  const inProgressModules =
    modules.filter(
      (item) =>
        item.progress > 0 &&
        item.progress < 100,
    ).length

  const notStartedModules =
    modules.filter(
      (item) =>
        item.progress <= 0,
    ).length

  const totalMaterials =
    modules.reduce(
      (sum, item) =>
        sum + item.materialTotal,
      0,
    )

  const completedMaterials =
    modules.reduce(
      (sum, item) =>
        sum + item.materialCompleted,
      0,
    )

  const totalSessions =
    modules.reduce(
      (sum, item) =>
        sum + item.sessionTotal,
      0,
    )

  const attendedSessions =
    modules.reduce(
      (sum, item) =>
        sum + item.sessionsAttended,
      0,
    )

  const completedSessions =
    modules.reduce(
      (sum, item) =>
        sum + item.sessionsCompleted,
      0,
    )

  /*
   * Pull the latest authoritative calculation
   * from the backend.
   */
  async function refreshProgress() {
    setError(null)
    setIsRefreshing(true)

    try {
      const response =
        await fetch(
          `/api/training/${engagementId}/progress`,
          {
            method: "GET",
            cache: "no-store",
          },
        )

      const data =
        await response.json().catch(
          () => null,
        )

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to refresh training progress.",
        )
      }

      if (
        Array.isArray(
          data?.progress,
        )
      ) {
        setProgress(
          data.progress,
        )
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to refresh training progress.",
      )
    } finally {
      setIsRefreshing(false)
    }
  }

  /*
   * Ask the server to recalculate one module.
   *
   * IMPORTANT:
   * clientProfileId is deliberately NOT sent.
   * The API derives it from the engagement.
   */
  async function recalculateModule(
    moduleId: string,
  ) {
    if (!canManageProgress) {
      return
    }

    setError(null)
    setIsRefreshing(true)

    try {
      const response =
        await fetch(
          `/api/training/${engagementId}/progress`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              moduleId,
            }),
          },
        )

      const data =
        await response.json().catch(
          () => null,
        )

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to recalculate module progress.",
        )
      }

      if (data?.progress) {
        setProgress(
          (current) => {
            const existingIndex =
              current.findIndex(
                (item) =>
                  item.module_id ===
                  moduleId,
              )

            if (
              existingIndex === -1
            ) {
              return [
                ...current,
                data.progress,
              ]
            }

            return current.map(
              (
                item,
                index,
              ) =>
                index ===
                existingIndex
                  ? {
                      ...item,
                      ...data.progress,
                    }
                  : item,
            )
          },
        )
      }

      /*
       * The module calculation may also change
       * overall engagement progress, so refresh
       * the complete authoritative result after
       * successful recalculation.
       */
      await refreshProgress()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to recalculate module progress.",
      )
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-white/10 bg-[#07130f] p-6 shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
              Training Progress
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Training Progress
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/50">
              {engagementNumber && (
                <span>
                  Engagement:{" "}
                  <span className="text-white/80">
                    {engagementNumber}
                  </span>
                </span>
              )}

              {engagementStatus && (
                <>
                  <span className="text-white/20">
                    •
                  </span>

                  <span>
                    Status:{" "}
                    <span className="text-white/80">
                      {statusLabel(
                        engagementStatus,
                      )}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="text-left lg:text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                Overall Progress
              </p>

              <p className="mt-1 text-4xl font-semibold text-white">
                {formatPercentage(
                  overallProgress,
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={
                refreshProgress
              }
              disabled={
                isRefreshing
              }
              className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefreshing
                ? "Refreshing..."
                : "Refresh Progress"}
            </button>
          </div>
        </div>

        <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{
              width: `${overallProgress}%`,
            }}
          />
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Summary */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard
          label="Modules"
          value={modules.length}
          detail={`${completedModules} completed`}
        />

        <SummaryCard
          label="In Progress"
          value={inProgressModules}
          detail={`${notStartedModules} not started`}
        />

        <SummaryCard
          label="Materials"
          value={completedMaterials}
          detail={`of ${totalMaterials} completed`}
        />

        <SummaryCard
          label="Sessions"
          value={totalSessions}
          detail={`${attendedSessions} attended`}
        />

        <SummaryCard
          label="Completed Sessions"
          value={completedSessions}
          detail={`${attendedSessions} attended`}
        />

        <SummaryCard
          label="Average Progress"
          value={formatPercentage(
            overallProgress,
          )}
          detail="Calculated across modules"
        />
      </section>

      {/* Calculation explanation */}
      <section className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.03] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
            %
          </div>

          <div>
            <h2 className="font-semibold text-white">
              Progress is calculated automatically
            </h2>

            <p className="mt-1 text-sm leading-6 text-white/50">
              A module's progress is calculated
              from the training activity attached
              to that module. Completed materials
              and completed sessions contribute to
              the module's completion percentage.
              Trainers and administrators cannot
              manually set a percentage.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/50">
                Materials
              </span>

              <span className="text-white/20">
                +
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/50">
                Sessions
              </span>

              <span className="text-white/20">
                →
              </span>

              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
                Module Progress
              </span>

              <span className="text-white/20">
                →
              </span>

              <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs text-blue-300">
                Overall Progress
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#07130f]">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                Curriculum
              </p>

              <h2 className="mt-1 text-xl font-semibold text-white">
                Module Progress
              </h2>
            </div>

            <div className="text-sm text-white/40">
              {completedModules} of{" "}
              {modules.length} modules
              completed
            </div>
          </div>
        </div>

        {modules.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/30">
              —
            </div>

            <h3 className="mt-4 font-medium text-white">
              No modules yet
            </h3>

            <p className="mt-1 text-sm text-white/40">
              The training curriculum has not
              been created yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {modules.map(
              (
                item,
                index,
              ) => (
                <ModuleProgressCard
                  key={item.module.id}
                  index={index}
                  module={item.module}
                  progress={
                    item.progress
                  }
                  status={
                    item.status
                  }
                  materialTotal={
                    item.materialTotal
                  }
                  materialCompleted={
                    item.materialCompleted
                  }
                  materialProgress={
                    item.materialProgress
                  }
                  sessionTotal={
                    item.sessionTotal
                  }
                  sessionsAttended={
                    item.sessionsAttended
                  }
                  sessionsCompleted={
                    item.sessionsCompleted
                  }
                  sessionProgress={
                    item.sessionProgress
                  }
                  trainerNotes={
                    item.trainerNotes
                  }
                  completedAt={
                    item.completedAt
                  }
                  canManage={
                    canManageProgress
                  }
                  refreshing={
                    isRefreshing
                  }
                  onRecalculate={
                    recalculateModule
                  }
                />
              ),
            )}
          </div>
        )}
      </section>

      {/* Material activity */}
      <section className="rounded-2xl border border-white/10 bg-[#07130f] p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
              Materials
            </p>

            <h2 className="mt-1 text-xl font-semibold text-white">
              Material Activity
            </h2>
          </div>

          <p className="text-sm text-white/40">
            {completedMaterials} /{" "}
            {totalMaterials} completed
          </p>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{
              width:
                totalMaterials > 0
                  ? `${
                      (
                        completedMaterials /
                        totalMaterials
                      ) *
                      100
                    }%`
                  : "0%",
            }}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <ActivityStat
            label="Total Materials"
            value={totalMaterials}
          />

          <ActivityStat
            label="Completed"
            value={
              completedMaterials
            }
          />

          <ActivityStat
            label="Remaining"
            value={Math.max(
              0,
              totalMaterials -
                completedMaterials,
            )}
          />
        </div>
      </section>

      {/* Session activity */}
      <section className="rounded-2xl border border-white/10 bg-[#07130f] p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
              Sessions
            </p>

            <h2 className="mt-1 text-xl font-semibold text-white">
              Session Activity
            </h2>
          </div>

          <p className="text-sm text-white/40">
            {attendedSessions} /{" "}
            {totalSessions} attended
          </p>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{
              width:
                totalSessions > 0
                  ? `${
                      (
                        attendedSessions /
                        totalSessions
                      ) *
                      100
                    }%`
                  : "0%",
            }}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <ActivityStat
            label="Scheduled Sessions"
            value={totalSessions}
          />

          <ActivityStat
            label="Attended"
            value={
              attendedSessions
            }
          />

          <ActivityStat
            label="Completed"
            value={
              completedSessions
            }
          />
        </div>
      </section>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#07130f] p-5">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/40">
        {label}
      </p>

      <p className="mt-3 text-2xl font-semibold text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-white/35">
        {detail}
      </p>
    </div>
  )
}

function ActivityStat({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-white/35">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold text-white">
        {value}
      </p>
    </div>
  )
}

function ModuleProgressCard({
  index,
  module,
  progress,
  status,
  materialTotal,
  materialCompleted,
  materialProgress,
  sessionTotal,
  sessionsAttended,
  sessionsCompleted,
  sessionProgress,
  trainerNotes,
  completedAt,
  canManage,
  refreshing,
  onRecalculate,
}: {
  index: number
  module: TrainingModule

  progress: number
  status: string

  materialTotal: number
  materialCompleted: number
  materialProgress: number

  sessionTotal: number
  sessionsAttended: number
  sessionsCompleted: number
  sessionProgress: number

  trainerNotes: string | null
  completedAt: string | null

  canManage: boolean
  refreshing: boolean

  onRecalculate: (
    moduleId: string,
  ) => void
}) {
  const normalizedStatus =
    normalizeStatus(status)

  return (
    <article className="relative px-6 py-6">
      <div className="flex gap-5">
        <div className="hidden shrink-0 sm:flex">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-sm font-semibold text-emerald-300">
            {String(
              index + 1,
            ).padStart(2, "0")}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-400 sm:hidden">
                  Module{" "}
                  {String(
                    index + 1,
                  ).padStart(
                    2,
                    "0",
                  )}
                </span>

                <h3 className="truncate text-lg font-semibold text-white">
                  {module.title ||
                    `Module ${
                      index + 1
                    }`}
                </h3>
              </div>

              {module.description && (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
                  {module.description}
                </p>
              )}
            </div>

            <span
              className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(
                normalizedStatus,
              )}`}
            >
              {statusLabel(
                normalizedStatus,
              )}
            </span>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">
                Calculated module progress
              </span>

              <span className="font-semibold text-white">
                {formatPercentage(
                  progress,
                )}
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress >=
                  100
                    ? "bg-emerald-400"
                    : "bg-blue-400"
                }`}
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ActivityBreakdown
              label="Materials"
              completed={
                materialCompleted
              }
              total={
                materialTotal
              }
              percentage={
                materialProgress
              }
              description="Completed materials"
              tone="emerald"
            />

            <ActivityBreakdown
              label="Sessions"
              completed={
                sessionsCompleted
              }
              total={
                sessionTotal
              }
              percentage={
                sessionProgress
              }
              description={`${sessionsAttended} attended`}
              tone="blue"
            />
          </div>

          {trainerNotes && (
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/35">
                Trainer Notes
              </p>

              <p className="mt-2 text-sm leading-6 text-white/55">
                {trainerNotes}
              </p>
            </div>
          )}

          {completedAt && (
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300/80">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/10">
                ✓
              </span>

              Module completed
            </div>
          )}

          {canManage && (
            <div className="mt-5 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.03] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-emerald-300/70">
                    Trainer Controls
                  </p>

                  <p className="mt-1 text-xs leading-5 text-white/35">
                    Progress is calculated from
                    this module's sessions and
                    materials. Recalculation refreshes
                    the authoritative server result.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onRecalculate(
                      module.id,
                    )
                  }
                  disabled={
                    refreshing
                  }
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {refreshing
                    ? "Recalculating..."
                    : "Recalculate"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function ActivityBreakdown({
  label,
  completed,
  total,
  percentage,
  description,
  tone,
}: {
  label: string
  completed: number
  total: number
  percentage: number
  description: string
  tone: "emerald" | "blue"
}) {
  const barClass =
    tone === "emerald"
      ? "bg-emerald-500"
      : "bg-blue-500"

  const percentageClass =
    tone === "emerald"
      ? "text-emerald-300"
      : "text-blue-300"

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.12em] text-white/35">
          {label}
        </span>

        <span
          className={`text-sm font-semibold ${percentageClass}`}
        >
          {formatPercentage(
            percentage,
          )}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-white/45">
          {completed} / {total}
        </span>

        <span className="text-white/30">
          {description}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-all ${barClass}`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  )
}