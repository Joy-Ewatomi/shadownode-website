"use client"

import React, {
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
]

type TrainingMaterial = {
  id?: string
  title?: string | null
  description?: string | null
  material_type?: string | null
  file_url?: string | null
  external_url?: string | null
  visibility?: string | null
  file_size?: string | number | null
  created_at?: string | Date | null
}

type MaterialsManagerProps = {
  initialMaterials?: TrainingMaterial[]
  engagementId: string
  canManageMaterials?: boolean
}

export default function MaterialsManager({
  initialMaterials = [],
  engagementId,
  canManageMaterials = false,
}: MaterialsManagerProps) {
  const [materials, setMaterials] =
    useState<TrainingMaterial[]>(
      initialMaterials,
    )

  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [uploading, setUploading] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const [success, setSuccess] =
    useState<string | null>(null)

  const fileRef =
    useRef<HTMLInputElement | null>(null)

  async function createMaterial(
    e: React.FormEvent,
  ) {
    e.preventDefault()

    setError(null)
    setSuccess(null)

    const trimmedTitle = title.trim()
    const trimmedUrl = url.trim()

    if (!trimmedTitle && !trimmedUrl) {
      setError(
        "Provide a material title or an external URL.",
      )
      return
    }

    try {
      const res = await fetch(
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
            external_url:
              trimmedUrl || null,
            visibility: "private",
          }),
        },
      )

      const payload = await res.json()

      if (!res.ok) {
        throw new Error(
          payload?.error ||
            "Failed to create material",
        )
      }

      if (!payload?.material) {
        throw new Error(
          "The server did not return the created material.",
        )
      }

      setMaterials((current) => [
        payload.material,
        ...current,
      ])

      setTitle("")
      setUrl("")

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
    const file = e.target.files?.[0]

    if (!file) {
      return
    }

    setError(null)
    setSuccess(null)

    if (!canManageMaterials) {
      setError(
        "You do not have permission to upload training materials.",
      )

      if (fileRef.current) {
        fileRef.current.value = ""
      }

      return
    }

    if (!ALLOWED_MIMES.includes(file.type)) {
      setError(
        "File type not allowed. Please select a supported training material.",
      )

      if (fileRef.current) {
        fileRef.current.value = ""
      }

      return
    }

    const duplicate = materials.some(
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
        fileRef.current.value = ""
      }

      return
    }

    setUploading(true)

    try {
      const supabase = createClient()

      const timestamp = Date.now()

      const safeName = file.name.replace(
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
              contentType: file.type,
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
              material_type:
                file.type,
              file_url: filePath,
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

      if (!payload?.material) {
        throw new Error(
          "The server did not return the uploaded material.",
        )
      }

      setMaterials((current) => [
        payload.material,
        ...current,
      ])

      setTitle("")

      if (fileRef.current) {
        fileRef.current.value = ""
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Training Materials
          </h3>

          <p className="mt-1 text-sm text-white/50">
            Access resources provided for this
            training engagement.
          </p>
        </div>

        {canManageMaterials && (
          <div className="text-xs uppercase tracking-wider text-[#20dc73]/70">
            Trainer Material Management
          </div>
        )}
      </div>

      {canManageMaterials && (
        <section className="rounded-xl border border-[#143b28] bg-[#020806]/90 p-5">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#20dc73]/70">
              Add Material
            </div>

            <p className="mt-1 text-sm text-white/50">
              Upload a training file or add an
              external resource.
            </p>
          </div>

          <form
            onSubmit={createMaterial}
            className="mt-4 space-y-3"
          >
            <input
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="Material title"
              disabled={uploading}
              className="w-full rounded-lg border border-[#143b28] bg-[#020806] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#20dc73]/50"
            />

            <input
              value={url}
              onChange={(e) =>
                setUrl(e.target.value)
              }
              placeholder="External URL"
              disabled={uploading}
              className="w-full rounded-lg border border-[#143b28] bg-[#020806] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#20dc73]/50"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={uploading}
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
                disabled={uploading}
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
              Excel, CSV, TXT, PNG, JPG, WebP and
              ZIP.
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

      <div className="space-y-3">
        {materials.length === 0 && (
          <div className="rounded-xl border border-[#143b28] bg-[#020806]/90 p-5">
            <p className="text-sm text-white/50">
              No training materials have been added
              yet.
            </p>
          </div>
        )}

        {materials.map((material) => {
          const title =
            material.title ||
            (material.file_url
              ? material.file_url
                  .split("/")
                  .pop()
              : "Training Material")

          const materialType =
            material.material_type ||
            (material.external_url
              ? "External Resource"
              : "File")

          return (
            <div
              key={
                material.id ||
                material.file_url ||
                material.external_url ||
                title
              }
              className="rounded-xl border border-[#143b28] bg-[#020806]/90 p-5 transition hover:border-[#20dc73]/30"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-white">
                    {title}
                  </div>

                  <div className="mt-1 text-xs text-white/50">
                    {materialType}
                  </div>

                  {material.file_url && (
                    <div className="mt-1 text-xs text-white/40">
                      Size:{" "}
                      {material.file_size ??
                        "Unknown"}
                    </div>
                  )}

                  {material.created_at && (
                    <div className="mt-1 text-xs text-white/40">
                      {new Date(
                        String(
                          material.created_at,
                        ),
                      ).toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {material.file_url && (
                    <a
                      href={`/api/storage/evidence?path=${encodeURIComponent(
                        material.file_url,
                      )}`}
                      className="rounded-lg border border-[#143b28] bg-black/20 px-3 py-2 text-xs text-white transition hover:border-[#20dc73]/40 hover:text-[#20dc73]"
                    >
                      Open
                    </a>
                  )}

                  {material.external_url && (
                    <a
                      href={
                        material.external_url
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-[#143b28] bg-black/20 px-3 py-2 text-xs text-white transition hover:border-[#20dc73]/40 hover:text-[#20dc73]"
                    >
                      Open Resource
                    </a>
                  )}

                  <div className="text-xs uppercase tracking-wider text-white/30">
                    {material.visibility ||
                      "private"}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}