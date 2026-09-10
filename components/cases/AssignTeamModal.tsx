"use client"

import {
  Loader2,
  Search,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type TeamMember = {
  id: string
  profile_id: string | null
  username: string | null
  email: string | null
  role: string
  status: string | null
  full_name: string | null
  organization_id: string | null
  active_assignments: number
  last_assigned_at: string | null
}

type AssignTeamModalProps = {
  caseId: string
  open: boolean
  onClose: () => void
  onAssigned?: () => void
}

function displayName(member: TeamMember) {
  return (
    member.full_name?.trim() ||
    member.username?.trim() ||
    member.email?.trim() ||
    "Unnamed operator"
  )
}

function roleLabel(role: string) {
  return role.replace(/_/g, " ")
}

function isAssignable(member: TeamMember) {
  return (
    Boolean(member.profile_id) &&
    (member.role === "investigator" ||
      member.role === "analyst") &&
    member.status !== "inactive" &&
    member.status !== "suspended" &&
    member.status !== "disabled"
  )
}

export default function AssignTeamModal({
  caseId,
  open,
  onClose,
  onAssigned,
}: AssignTeamModalProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [selectedProfileId, setSelectedProfileId] =
    useState<string>("")
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    async function loadTeam() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/team", {
          credentials: "include",
          cache: "no-store",
        })

        const result =
          (await response.json()) as
            | TeamMember[]
            | { error?: string }

        if (!response.ok) {
          throw new Error(
            result &&
              !Array.isArray(result) &&
              result.error
              ? result.error
              : "Failed to load operators",
          )
        }

        if (!cancelled) {
          setMembers(
            Array.isArray(result) ? result : [],
          )
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load operators",
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadTeam()

    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setSelectedProfileId("")
      setSearch("")
      setError(null)
    }
  }, [open])

  const assignableMembers = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase()

    return members
      .filter(isAssignable)
      .filter((member) => {
        if (!normalizedSearch) {
          return true
        }

        const haystack = [
          member.full_name,
          member.username,
          member.email,
          member.role,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return haystack.includes(normalizedSearch)
      })
      .sort((a, b) => {
        if (a.role !== b.role) {
          return a.role === "investigator" ? -1 : 1
        }

        return displayName(a).localeCompare(
          displayName(b),
        )
      })
  }, [members, search])

  async function assignOperator() {
    if (!selectedProfileId) {
      setError(
        "Select an investigator or analyst first.",
      )
      return
    }

    try {
      setAssigning(true)
      setError(null)

      const response = await fetch(
        "/api/assignments",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            case_id: caseId,
            assigned_to_profile_id:
              selectedProfileId,
          }),
        },
      )

      const result =
        (await response.json()) as {
          error?: string
        }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to assign operator",
        )
      }

      onAssigned?.()
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to assign operator",
      )
    } finally {
      setAssigning(false)
    }
  }

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-[#1b5136] bg-[#06110f] shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between border-b border-[#143b28] px-5 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#20dc73]" />

              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#20dc73]">
                Case Operations
              </p>
            </div>

            <h2 className="mt-2 text-xl font-semibold text-white">
              Assign Operator
            </h2>

            <p className="mt-1 text-sm text-white/45">
              Select an active investigator or
              analyst for this case.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={assigning}
            className="rounded-md p-2 text-white/40 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search investigators and analysts..."
              className="h-11 w-full rounded-md border border-[#143b28] bg-black/30 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/60"
            />
          </div>

          {error ? (
            <div className="rounded-md border border-[#5f2828] bg-[#220d0d] px-4 py-3 text-sm text-[#ff8989]">
              {error}
            </div>
          ) : null}

          <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-[#143b28]">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-white/45">
                <Loader2 className="h-4 w-4 animate-spin text-[#20dc73]" />
                Loading operators...
              </div>
            ) : assignableMembers.length ? (
              <div className="divide-y divide-[#143b28]">
                {assignableMembers.map(
                  (member) => {
                    const selected =
                      selectedProfileId ===
                      member.profile_id

                    return (
                      <button
                        type="button"
                        key={
                          member.profile_id ||
                          member.id
                        }
                        onClick={() =>
                          setSelectedProfileId(
                            member.profile_id ||
                              "",
                          )
                        }
                        className={`flex w-full items-center gap-4 px-4 py-4 text-left transition ${
                          selected
                            ? "bg-[#0a2417]"
                            : "bg-transparent hover:bg-white/[0.025]"
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? "border-[#20dc73]/60 bg-[#20dc73]/10"
                              : "border-[#204f38] bg-black/20"
                          }`}
                        >
                          {selected ? (
                            <ShieldCheck className="h-5 w-5 text-[#20dc73]" />
                          ) : (
                            <span className="text-sm font-bold text-white/45">
                              {displayName(
                                member,
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-white">
                              {displayName(
                                member,
                              )}
                            </p>

                            <span className="rounded border border-[#20dc73]/20 bg-[#071b12] px-2 py-0.5 text-[10px] capitalize tracking-wide text-[#62e79c]">
                              {roleLabel(
                                member.role,
                              )}
                            </span>
                          </div>

                          <p className="mt-1 truncate text-xs text-white/40">
                            {member.email ||
                              member.username ||
                              "No contact address"}
                          </p>

                          <p className="mt-1 text-[11px] text-white/25">
                            {Number(
                              member.active_assignments ??
                                0,
                            )}{" "}
                            active case
                            {Number(
                              member.active_assignments ??
                                0,
                            ) === 1
                              ? ""
                              : "s"}
                          </p>
                        </div>

                        <div
                          className={`h-4 w-4 shrink-0 rounded-full border ${
                            selected
                              ? "border-[#20dc73] bg-[#20dc73] shadow-[0_0_12px_rgba(32,220,115,0.35)]"
                              : "border-white/20"
                          }`}
                        />
                      </button>
                    )
                  },
                )}
              </div>
            ) : (
              <div className="p-8 text-center">
                <UsersEmptyIcon />

                <p className="mt-3 text-sm text-white/45">
                  No assignable operators found.
                </p>

                <p className="mt-1 text-xs text-white/25">
                  Only active investigators and
                  analysts can be assigned to cases.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-[#143b28] pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={assigning}
              className="rounded-md border border-[#254936] px-4 py-2.5 text-sm font-semibold text-white/65 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={assignOperator}
              disabled={
                assigning ||
                !selectedProfileId
              }
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#20dc73] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#3aee89] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {assigning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Assign Operator
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function UsersEmptyIcon() {
  return (
    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[#204f38] bg-black/20 text-white/20">
      <UserPlus className="h-5 w-5" />
    </div>
  )
}