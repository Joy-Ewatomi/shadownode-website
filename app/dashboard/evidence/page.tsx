import Link from "next/link"
import { redirect } from "next/navigation"

import {
  getCurrentUser,
  isAdminRole,
} from "@/lib/auth"

import { query } from "@/lib/db"

import {
  profileIdForUser,
} from "@/lib/investigation-workspace"

type EvidencePageProps = {
  searchParams?: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >
}

type EvidenceRow = {
  id: string
  case_id: string

  case_number: string
  case_title: string

  file_name: string
  file_size: number | null
  file_type: string | null
  file_hash: string | null
  evidence_type: string | null
  description: string | null

  uploaded_by: string | null
  created_at: string
}

function firstParam(
  value:
    | string
    | string[]
    | undefined,
) {
  return Array.isArray(value)
    ? value[0]
    : value
}

function formatDate(
  value: string,
) {
  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return date.toLocaleString(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  )
}

function formatFileSize(
  bytes: number | null,
) {
  if (
    bytes === null ||
    bytes === undefined
  ) {
    return "Unknown"
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`
  }

  if (
    bytes <
    1024 * 1024 * 1024
  ) {
    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`
  }

  return `${(
    bytes /
    (1024 * 1024 * 1024)
  ).toFixed(1)} GB`
}

function formatLabel(
  value: string | null,
) {
  if (!value) {
    return "Unknown"
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    )
}

function evidenceTypeClasses(
  value: string | null,
) {
  switch (
    value?.toLowerCase()
  ) {
    case "document":
      return "border-blue-400/20 bg-blue-400/10 text-blue-300"

    case "image":
    case "photo":
      return "border-purple-400/20 bg-purple-400/10 text-purple-300"

    case "video":
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"

    case "audio":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300"

    case "forensic":
    case "forensic_image":
      return "border-red-400/20 bg-red-400/10 text-red-300"

    default:
      return "border-[#20dc73]/20 bg-[#20dc73]/5 text-[#62e79c]"
  }
}

function Info({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded border border-[#143b28] bg-black/25 p-3">
      <p className="text-[9px] uppercase tracking-[0.12em] text-white/30">
        {label}
      </p>

      <p className="mt-1 break-words text-xs text-white/70">
        {value}
      </p>
    </div>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-md border border-[#143b28] bg-[#06110f] p-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-[#20dc73]">
        {value}
      </p>
    </div>
  )
}

export default async function EvidencePage({
  searchParams,
}: EvidencePageProps) {
  const user =
    await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  /*
   * The global Evidence Vault is an
   * internal operational area.
   *
   * Clients should use their client-safe
   * case evidence views instead.
   */
  if (
    user.role === "client"
  ) {
    redirect("/403")
  }

  const profileId =
    await profileIdForUser(
      user.id,
    )

  const isAdmin =
    isAdminRole(
      user.role,
    )

  const params =
    searchParams
      ? await searchParams
      : {}

  const search =
    firstParam(
      params.search,
    )
      ?.trim() || ""

  const type =
    firstParam(
      params.type,
    )
      ?.trim() || ""

  const uploadedBy =
    firstParam(
      params.uploaded_by,
    )
      ?.trim() || ""

  /*
   * The core authorization rule remains:
   *
   * Administrator / Super Administrator:
   *   all evidence
   *
   * Investigator / Analyst:
   *   evidence belonging to assigned cases
   */

  const { rows } =
    await query<EvidenceRow>(
      `
        SELECT
          ff.id,
          ff.case_id,

          c.case_number,
          c.title AS case_title,

          ff.file_name,
          ff.file_size,
          ff.file_type,
          ff.file_hash,
          ff.evidence_type,
          ff.description,

          uploader.username
            AS uploaded_by,

          ff.created_at

        FROM forensic_files ff

        INNER JOIN cases c
          ON c.id = ff.case_id

        LEFT JOIN user_profiles uploader_profile
          ON uploader_profile.id =
            ff.uploaded_by

        LEFT JOIN app_users uploader
          ON uploader.id =
            uploader_profile.user_id

        WHERE
          (
            $1::boolean = TRUE

            OR c.client_profile_id = $2::uuid

            OR c.assigned_to = $2::uuid

            OR EXISTS (
              SELECT 1
              FROM case_assignments assigned_case
              WHERE
                assigned_case.case_id = c.id
                AND assigned_case.assigned_to = $2::uuid
                AND assigned_case.removed_at IS NULL
                AND COALESCE(
                  assigned_case.status,
                  'assigned'
                ) IN (
                  'assigned',
                  'approved',
                  'active',
                  'accepted'
                )
            )
          )

          AND (
            $3::text = ''
            OR
            c.case_number ILIKE '%' || $3 || '%'
            OR
            c.title ILIKE '%' || $3 || '%'
            OR
            ff.file_name ILIKE '%' || $3 || '%'
            OR
            COALESCE(
              ff.evidence_type,
              ''
            ) ILIKE '%' || $3 || '%'
            OR
            COALESCE(
              uploader.username,
              ''
            ) ILIKE '%' || $3 || '%'
          )

          AND (
            $4::text = ''
            OR COALESCE(
              ff.evidence_type,
              ''
            ) = $4
          )

          AND (
            $5::text = ''
            OR COALESCE(
              uploader.username,
              ''
            ) = $5
          )

        ORDER BY
          ff.created_at DESC
      `,
      [
        isAdmin,
        profileId,
        search,
        type,
        uploadedBy,
      ],
    )

  const totalFiles =
    rows.length

  const hashedFiles =
    rows.filter(
      (item) =>
        Boolean(
          item.file_hash,
        ),
    ).length

  const uniqueCases =
    new Set(
      rows.map(
        (item) =>
          item.case_id,
      ),
    ).size

  const totalBytes =
    rows.reduce(
      (
        total,
        item,
      ) =>
        total +
        Number(
          item.file_size ||
            0,
        ),
      0,
    )

  const evidenceTypes =
    Array.from(
      new Set(
        rows
          .map(
            (item) =>
              item.evidence_type,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          ),
      ),
    ).sort()

  const uploaders =
    Array.from(
      new Set(
        rows
          .map(
            (item) =>
              item.uploaded_by,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          ),
      ),
    ).sort()

  return (
    <main className="space-y-6">
      {/* ======================================================
          HEADER
          ====================================================== */}

      <header className="border-b border-[#143b28] pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
              Evidence Vault
            </p>

            <h1 className="mt-3 text-3xl font-bold text-white">
              Global Evidence Vault
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
              Central operational index of authenticated forensic
              files across cases you are authorized to access.
            </p>
          </div>

          <div className="rounded-md border border-[#20dc73]/20 bg-[#071b12] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#20dc73]">
              Access Scope
            </p>

            <p className="mt-1 text-xs text-white/45">
              {isAdmin
                ? "Global administrative access"
                : "Assigned case access"}
            </p>
          </div>
        </div>
      </header>

      {/* ======================================================
          METRICS
          ====================================================== */}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Evidence Files"
          value={
            totalFiles
          }
        />

        <Metric
          label="Cases Represented"
          value={
            uniqueCases
          }
        />

        <Metric
          label="Hashed Files"
          value={
            hashedFiles
          }
        />

        <Metric
          label="Size"
          value={
            Math.round(
              totalBytes /
                (1024 * 1024),
            )
          }
        />
      </section>

      {/* ======================================================
          FILTERS
          ====================================================== */}

      <section className="rounded-xl border border-[#143b28] bg-[#06110f] p-4">
        <form
          method="GET"
          className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_200px_auto]"
        >
          <input
            type="search"
            name="search"
            defaultValue={
              search
            }
            placeholder="Search case number, case title, filename, evidence type, uploader..."
            className="h-11 rounded-md border border-[#143b28] bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/50"
          />

          <select
            name="type"
            defaultValue={
              type
            }
            className="h-11 rounded-md border border-[#143b28] bg-[#06110f] px-3 text-sm text-white outline-none focus:border-[#20dc73]/50"
          >
            <option value="">
              All Evidence Types
            </option>

            {evidenceTypes.map(
              (
                value,
              ) => (
                <option
                  key={value}
                  value={value}
                >
                  {formatLabel(
                    value,
                  )}
                </option>
              ),
            )}
          </select>

          <select
            name="uploaded_by"
            defaultValue={
              uploadedBy
            }
            className="h-11 rounded-md border border-[#143b28] bg-[#06110f] px-3 text-sm text-white outline-none focus:border-[#20dc73]/50"
          >
            <option value="">
              All Uploaders
            </option>

            {uploaders.map(
              (
                value,
              ) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              ),
            )}
          </select>

          <button
            type="submit"
            className="h-11 rounded-md border border-[#20dc73]/25 bg-[#20dc73]/5 px-5 text-sm font-semibold text-[#62e79c] transition hover:bg-[#20dc73]/10"
          >
            Filter
          </button>
        </form>
      </section>

      {/* ======================================================
          VAULT
          ====================================================== */}

      <section className="rounded-xl border border-[#143b28] bg-[#06110f]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#143b28] px-5 py-4">
          <div>
            <h2 className="font-semibold text-white">
              Vault Files
            </h2>

            <p className="mt-1 text-xs text-white/30">
              {rows.length} matching evidence record
              {rows.length ===
              1
                ? ""
                : "s"}
            </p>
          </div>

          <Link
            href="/dashboard/evidence/uploads"
            className="rounded-md border border-[#254936] px-3 py-2 text-xs font-semibold text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            Evidence Uploads →
          </Link>
        </div>

        {!rows.length ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-white/35">
              No evidence records match this view.
            </p>

            <p className="mt-1 text-xs text-white/20">
              Adjust the filters or select another case.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#143b28]">
            {rows.map(
              (item) => (
                <Link
                  key={
                    item.id
                  }
                  href={`/dashboard/cases/${item.case_id}/evidence`}
                  className="group block p-5 transition hover:bg-white/[0.025]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="break-all font-mono text-[11px] uppercase tracking-[0.14em] text-[#20dc73]/75">
                        {
                          item.case_number
                        }
                      </p>

                      <h3 className="mt-2 break-words text-base font-semibold text-white">
                        {
                          item.file_name
                        }
                      </h3>

                      <p className="mt-1 break-words text-sm text-white/40">
                        {
                          item.case_title
                        }
                      </p>

                      {item.description ? (
                        <p className="mt-3 line-clamp-2 break-words text-xs leading-5 text-white/30">
                          {
                            item.description
                          }
                        </p>
                      ) : null}
                    </div>

                    <span
                      className={`w-fit shrink-0 rounded border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${evidenceTypeClasses(
                        item.evidence_type,
                      )}`}
                    >
                      {formatLabel(
                        item.evidence_type ||
                          "evidence",
                      )}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Info
                      label="File Type"
                      value={
                        item.file_type ||
                        "Unknown"
                      }
                    />

                    <Info
                      label="Size"
                      value={formatFileSize(
                        item.file_size,
                      )}
                    />

                    <Info
                      label="Uploaded By"
                      value={
                        item.uploaded_by ||
                        "Unknown"
                      }
                    />

                    <Info
                      label="Uploaded"
                      value={formatDate(
                        item.created_at,
                      )}
                    />
                  </div>

                  {item.file_hash ? (
                    <div className="mt-4 rounded border border-[#143b28] bg-black/20 p-3">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-white/25">
                        SHA-256
                      </p>

                      <p className="mt-1 break-all font-mono text-[10px] leading-5 text-white/45">
                        {
                          item.file_hash
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded border border-amber-500/10 bg-amber-500/[0.025] p-3 text-[10px] uppercase tracking-[0.11em] text-amber-300/45">
                      No file hash recorded
                    </div>
                  )}

                  <div className="mt-4 text-right text-[10px] uppercase tracking-[0.12em] text-[#20dc73]/35 transition group-hover:text-[#20dc73]">
                    Open Case Evidence →
                  </div>
                </Link>
              ),
            )}
          </div>
        )}
      </section>

      {/* ======================================================
          RELATED TOOLS
          ====================================================== */}

      <section className="grid gap-3 sm:grid-cols-3">
        <ToolLink
          href="/dashboard/evidence/uploads"
          title="Uploads"
          description="Review and manage evidence ingestion."
        />

        <ToolLink
          href="/dashboard/evidence/chain-of-custody"
          title="Chain of Custody"
          description="Track evidence handling and custody records."
        />

        <ToolLink
          href="/dashboard/evidence/hashes"
          title="Hash Registry"
          description="Review evidence integrity hashes."
        />
      </section>
    </main>
  )
}

function ToolLink({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-[#143b28] bg-[#06110f] p-4 transition hover:border-[#20dc73]/35 hover:bg-[#071510]"
    >
      <p className="text-sm font-semibold text-white/75">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-white/30">
        {description}
      </p>

      <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-[#20dc73]/45">
        Open →
      </p>
    </Link>
  )
}