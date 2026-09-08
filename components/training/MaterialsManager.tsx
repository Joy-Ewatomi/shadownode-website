"use client"

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { createClient } from "@/lib/supabase/client"

const ALLOWED_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/zip",
  "video/mp4",
  "video/webm",
  "video/ogg",
]

type TrainingModule = {
  id: string
  title?: string | null
  description?: string | null
  module_order?: number | null
  status?: string | null
  completion_percentage?: number | null
}

type TrainingMaterialProgress = {
  id?: string
  material_id: string
  client_profile_id?: string | null
  status?: string | null
  progress_percentage?: number | null
  watched_seconds?: number | null
  duration_seconds?: number | null
  pages_viewed?: number | null
  total_pages?: number | null
  started_at?: string | null
  completed_at?: string | null
  last_accessed_at?: string | null
}

type TrainingMaterial = {
  id?: string
  title?: string | null
  description?: string | null
  material_type?: string | null
  file_url?: string | null
  external_url?: string | null
  visibility?: string | null
  file_size?: string | number | null
  module_id?: string | null
  module_title?: string | null
  module_order?: number | null
  created_at?: string | Date | null
  updated_at?: string | Date | null

  progress?: TrainingMaterialProgress | null
}

type MaterialsManagerProps = {
  initialMaterials?: TrainingMaterial[]
  engagementId: string
  canManageMaterials?: boolean
  modules?: TrainingModule[]
  isClient?: boolean
}

function normalizeMaterialType(
  material: TrainingMaterial,
) {
  const type =
    String(
      material.material_type || "",
    ).toLowerCase()

  if (
    type.includes("video") ||
    type === "video"
  ) {
    return "video"
  }

  if (
    type.includes("pdf")
  ) {
    return "pdf"
  }

  if (
    type.includes("word") ||
    type.includes("document") ||
    type === "doc" ||
    type === "docx"
  ) {
    return "document"
  }

  if (
    type.includes("presentation") ||
    type.includes("powerpoint")
  ) {
    return "presentation"
  }

  if (
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type.includes("csv")
  ) {
    return "spreadsheet"
  }

  if (
    type.startsWith("image/")
  ) {
    return "image"
  }

  if (
    material.external_url &&
    !material.file_url
  ) {
    return "link"
  }

  return "other"
}

function formatMaterialType(
  material: TrainingMaterial,
) {
  const type =
    normalizeMaterialType(material)

  switch (type) {
    case "video":
      return "Video"

    case "pdf":
      return "PDF"

    case "document":
      return "Document"

    case "presentation":
      return "Presentation"

    case "spreadsheet":
      return "Dataset / Spreadsheet"

    case "image":
      return "Image"

    case "link":
      return "External Resource"

    default:
      return "Training Resource"
  }
}

function formatProgress(
  value: number | null | undefined,
) {
  const numeric =
    Number(value || 0)

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(numeric),
    ),
  )
}

function formatDuration(
  seconds: number | null | undefined,
) {
  const total =
    Math.max(
      0,
      Math.floor(
        Number(seconds || 0),
      ),
    )

  const minutes =
    Math.floor(total / 60)

  const remaining =
    total % 60

  if (minutes === 0) {
    return `${remaining}s`
  }

  return `${minutes}m ${String(
    remaining,
  ).padStart(2, "0")}s`
}

function getProgressLabel(
  progress:
    | TrainingMaterialProgress
    | null
    | undefined,
) {
  if (!progress) {
    return "Not started"
  }

  const percentage =
    formatProgress(
      progress.progress_percentage,
    )

  if (
    progress.status ===
      "completed" ||
    percentage >= 100
  ) {
    return "Completed"
  }

  if (
    progress.status ===
      "in_progress" ||
    percentage > 0
  ) {
    return `${percentage}% complete`
  }

  return "Not started"
}

function getProgressClass(
  progress:
    | TrainingMaterialProgress
    | null
    | undefined,
) {
  if (!progress) {
    return "text-white/40"
  }

  const percentage =
    formatProgress(
      progress.progress_percentage,
    )

  if (percentage >= 100) {
    return "text-[#20dc73]"
  }

  if (percentage > 0) {
    return "text-yellow-300"
  }

  return "text-white/40"
}

export default function MaterialsManager({
  initialMaterials = [],
  engagementId,
  canManageMaterials = false,
  modules = [],
  isClient = false,
}: MaterialsManagerProps) {
  const [materials, setMaterials] =
    useState<TrainingMaterial[]>(
      initialMaterials,
    )

  const [materialProgress, setMaterialProgress] =
    useState<
      Record<
        string,
        TrainingMaterialProgress
      >
    >({})

  const [title, setTitle] =
    useState("")

  const [description, setDescription] =
    useState("")

  const [url, setUrl] =
    useState("")

  const [selectedModuleId, setSelectedModuleId] =
    useState("")

  const [uploading, setUploading] =
    useState(false)

  const [loadingProgress, setLoadingProgress] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const [success, setSuccess] =
    useState<string | null>(null)

  const fileRef =
    useRef<HTMLInputElement | null>(null)

  const videoRefs =
    useRef<
      Record<
        string,
        HTMLVideoElement | null
      >
    >({})

  const lastVideoUpdate =
    useRef<
      Record<string, number>
    >({})

  const sortedModules =
    useMemo(() => {
      return [...modules].sort(
        (a, b) =>
          Number(
            a.module_order || 0,
          ) -
          Number(
            b.module_order || 0,
          ),
      )
    }, [modules])

  const materialsByModule =
    useMemo(() => {
      const groups =
        new Map<
          string,
          TrainingMaterial[]
        >()

      for (
        const material of materials
      ) {
        const moduleId =
          material.module_id ||
          "__unassigned__"

        if (!groups.has(moduleId)) {
          groups.set(
            moduleId,
            [],
          )
        }

        groups
          .get(moduleId)!
          .push(material)
      }

      return groups
    }, [materials])

  useEffect(() => {
    setMaterials(initialMaterials)
  }, [initialMaterials])

  useEffect(() => {
    if (
      !isClient ||
      !engagementId
    ) {
      return
    }

    async function loadMaterialProgress() {
      setLoadingProgress(true)

      try {
        const res =
          await fetch(
            `/api/training/${engagementId}/materials/progress`,
            {
              method: "GET",
              cache: "no-store",
            },
          )

        if (!res.ok) {
          return
        }

        const payload =
          await res.json()

        const rows =
          Array.isArray(
            payload?.progress,
          )
            ? payload.progress
            : []

        const mapped: Record<
          string,
          TrainingMaterialProgress
        > = {}

        for (
          const row of rows
        ) {
          if (
            row?.material_id
          ) {
            mapped[
              row.material_id
            ] = row
          }
        }

        setMaterialProgress(
          mapped,
        )
      } catch (err) {
        console.error(
          "MATERIAL PROGRESS LOAD ERROR:",
          err,
        )
      } finally {
        setLoadingProgress(
          false,
        )
      }
    }

    loadMaterialProgress()
  }, [
    engagementId,
    isClient,
  ])

  function getMaterialProgress(
    material: TrainingMaterial,
  ) {
    if (!material.id) {
      return null
    }

    return (
      material.progress ||
      materialProgress[
        material.id
      ] ||
      null
    )
  }

  async function updateClientMaterialProgress(
    material: TrainingMaterial,
    updates: Record<
      string,
      unknown
    >,
  ) {
    if (
      !isClient ||
      !material.id
    ) {
      return
    }

    try {
      const res =
        await fetch(
          `/api/training/${engagementId}/materials/progress`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              materialId:
                material.id,
              ...updates,
            }),
          },
        )

      const payload =
        await res.json()

      if (!res.ok) {
        throw new Error(
          payload?.error ||
            "Failed to update material progress.",
        )
      }

      if (
        payload?.progress
      ) {
        setMaterialProgress(
          (current) => ({
            ...current,
            [material.id!]:
              payload.progress,
          }),
        )
      }
    } catch (err) {
      console.error(
        "MATERIAL PROGRESS UPDATE ERROR:",
        err,
      )
    }
  }

  async function openFile(
    material: TrainingMaterial,
  ) {
    if (!material.file_url) {
      return
    }

    await updateClientMaterialProgress(
      material,
      {
        status: "in_progress",
        progress_percentage: Math.max(
          1,
          formatProgress(
            getMaterialProgress(
              material,
            )
              ?.progress_percentage,
          ),
        ),
      },
    )

    const fileUrl =
      `/api/storage/evidence?path=${encodeURIComponent(
        material.file_url,
      )}`

    window.open(
      fileUrl,
      "_blank",
      "noopener,noreferrer",
    )
  }

  async function openExternalResource(
    material: TrainingMaterial,
  ) {
    if (
      !material.external_url
    ) {
      return
    }

    await updateClientMaterialProgress(
      material,
      {
        status: "completed",
        progress_percentage: 100,
        completed: true,
      },
    )

    window.open(
      material.external_url,
      "_blank",
      "noopener,noreferrer",
    )
  }

  async function markMaterialComplete(
    material: TrainingMaterial,
  ) {
    await updateClientMaterialProgress(
      material,
      {
        status: "completed",
        progress_percentage: 100,
        completed: true,
      },
    )
  }

  async function handleVideoTimeUpdate(
    material: TrainingMaterial,
    video: HTMLVideoElement,
  ) {
    if (
      !isClient ||
      !material.id
    ) {
      return
    }

    const duration =
      Number(video.duration || 0)

    const currentTime =
      Number(video.currentTime || 0)

    if (
      !Number.isFinite(
        duration,
      ) ||
      duration <= 0
    ) {
      return
    }

    const percentage =
      Math.min(
        100,
        Math.round(
          (currentTime /
            duration) *
            100,
        ),
      )

    const previous =
      lastVideoUpdate.current[
        material.id
      ] || 0

    /*
     * Avoid sending a request on every
     * video timeupdate event.
     */
    if (
      percentage <
        100 &&
      currentTime - previous <
        10
    ) {
      return
    }

    lastVideoUpdate.current[
      material.id
    ] = currentTime

    const completed =
      percentage >= 95

    await updateClientMaterialProgress(
      material,
      {
        status: completed
          ? "completed"
          : "in_progress",
        progress_percentage:
          completed
            ? 100
            : percentage,
        watched_seconds:
          currentTime,
        duration_seconds:
          duration,
        completed,
      },
    )
  }

  async function handleVideoEnded(
    material: TrainingMaterial,
    video: HTMLVideoElement,
  ) {
    if (
      !isClient
    ) {
      return
    }

    await updateClientMaterialProgress(
      material,
      {
        status: "completed",
        progress_percentage: 100,
        watched_seconds:
          video.duration || 0,
        duration_seconds:
          video.duration || 0,
        completed: true,
      },
    )
  }

  async function createMaterial(
    e: React.FormEvent,
  ) {
    e.preventDefault()

    setError(null)
    setSuccess(null)

    const trimmedTitle =
      title.trim()

    const trimmedDescription =
      description.trim()

    const trimmedUrl =
      url.trim()

    if (
      !trimmedTitle &&
      !trimmedUrl
    ) {
      setError(
        "Provide a material title or an external URL.",
      )
      return
    }

    if (
      !selectedModuleId
    ) {
      setError(
        "Select the training module this material belongs to.",
      )
      return
    }

    try {
      const res =
        await fetch(
          `/api/training/${engagementId}/materials`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              title:
                trimmedTitle ||
                "Training Resource",
              description:
                trimmedDescription ||
                null,
              module_id:
                selectedModuleId,
              material_type:
                trimmedUrl
                  ? "link"
                  : "other",
              external_url:
                trimmedUrl ||
                null,
              visibility:
                "private",
            }),
          },
        )

      const payload =
        await res.json()

      if (!res.ok) {
        throw new Error(
          payload?.error ||
            "Failed to create material",
        )
      }

      if (
        !payload?.material
      ) {
        throw new Error(
          "The server did not return the created material.",
        )
      }

      setMaterials(
        (current) => [
          payload.material,
          ...current,
        ],
      )

      setTitle("")
      setDescription("")
      setUrl("")
      setSelectedModuleId("")

      setSuccess(
        "Training material added successfully.",
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create material",
      )
    }
  }

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      e.target.files?.[0]

    if (!file) {
      return
    }

    setError(null)
    setSuccess(null)

    if (
      !canManageMaterials
    ) {
      setError(
        "You do not have permission to upload training materials.",
      )

      if (fileRef.current) {
        fileRef.current.value =
          ""
      }

      return
    }

    if (
      !selectedModuleId
    ) {
      setError(
        "Select a training module before uploading the material.",
      )

      if (fileRef.current) {
        fileRef.current.value =
          ""
      }

      return
    }

    if (
      !ALLOWED_MIMES.includes(
        file.type,
      )
    ) {
      setError(
        "File type not allowed. Please select a supported training material.",
      )

      if (fileRef.current) {
        fileRef.current.value =
          ""
      }

      return
    }

    const duplicate =
      materials.some(
        (material) =>
          material.file_url?.endsWith(
            `/${file.name}`,
          ),
      )

    if (duplicate) {
      setError(
        "A file with this name already exists.",
      )

      if (fileRef.current) {
        fileRef.current.value =
          ""
      }

      return
    }

    setUploading(true)

    try {
      const supabase =
        createClient()

      const timestamp =
        Date.now()

      const safeName =
        file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_",
        )

      const path =
        `training/${engagementId}/${timestamp}-${safeName}`

      const {
        data,
        error: uploadError,
      } =
        await supabase.storage
          .from("evidence")
          .upload(
            path,
            file,
            {
              contentType:
                file.type,
              upsert: false,
            },
          )

      if (uploadError) {
        throw new Error(
          uploadError.message ||
            "Failed to upload file.",
        )
      }

      const filePath =
        data?.path || path

      const createRes =
        await fetch(
          `/api/training/${engagementId}/materials`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              title:
                title.trim() ||
                file.name,
              description:
                description.trim() ||
                null,
              module_id:
                selectedModuleId,
              material_type:
                file.type,
              file_url:
                filePath,
              visibility:
                "private",
            }),
          },
        )

      const payload =
        await createRes.json()

      if (!createRes.ok) {
        throw new Error(
          payload?.error ||
            "Failed to register uploaded material.",
        )
      }

      if (
        !payload?.material
      ) {
        throw new Error(
          "The server did not return the uploaded material.",
        )
      }

      setMaterials(
        (current) => [
          payload.material,
          ...current,
        ],
      )

      setTitle("")
      setDescription("")

      if (fileRef.current) {
        fileRef.current.value =
          ""
      }

      setSuccess(
        "Training material uploaded successfully.",
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload training material.",
      )
    } finally {
      setUploading(false)
    }
  }

  const totalMaterials =
    materials.length

  const completedMaterials =
    materials.filter(
      (material) =>
        formatProgress(
          getMaterialProgress(
            material,
          )
            ?.progress_percentage,
        ) >= 100,
    ).length

  const materialProgressPercentage =
    totalMaterials > 0
      ? Math.round(
          materials.reduce(
            (sum, material) =>
              sum +
              formatProgress(
                getMaterialProgress(
                  material,
                )
                  ?.progress_percentage,
              ),
            0,
          ) /
            totalMaterials,
        )
      : 0

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Training Materials
          </h3>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-white/50">
            Training resources are organized
            around the curriculum modules they
            support. Client access and material
            consumption are tracked separately from
            trainer-managed module progress.
          </p>
        </div>

        {canManageMaterials && (
          <div className="text-xs uppercase tracking-wider text-[#20dc73]/70">
            Trainer Material Management
          </div>
        )}
      </div>

      {/* CLIENT PROGRESS SUMMARY */}
      {isClient && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[#143b28] bg-[#020806]/90 p-4">
            <div className="text-xs uppercase tracking-wider text-white/40">
              Materials
            </div>

            <div className="mt-2 text-2xl font-semibold text-white">
              {totalMaterials}
            </div>

            <div className="mt-1 text-xs text-white/40">
              Resources available
            </div>
          </div>

          <div className="rounded-xl border border-[#143b28] bg-[#020806]/90 p-4">
            <div className="text-xs uppercase tracking-wider text-white/40">
              Completed
            </div>

            <div className="mt-2 text-2xl font-semibold text-[#20dc73]">
              {completedMaterials}
            </div>

            <div className="mt-1 text-xs text-white/40">
              Materials completed
            </div>
          </div>

          <div className="rounded-xl border border-[#143b28] bg-[#020806]/90 p-4">
            <div className="text-xs uppercase tracking-wider text-white/40">
              Resource Progress
            </div>

            <div className="mt-2 text-2xl font-semibold text-white">
              {materialProgressPercentage}%
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-[#20dc73] transition-all"
                style={{
                  width: `${materialProgressPercentage}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ADD MATERIAL */}
      {canManageMaterials && (
        <section className="rounded-xl border border-[#143b28] bg-[#020806]/90 p-5">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#20dc73]/70">
              Add Material
            </div>

            <p className="mt-1 text-sm text-white/50">
              Attach a resource to a specific
              curriculum module.
            </p>
          </div>

          <form
            onSubmit={createMaterial}
            className="mt-4 space-y-3"
          >
            <select
              value={selectedModuleId}
              onChange={(e) =>
                setSelectedModuleId(
                  e.target.value,
                )
              }
              disabled={uploading}
              className="w-full rounded-lg border border-[#143b28] bg-[#020806] px-3 py-2 text-sm text-white outline-none transition focus:border-[#20dc73]/50"
            >
              <option
                value=""
                className="bg-[#020806]"
              >
                Select curriculum module
              </option>

              {sortedModules.map(
                (module, index) => (
                  <option
                    key={module.id}
                    value={module.id}
                    className="bg-[#020806]"
                  >
                    {String(
                      module.module_order ??
                        index + 1,
                    ).padStart(
                      2,
                      "0",
                    )}{" "}
                    —{" "}
                    {module.title ||
                      "Untitled Module"}
                  </option>
                ),
              )}
            </select>

            {sortedModules.length ===
              0 && (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-200">
                Create at least one curriculum
                module before adding training
                materials.
              </div>
            )}

            <input
              value={title}
              onChange={(e) =>
                setTitle(
                  e.target.value,
                )
              }
              placeholder="Material title"
              disabled={uploading}
              className="w-full rounded-lg border border-[#143b28] bg-[#020806] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#20dc73]/50"
            />

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value,
                )
              }
              placeholder="Description / what this resource is for"
              rows={3}
              disabled={uploading}
              className="w-full resize-none rounded-lg border border-[#143b28] bg-[#020806] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#20dc73]/50"
            />

            <input
              value={url}
              onChange={(e) =>
                setUrl(
                  e.target.value,
                )
              }
              placeholder="External URL"
              disabled={uploading}
              className="w-full rounded-lg border border-[#143b28] bg-[#020806] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#20dc73]/50"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={
                  uploading ||
                  sortedModules.length ===
                    0
                }
                className="rounded-lg bg-[#20dc73] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#20dc73]/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Resource
              </button>

              <div className="text-xs text-white/40">
                Or upload a file below.
              </div>
            </div>
          </form>

          <div className="mt-4 border-t border-[#143b28]/80 pt-4">
            <label className="text-xs uppercase tracking-wider text-white/40">
              Upload File
            </label>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                ref={fileRef}
                type="file"
                onChange={
                  handleFileChange
                }
                disabled={
                  uploading ||
                  sortedModules.length ===
                    0
                }
                className="w-full text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-[#20dc73] file:px-3 file:py-2 file:text-sm file:font-medium file:text-black"
              />

              {uploading && (
                <span className="text-xs text-white/50">
                  Uploading…
                </span>
              )}
            </div>

            <p className="mt-2 text-xs leading-5 text-white/30">
              Supported: PDF, Word, PowerPoint,
              Excel, CSV, TXT, PNG, JPG, WebP,
              ZIP, MP4, WebM and OGG.
            </p>
          </div>
        </section>
      )}

      {!canManageMaterials && (
        <div className="rounded-xl border border-[#143b28] bg-[#020806]/90 p-4 text-sm text-white/50">
          You have view-only access to training
          materials for this engagement.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-[#20dc73]/20 bg-[#20dc73]/5 px-4 py-3 text-sm text-[#20dc73]">
          {success}
        </div>
      )}

      {loadingProgress && isClient && (
        <div className="text-xs text-white/30">
          Loading material progress…
        </div>
      )}

      {/* MATERIALS */}
      {materials.length === 0 && (
        <div className="rounded-xl border border-[#143b28] bg-[#020806]/90 p-5">
          <p className="text-sm text-white/50">
            No training materials have been added
            yet.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {sortedModules.map(
          (module, moduleIndex) => {
            const moduleMaterials =
              materialsByModule.get(
                module.id,
              ) || []

            return (
              <section
                key={module.id}
                className="rounded-xl border border-[#143b28] bg-[#020806]/90 overflow-hidden"
              >
                <div className="border-b border-[#143b28]/80 px-5 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[#20dc73]/70">
                        Module{" "}
                        {String(
                          module.module_order ??
                            moduleIndex + 1,
                        ).padStart(
                          2,
                          "0",
                        )}
                      </div>

                      <h4 className="mt-1 text-base font-semibold text-white">
                        {module.title ||
                          "Untitled Module"}
                      </h4>

                      {module.description && (
                        <p className="mt-1 text-sm text-white/40">
                          {
                            module.description
                          }
                        </p>
                      )}
                    </div>

                    <div className="text-xs text-white/40">
                      {
                        moduleMaterials.length
                      }{" "}
                      {moduleMaterials.length ===
                      1
                        ? "material"
                        : "materials"}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  {moduleMaterials.length ===
                    0 && (
                    <div className="rounded-lg border border-dashed border-[#143b28] px-4 py-5 text-center text-sm text-white/30">
                      No materials assigned to
                      this module yet.
                    </div>
                  )}

                  {moduleMaterials.map(
                    (material) => {
                      const title =
                        material.title ||
                        (material.file_url
                          ? material.file_url
                              .split(
                                "/",
                              )
                              .pop()
                          : "Training Material")

                      const type =
                        normalizeMaterialType(
                          material,
                        )

                      const progress =
                        getMaterialProgress(
                          material,
                        )

                      const progressPercentage =
                        formatProgress(
                          progress?.progress_percentage,
                        )

                      return (
                        <article
                          key={
                            material.id ||
                            material.file_url ||
                            material.external_url ||
                            title
                          }
                          className="rounded-xl border border-[#143b28] bg-black/20 p-4 transition hover:border-[#20dc73]/30"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h5 className="font-semibold text-white">
                                  {title}
                                </h5>

                                <span className="rounded-full border border-[#143b28] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
                                  {formatMaterialType(
                                    material,
                                  )}
                                </span>
                              </div>

                              {material.description && (
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                                  {
                                    material.description
                                  }
                                </p>
                              )}

                              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/35">
                                {material.file_size && (
                                  <span>
                                    Size:{" "}
                                    {
                                      material.file_size
                                    }
                                  </span>
                                )}

                                {material.created_at && (
                                  <span>
                                    Added:{" "}
                                    {new Date(
                                      String(
                                        material.created_at,
                                      ),
                                    ).toLocaleDateString()}
                                  </span>
                                )}

                                <span>
                                  Visibility:{" "}
                                  {material.visibility ||
                                    "private"}
                                </span>
                              </div>

                              {isClient && (
                                <div className="mt-4">
                                  <div className="flex items-center justify-between text-xs">
                                    <span
                                      className={
                                        getProgressClass(
                                          progress,
                                        )
                                      }
                                    >
                                      {
                                        getProgressLabel(
                                          progress,
                                        )
                                      }
                                    </span>

                                    <span className="text-white/30">
                                      {
                                        progressPercentage
                                      }
                                      %
                                    </span>
                                  </div>

                                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                                    <div
                                      className="h-full rounded-full bg-[#20dc73] transition-all"
                                      style={{
                                        width: `${progressPercentage}%`,
                                      }}
                                    />
                                  </div>

                                  {type ===
                                    "video" &&
                                    progress && (
                                      <div className="mt-2 text-xs text-white/30">
                                        Watched:{" "}
                                        {formatDuration(
                                          progress.watched_seconds,
                                        )}

                                        {progress.duration_seconds &&
                                          ` / ${formatDuration(
                                            progress.duration_seconds,
                                          )}`}
                                      </div>
                                    )}
                                </div>
                              )}

                              {type ===
                                "video" &&
                                material.file_url &&
                                isClient && (
                                  <div className="mt-4 rounded-lg border border-[#143b28] bg-black/30 p-3">
                                    <video
                                      ref={(
                                        element,
                                      ) => {
                                        if (
                                          material.id
                                        ) {
                                          videoRefs.current[
                                            material.id
                                          ] =
                                            element
                                        }
                                      }}
                                      controls
                                      preload="metadata"
                                      className="w-full rounded-lg"
                                      src={`/api/storage/evidence?path=${encodeURIComponent(
                                        material.file_url,
                                      )}`}
                                      onLoadedMetadata={(
                                        event,
                                      ) => {
                                        const video =
                                          event.currentTarget

                                        const current =
                                          getMaterialProgress(
                                            material,
                                          )

                                        if (
                                          current
                                            ?.duration_seconds
                                        ) {
                                          return
                                        }

                                        void updateClientMaterialProgress(
                                          material,
                                          {
                                            status:
                                              current?.status ||
                                              "in_progress",
                                            progress_percentage:
                                              current?.progress_percentage ||
                                              1,
                                            duration_seconds:
                                              video.duration,
                                          },
                                        )
                                      }}
                                      onTimeUpdate={(
                                        event,
                                      ) => {
                                        void handleVideoTimeUpdate(
                                          material,
                                          event.currentTarget,
                                        )
                                      }}
                                      onEnded={(
                                        event,
                                      ) => {
                                        void handleVideoEnded(
                                          material,
                                          event.currentTarget,
                                        )
                                      }}
                                    />

                                    <div className="mt-2 text-xs text-white/30">
                                      Video completion
                                      is recorded after
                                      the required watch
                                      threshold is reached.
                                    </div>
                                  </div>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 lg:max-w-xs lg:justify-end">
                              {material.file_url &&
                                type !==
                                  "video" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void openFile(
                                        material,
                                      )
                                    }
                                    className="rounded-lg border border-[#143b28] bg-black/20 px-3 py-2 text-xs text-white transition hover:border-[#20dc73]/40 hover:text-[#20dc73]"
                                  >
                                    Open
                                  </button>
                                )}

                              {material.file_url &&
                                type ===
                                  "video" &&
                                !isClient && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void openFile(
                                        material,
                                      )
                                    }
                                    className="rounded-lg border border-[#143b28] bg-black/20 px-3 py-2 text-xs text-white transition hover:border-[#20dc73]/40 hover:text-[#20dc73]"
                                  >
                                    Open Video
                                  </button>
                                )}

                              {material.external_url && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void openExternalResource(
                                      material,
                                    )
                                  }
                                  className="rounded-lg border border-[#143b28] bg-black/20 px-3 py-2 text-xs text-white transition hover:border-[#20dc73]/40 hover:text-[#20dc73]"
                                >
                                  Open Resource
                                </button>
                              )}

                              {isClient &&
                                progressPercentage >
                                  0 &&
                                progressPercentage <
                                  100 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void markMaterialComplete(
                                        material,
                                      )
                                    }
                                    className="rounded-lg border border-[#20dc73]/30 bg-[#20dc73]/5 px-3 py-2 text-xs text-[#20dc73] transition hover:bg-[#20dc73]/10"
                                  >
                                    Mark Complete
                                  </button>
                                )}

                              {isClient &&
                                progressPercentage >=
                                  100 && (
                                  <span className="rounded-lg border border-[#20dc73]/20 bg-[#20dc73]/5 px-3 py-2 text-xs text-[#20dc73]">
                                    Completed
                                  </span>
                                )}
                            </div>
                          </div>
                        </article>
                      )
                    },
                  )}
                </div>
              </section>
            )
          },
        )}

        {/* UNASSIGNED MATERIALS */}
        {materialsByModule.has(
          "__unassigned__",
        ) && (
          <section className="rounded-xl border border-yellow-500/20 bg-[#020806]/90">
            <div className="border-b border-yellow-500/10 px-5 py-4">
              <div className="text-xs uppercase tracking-wider text-yellow-300/70">
                Unassigned Resources
              </div>

              <h4 className="mt-1 text-base font-semibold text-white">
                Materials awaiting curriculum
                placement
              </h4>

              <p className="mt-1 text-sm text-white/40">
                These materials exist but are not
                currently attached to a curriculum
                module.
              </p>
            </div>

            <div className="space-y-3 p-4">
              {(
                materialsByModule.get(
                  "__unassigned__",
                ) || []
              ).map(
                (material) => {
                  const title =
                    material.title ||
                    "Training Material"

                  return (
                    <div
                      key={
                        material.id ||
                        title
                      }
                      className="rounded-xl border border-[#143b28] bg-black/20 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="font-semibold text-white">
                            {title}
                          </div>

                          <div className="mt-1 text-xs text-white/40">
                            {formatMaterialType(
                              material,
                            )}
                          </div>
                        </div>

                        {material.file_url && (
                          <button
                            type="button"
                            onClick={() =>
                              void openFile(
                                material,
                              )
                            }
                            className="rounded-lg border border-[#143b28] px-3 py-2 text-xs text-white hover:border-[#20dc73]/40 hover:text-[#20dc73]"
                          >
                            Open
                          </button>
                        )}

                        {material.external_url && (
                          <button
                            type="button"
                            onClick={() =>
                              void openExternalResource(
                                material,
                              )
                            }
                            className="rounded-lg border border-[#143b28] px-3 py-2 text-xs text-white hover:border-[#20dc73]/40 hover:text-[#20dc73]"
                          >
                            Open Resource
                          </button>
                        )}
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}