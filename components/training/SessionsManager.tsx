"use client"

import React, {
  useMemo,
  useState,
} from "react"

type SessionAttendee = {
  user_id?: string | null
  profile_id?: string | null
  partstat?: string | null
  responded_at?: string | null
}

type TrainingModule = {
  id: string
  title?: string | null
  module_order?: number | null
}

type TrainingSession = {
  id: string
  module_id?: string | null
  trainer_id?: string | null

  session_notes?: string | null
  session_type?: string | null

  scheduled_at?: string | Date | null
  duration_minutes?: number | null

  meeting_url?: string | null
  location?: string | null

  status?: string | null
  attendance_status?: string | null

  attendees?: SessionAttendee[]

  calendar_synced?: boolean

  created_at?: string | null
  updated_at?: string | null
}

type SessionsManagerProps = {
  initialSessions?: TrainingSession[]
  engagementId: string

  currentUserId?: string | null
  currentProfileId?: string | null

  canManageSessions?: boolean
  isClient?: boolean

  modules?: TrainingModule[]
}

type RsvpValue =
  | "ACCEPTED"
  | "TENTATIVE"
  | "DECLINED"

type DurationParts = {
  hours: number
  minutes: number
}

const SESSION_TYPES = [
  {
    value: "live_online",
    label: "Live Online",
  },
  {
    value: "onsite",
    label: "Onsite",
  },
  {
    value: "hybrid",
    label: "Hybrid",
  },
  {
    value: "workshop",
    label: "Workshop",
  },
  {
    value: "practical",
    label: "Practical",
  },
  {
    value: "assessment",
    label: "Assessment",
  },
]

function formatDate(
  value: string | Date | null | undefined,
) {
  if (!value) {
    return "TBD"
  }

  const date = new Date(String(value))

  if (Number.isNaN(date.getTime())) {
    return "TBD"
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function formatDateInput(
  value: string | Date | null | undefined,
) {
  if (!value) {
    return ""
  }

  const date = new Date(String(value))

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const pad = (number: number) =>
    String(number).padStart(2, "0")

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(
    date.getDate(),
  )}T${pad(
    date.getHours(),
  )}:${pad(
    date.getMinutes(),
  )}`
}

function normalizeRsvp(
  value?: string | null,
): RsvpValue | null {
  if (!value) {
    return null
  }

  const normalized = value.toUpperCase()

  if (
    normalized === "ACCEPTED" ||
    normalized === "TENTATIVE" ||
    normalized === "DECLINED"
  ) {
    return normalized
  }

  return null
}

function formatRsvp(
  value: RsvpValue,
) {
  switch (value) {
    case "ACCEPTED":
      return "Accepted"

    case "TENTATIVE":
      return "Tentative"

    case "DECLINED":
      return "Declined"

    default:
      return value
  }
}

function formatSessionType(
  value?: string | null,
) {
  if (!value) {
    return "Training Session"
  }

  const found = SESSION_TYPES.find(
    (item) => item.value === value,
  )

  if (found) {
    return found.label
  }

  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase(),
    )
}

function formatStatus(
  value?: string | null,
) {
  const normalized = String(
    value || "scheduled",
  ).replace(/_/g, " ")

  return normalized.replace(
    /\b\w/g,
    (letter) => letter.toUpperCase(),
  )
}

function getStatusClass(
  value?: string | null,
) {
  const normalized = String(
    value || "scheduled",
  ).toLowerCase()

  if (normalized === "completed") {
    return "border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]"
  }

  if (normalized === "cancelled") {
    return "border-red-500/30 bg-red-500/10 text-red-300"
  }

  if (normalized === "rescheduled") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
  }

  return "border-[#143b28] bg-black/20 text-white/55"
}

function getAttendanceClass(
  value?: string | null,
) {
  const normalized = String(
    value || "pending",
  ).toLowerCase()

  if (normalized === "attended") {
    return "text-[#20dc73]"
  }

  if (normalized === "absent") {
    return "text-red-300"
  }

  return "text-yellow-300"
}

function formatDuration(
  minutes?: number | null,
) {
  const total = Number(minutes)

  if (
    !Number.isFinite(total) ||
    total <= 0
  ) {
    return "Not specified"
  }

  const rounded = Math.round(total)
  const hours = Math.floor(rounded / 60)
  const remainingMinutes = rounded % 60

  if (hours === 0) {
    return `${remainingMinutes} ${
      remainingMinutes === 1
        ? "minute"
        : "minutes"
    }`
  }

  if (remainingMinutes === 0) {
    return `${hours} ${
      hours === 1
        ? "hour"
        : "hours"
    }`
  }

  return `${hours} ${
    hours === 1
      ? "hour"
      : "hours"
  } ${remainingMinutes} minutes`
}

function durationToParts(
  durationMinutes?: number | null,
): DurationParts {
  const total = Number(
    durationMinutes,
  )

  if (
    !Number.isFinite(total) ||
    total <= 0
  ) {
    return {
      hours: 1,
      minutes: 0,
    }
  }

  const rounded = Math.round(total)

  return {
    hours: Math.floor(
      rounded / 60,
    ),
    minutes: rounded % 60,
  }
}

function durationPartsToMinutes(
  hours: string,
  minutes: string,
) {
  const parsedHours =
    Number(hours)

  const parsedMinutes =
    Number(minutes)

  if (
    !Number.isFinite(
      parsedHours,
    ) ||
    !Number.isFinite(
      parsedMinutes,
    )
  ) {
    return 0
  }

  return (
    Math.max(
      0,
      Math.floor(parsedHours),
    ) *
      60 +
    Math.max(
      0,
      Math.floor(parsedMinutes),
    )
  )
}

async function readJsonResponse(
  response: Response,
) {
  const text =
    await response.text()

  if (!text.trim()) {
    throw new Error(
      `Server returned an empty response (${response.status}).`,
    )
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(
      `Server returned an invalid JSON response (${response.status}).`,
    )
  }
}

export default function SessionsManager({
  initialSessions = [],
  engagementId,
  currentUserId = null,
  currentProfileId = null,
  canManageSessions = false,
  isClient = false,
  modules = [],
}: SessionsManagerProps) {
  const [sessions, setSessions] =
    useState<TrainingSession[]>(
      initialSessions,
    )

  /*
   * ================================================================
   * CREATE SESSION STATE
   * ================================================================
   */

  const [title, setTitle] =
    useState("")

  const [scheduledAt, setScheduledAt] =
    useState("")

  const [durationHours, setDurationHours] =
    useState("1")

  const [durationMinutesPart, setDurationMinutesPart] =
    useState("0")

  const [sessionType, setSessionType] =
    useState("live_online")

  const [moduleId, setModuleId] =
    useState("")

  const [meetingUrl, setMeetingUrl] =
    useState("")

  const [location, setLocation] =
    useState("")

  /*
   * ================================================================
   * EDIT SESSION STATE
   * ================================================================
   */

  const [editingSession, setEditingSession] =
    useState<TrainingSession | null>(
      null,
    )

  const [editTitle, setEditTitle] =
    useState("")

  const [editScheduledAt, setEditScheduledAt] =
    useState("")

  const [editDurationHours, setEditDurationHours] =
    useState("1")

  const [editDurationMinutes, setEditDurationMinutes] =
    useState("0")

  const [editModuleId, setEditModuleId] =
    useState("")

  const [editMeetingUrl, setEditMeetingUrl] =
    useState("")

  const [editLocation, setEditLocation] =
    useState("")

  /*
   * ================================================================
   * GENERAL STATE
   * ================================================================
   */

  const [loading, setLoading] =
    useState(false)

  const [actionSessionId, setActionSessionId] =
    useState<string | null>(null)

  const [calendarSessionId, setCalendarSessionId] =
    useState<string | null>(null)

  const [error, setError] =
    useState<string | null>(null)

  const [success, setSuccess] =
    useState<string | null>(null)

  const [showCreateForm, setShowCreateForm] =
    useState(false)

  const sortedSessions =
    useMemo(() => {
      return [...sessions].sort(
        (a, b) => {
          const aTime =
            a.scheduled_at
              ? new Date(
                  String(
                    a.scheduled_at,
                  ),
                ).getTime()
              : Number.MAX_SAFE_INTEGER

          const bTime =
            b.scheduled_at
              ? new Date(
                  String(
                    b.scheduled_at,
                  ),
                ).getTime()
              : Number.MAX_SAFE_INTEGER

          return aTime - bTime
        },
      )
    }, [sessions])

  const upcomingSessions =
    useMemo(() => {
      const now = Date.now()

      return sessions.filter(
        (session) => {
          if (
            String(
              session.status || "",
            ).toLowerCase() ===
            "cancelled"
          ) {
            return false
          }

          if (!session.scheduled_at) {
            return false
          }

          const time =
            new Date(
              String(
                session.scheduled_at,
              ),
            ).getTime()

          return (
            !Number.isNaN(time) &&
            time >= now
          )
        },
      ).length
    }, [sessions])

  const completedSessions =
    useMemo(() => {
      return sessions.filter(
        (session) =>
          String(
            session.status || "",
          ).toLowerCase() ===
          "completed",
      ).length
    }, [sessions])

  const sessionsByModule =
    useMemo(() => {
      const moduleMap = new Map<
        string,
        TrainingSession[]
      >()

      for (const session of sortedSessions) {
        const moduleKey =
          session.module_id ||
          "__unassigned__"

        const current =
          moduleMap.get(moduleKey) || []

        current.push(session)
        moduleMap.set(
          moduleKey,
          current,
        )
      }

      return moduleMap
    }, [sortedSessions])

  /*
   * ================================================================
   * FORM RESET
   * ================================================================
   */

  function resetCreateForm() {
    setTitle("")
    setScheduledAt("")
    setDurationHours("1")
    setDurationMinutesPart("0")
    setSessionType("live_online")
    setModuleId("")
    setMeetingUrl("")
    setLocation("")
  }

  /*
   * ================================================================
   * EDIT MODAL
   * ================================================================
   */

  function openEditModal(
    session: TrainingSession,
  ) {
    const duration =
      durationToParts(
        session.duration_minutes,
      )

    setEditingSession(session)

    setEditTitle(
      session.session_notes ||
        "",
    )

    setEditScheduledAt(
      formatDateInput(
        session.scheduled_at,
      ),
    )

    setEditDurationHours(
      String(duration.hours),
    )

    setEditDurationMinutes(
      String(duration.minutes),
    )

    setEditModuleId(
      session.module_id || "",
    )

    setEditMeetingUrl(
      session.meeting_url ||
        "",
    )

    setEditLocation(
      session.location ||
        "",
    )

    setError(null)
    setSuccess(null)
  }

  function closeEditModal() {
    if (loading) {
      return
    }

    setEditingSession(null)

    setEditTitle("")
    setEditScheduledAt("")
    setEditDurationHours("1")
    setEditDurationMinutes("0")
    setEditModuleId("")
    setEditMeetingUrl("")
    setEditLocation("")
  }

  /*
   * ================================================================
   * CREATE SESSION
   * ================================================================
   */

  async function createSession(
    e: React.FormEvent,
  ) {
    e.preventDefault()

    setError(null)
    setSuccess(null)

    const trimmedTitle =
      title.trim()

    const trimmedScheduledAt =
      scheduledAt.trim()

    const trimmedMeetingUrl =
      meetingUrl.trim()

    const trimmedLocation =
      location.trim()

    if (!trimmedTitle) {
      setError(
        "Please provide a session title or description.",
      )
      return
    }

    if (!trimmedScheduledAt) {
      setError(
        "Please provide a scheduled date and time.",
      )
      return
    }

    const duration =
      durationPartsToMinutes(
        durationHours,
        durationMinutesPart,
      )

    if (
      !Number.isFinite(
        duration,
      ) ||
      duration <= 0
    ) {
      setError(
        "Please provide a valid session duration.",
      )
      return
    }

    if (!moduleId) {
      setError(
        "Please select the curriculum module this session belongs to.",
      )
      return
    }

    setLoading(true)

    try {
      const res =
        await fetch(
          `/api/training/${engagementId}/schedule`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              session_notes:
                trimmedTitle,

              scheduled_at:
                trimmedScheduledAt,

              duration_minutes:
                duration,

              session_type:
                sessionType,

              module_id:
                moduleId,

              meeting_url:
                trimmedMeetingUrl ||
                null,

              location:
                trimmedLocation ||
                null,

              status:
                "scheduled",

              attendance_status:
                "pending",
            }),
          },
        )

      const payload =
        await readJsonResponse(
          res,
        )

      if (!res.ok) {
        throw new Error(
          payload?.error ||
            "Failed to create session",
        )
      }

      if (!payload?.session) {
        throw new Error(
          "The server did not return the created session.",
        )
      }

      setSessions(
        (current) => [
          ...current,
          {
            ...payload.session,
            calendar_synced:
              Boolean(
                payload.session
                  ?.calendar_synced,
              ),
          },
        ],
      )

      resetCreateForm()

      setShowCreateForm(false)

      setSuccess(
        "Training session scheduled successfully.",
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create session",
      )
    } finally {
      setLoading(false)
    }
  }

  /*
   * ================================================================
   * SAVE EDITED SESSION
   * ================================================================
   */

  async function saveEditedSession(
    e: React.FormEvent,
  ) {
    e.preventDefault()

    if (!editingSession) {
      return
    }

    setError(null)
    setSuccess(null)

    const trimmedTitle =
      editTitle.trim()

    const trimmedScheduledAt =
      editScheduledAt.trim()

    const trimmedMeetingUrl =
      editMeetingUrl.trim()

    const trimmedLocation =
      editLocation.trim()

    if (!trimmedTitle) {
      setError(
        "Please provide a session title or description.",
      )
      return
    }

    if (!trimmedScheduledAt) {
      setError(
        "Please provide a scheduled date and time.",
      )
      return
    }

    const duration =
      durationPartsToMinutes(
        editDurationHours,
        editDurationMinutes,
      )

    if (
      !Number.isFinite(
        duration,
      ) ||
      duration <= 0
    ) {
      setError(
        "Session duration must be greater than zero.",
      )
      return
    }

    if (
      Number(
        editDurationMinutes,
      ) > 59
    ) {
      setError(
        "Minutes must be between 0 and 59.",
      )
      return
    }

    if (!editModuleId) {
      setError(
        "Please select the curriculum module this session belongs to.",
      )
      return
    }

    setActionSessionId(
      editingSession.id,
    )

    try {
      const updates: Record<
        string,
        unknown
      > = {
        module_id:
          editModuleId,

        session_notes:
          trimmedTitle,

        scheduled_at:
          trimmedScheduledAt ||
          null,

        duration_minutes:
          duration,

        meeting_url:
          trimmedMeetingUrl ||
          null,

        location:
          trimmedLocation ||
          null,
      }

      const res =
        await fetch(
          `/api/training/${engagementId}/schedule`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              sessionId:
                editingSession.id,
              updates,
            }),
          },
        )

      const payload =
        await readJsonResponse(
          res,
        )

      if (!res.ok) {
        throw new Error(
          payload?.error ||
            "Failed to update session",
        )
      }

      if (!payload?.session) {
        throw new Error(
          "The server did not return the updated session.",
        )
      }

      setSessions(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              editingSession.id
                ? {
                    ...payload.session,

                    /*
                     * Preserve persistent calendar state
                     * if the schedule API does not include it.
                     */
                    calendar_synced:
                      payload.session
                        ?.calendar_synced ??
                      item.calendar_synced ??
                      false,
                  }
                : item,
          ),
      )

      setEditingSession(null)

      setSuccess(
        "Training session updated successfully.",
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update session",
      )
    } finally {
      setActionSessionId(null)
    }
  }

  /*
   * ================================================================
   * GOOGLE CALENDAR
   * ================================================================
   */

  async function addToGoogleCalendar(
    sessionId: string,
  ) {
    if (!isClient) {
      setError(
        "Only the client can add a training session to their Google Calendar.",
      )
      return
    }

    const session =
      sessions.find(
        (item) =>
          item.id === sessionId,
      )

    if (session?.calendar_synced) {
      setSuccess(
        "This training session is already added to your Google Calendar.",
      )
      return
    }

    setError(null)
    setSuccess(null)

    setCalendarSessionId(
      sessionId,
    )

    try {
      const res =
        await fetch(
          `/api/training/session/${sessionId}/calendar`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
          },
        )

      const payload =
        await readJsonResponse(
          res,
        )

      if (res.status === 409) {
        throw new Error(
          "Google Calendar is not connected to your ShadowNode account. Connect Google Calendar first, then try again.",
        )
      }

      if (!res.ok) {
        throw new Error(
          payload?.error ||
            "Failed to add session to Google Calendar.",
        )
      }

      if (!payload?.synced) {
        throw new Error(
          payload?.reason ||
            "The session could not be synced to Google Calendar.",
        )
      }

      setSessions(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              sessionId
                ? {
                    ...item,
                    calendar_synced:
                      true,
                  }
                : item,
          ),
      )

      setSuccess(
        "Training session added to your Google Calendar.",
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to add session to Google Calendar.",
      )
    } finally {
      setCalendarSessionId(
        null,
      )
    }
  }

  /*
   * ================================================================
   * CLIENT RSVP
   * ================================================================
   */

  async function submitRsvp(
    sessionId: string,
    partstat: RsvpValue,
  ) {
    if (!isClient) {
      setError(
        "Only the client can respond to a training session.",
      )
      return
    }

    if (
      !currentUserId &&
      !currentProfileId
    ) {
      setError(
        "Your client profile could not be identified.",
      )
      return
    }

    const currentSession =
      sessions.find(
        (session) =>
          session.id ===
          sessionId,
      )

    const existingAttendee =
      currentSession?.attendees?.find(
        (attendee) => {
          const matchesUser =
            Boolean(
              currentUserId &&
                attendee.user_id ===
                  currentUserId,
            )

          const matchesProfile =
            Boolean(
              currentProfileId &&
                attendee.profile_id ===
                  currentProfileId,
            )

          return (
            matchesUser ||
            matchesProfile
          )
        },
      )

    const existingPartstat =
      normalizeRsvp(
        existingAttendee?.partstat,
      )

    if (existingPartstat) {
      setError(
        `You have already responded to this session: ${formatRsvp(
          existingPartstat,
        )}.`,
      )
      return
    }

    setError(null)
    setSuccess(null)

    setActionSessionId(
      sessionId,
    )

    try {
      const res =
        await fetch(
          `/api/training/session/${sessionId}/rsvp`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              partstat,
            }),
          },
        )

      const payload =
        await readJsonResponse(
          res,
        )

      if (res.status === 409) {
        const serverPartstat =
          normalizeRsvp(
            payload?.partstat,
          )

        setSessions(
          (current) =>
            current.map(
              (session) => {
                if (
                  session.id !==
                  sessionId
                ) {
                  return session
                }

                const attendees =
                  session.attendees ||
                  []

                const existingIndex =
                  attendees.findIndex(
                    (
                      attendee,
                    ) => {
                      const matchesUser =
                        Boolean(
                          currentUserId &&
                            attendee.user_id ===
                              currentUserId,
                        )

                      const matchesProfile =
                        Boolean(
                          currentProfileId &&
                            attendee.profile_id ===
                              currentProfileId,
                        )

                      return (
                        matchesUser ||
                        matchesProfile
                      )
                    },
                  )

                if (
                  existingIndex ===
                  -1
                ) {
                  return {
                    ...session,
                    attendees: [
                      ...attendees,
                      {
                        user_id:
                          currentUserId,
                        profile_id:
                          currentProfileId,
                        partstat:
                          serverPartstat ||
                          undefined,
                        responded_at:
                          new Date().toISOString(),
                      },
                    ],
                  }
                }

                return {
                  ...session,
                  attendees:
                    attendees.map(
                      (
                        attendee,
                        index,
                      ) =>
                        index ===
                        existingIndex
                          ? {
                              ...attendee,
                              partstat:
                                serverPartstat ||
                                attendee.partstat,
                            }
                          : attendee,
                    ),
                }
              },
            ),
        )

        throw new Error(
          serverPartstat
            ? `You have already responded: ${formatRsvp(
                serverPartstat,
              )}.`
            : "You have already responded to this training session.",
        )
      }

      if (!res.ok) {
        throw new Error(
          payload?.error ||
            "Failed to update RSVP",
        )
      }

      if (!payload?.success) {
        throw new Error(
          payload?.error ||
            "Failed to update RSVP",
        )
      }

      setSessions(
        (current) =>
          current.map(
            (session) => {
              if (
                session.id !==
                sessionId
              ) {
                return session
              }

              const attendees =
                session.attendees ||
                []

              const existingIndex =
                attendees.findIndex(
                  (
                    attendee,
                  ) => {
                    const matchesUser =
                      Boolean(
                        currentUserId &&
                          attendee.user_id ===
                            currentUserId,
                      )

                    const matchesProfile =
                      Boolean(
                        currentProfileId &&
                          attendee.profile_id ===
                            currentProfileId,
                      )

                    return (
                      matchesUser ||
                      matchesProfile
                    )
                  },
                )

              if (
                existingIndex !==
                -1
              ) {
                return {
                  ...session,
                  attendees:
                    attendees.map(
                      (
                        attendee,
                        index,
                      ) =>
                        index ===
                        existingIndex
                          ? {
                              ...attendee,
                              partstat,
                              responded_at:
                                new Date().toISOString(),
                            }
                          : attendee,
                    ),
                }
              }

              return {
                ...session,
                attendees: [
                  ...attendees,
                  {
                    user_id:
                      currentUserId,
                    profile_id:
                      currentProfileId,
                    partstat,
                    responded_at:
                      new Date().toISOString(),
                  },
                ],
              }
            },
          ),
      )

      setSuccess(
        `Your RSVP has been recorded: ${formatRsvp(
          partstat,
        )}.`,
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update RSVP",
      )
    } finally {
      setActionSessionId(
        null,
      )
    }
  }

  /*
   * ================================================================
   * CANCEL SESSION
   * ================================================================
   */

  async function cancelSession(
    sessionId: string,
  ) {
    const confirmed =
      window.confirm(
        "Cancel this training session?",
      )

    if (!confirmed) {
      return
    }

    setError(null)
    setSuccess(null)

    setActionSessionId(
      sessionId,
    )

    try {
      const res =
        await fetch(
          `/api/training/${engagementId}/schedule`,
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              sessionId,
            }),
          },
        )

      const payload =
        await readJsonResponse(
          res,
        )

      if (!res.ok) {
        throw new Error(
          payload?.error ||
            "Failed to cancel session",
        )
      }

      if (!payload?.success) {
        throw new Error(
          payload?.error ||
            "Failed to cancel session",
        )
      }

      setSessions(
        (current) =>
          current.filter(
            (session) =>
              session.id !==
              sessionId,
          ),
      )

      setSuccess(
        "Training session cancelled.",
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to cancel session",
      )
    } finally {
      setActionSessionId(
        null,
      )
    }
  }

  /*
   * ================================================================
   * SHARED INPUT CLASS
   * ================================================================
   */

  const inputClass =
    "w-full rounded-lg border border-[#143b28] bg-[#020806] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#20dc73]/50 disabled:cursor-not-allowed disabled:opacity-50"

  const selectClass =
    "w-full rounded-lg border border-[#143b28] bg-[#020806] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#20dc73]/50 disabled:cursor-not-allowed disabled:opacity-50"

  /*
   * ================================================================
   * RENDER
   * ================================================================
   */

  return (
    <div className="space-y-6">
      {/* ============================================================
          HEADER
          ============================================================ */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[#20dc73]/70">
            Training Delivery
          </div>

          <h3 className="mt-1 text-xl font-semibold text-white">
            Training Sessions
          </h3>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-white/50">
            Schedule, manage and attend the live
            delivery sessions that support this
            curriculum roadmap.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="rounded-lg border border-[#143b28] bg-[#020806]/90 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-white/35">
              Sessions
            </div>

            <div className="mt-1 text-sm font-semibold text-white">
              {sessions.length}
            </div>
          </div>

          <div className="rounded-lg border border-[#143b28] bg-[#020806]/90 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-white/35">
              Upcoming
            </div>

            <div className="mt-1 text-sm font-semibold text-[#20dc73]">
              {upcomingSessions}
            </div>
          </div>

          <div className="rounded-lg border border-[#143b28] bg-[#020806]/90 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-white/35">
              Completed
            </div>

            <div className="mt-1 text-sm font-semibold text-white">
              {completedSessions}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          ROLE INDICATORS
          ============================================================ */}

      <div className="flex flex-wrap gap-2">
        {canManageSessions && (
          <span className="rounded-full border border-[#20dc73]/20 bg-[#20dc73]/5 px-3 py-1.5 text-xs uppercase tracking-wider text-[#20dc73]/80">
            Training Operator
          </span>
        )}

        {isClient && (
          <span className="rounded-full border border-[#143b28] bg-black/20 px-3 py-1.5 text-xs uppercase tracking-wider text-white/45">
            Client Attendance
          </span>
        )}
      </div>

      {/* ============================================================
          MESSAGES
          ============================================================ */}

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

      {/* ============================================================
          CREATE SESSION
          ============================================================ */}

      {canManageSessions && (
        <section className="rounded-xl border border-[#143b28] bg-[#020806]/90 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-[#20dc73]/70">
                Session Scheduling
              </div>

              <h4 className="mt-1 font-semibold text-white">
                Schedule a training session
              </h4>

              <p className="mt-1 max-w-xl text-sm leading-6 text-white/45">
                Create a delivery session and,
                where applicable, attach it to a
                curriculum module.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowCreateForm(
                  (current) =>
                    !current,
                )

                setError(null)
                setSuccess(null)
              }}
              className="shrink-0 rounded-lg border border-[#20dc73]/30 bg-[#20dc73]/10 px-4 py-2 text-sm font-medium text-[#20dc73] transition hover:bg-[#20dc73]/15"
            >
              {showCreateForm
                ? "Close"
                : "+ Schedule Session"}
            </button>
          </div>

          {showCreateForm && (
            <form
              onSubmit={createSession}
              className="mt-5 space-y-5 border-t border-[#143b28]/80 pt-5"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">
                    Session title
                  </label>

                  <input
                    value={title}
                    onChange={(event) =>
                      setTitle(
                        event.target.value,
                      )
                    }
                    placeholder="e.g. Advanced Search Techniques"
                    disabled={loading}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">
                    Date & time
                  </label>

                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) =>
                      setScheduledAt(
                        event.target.value,
                      )
                    }
                    disabled={loading}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">
                    Session format
                  </label>

                  <select
                    value={
                      sessionType
                    }
                    onChange={(event) =>
                      setSessionType(
                        event.target.value,
                      )
                    }
                    disabled={loading}
                    className={selectClass}
                  >
                    {SESSION_TYPES.map(
                      (item) => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {item.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                {/* Duration */}
                <div className="lg:col-span-2">
                  <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">
                    Duration
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-wider text-white/25">
                        Hours
                      </label>

                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="1"
                        value={
                          durationHours
                        }
                        onChange={(
                          event,
                        ) =>
                          setDurationHours(
                            event.target
                              .value,
                          )
                        }
                        disabled={
                          loading
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-wider text-white/25">
                        Minutes
                      </label>

                      <select
                        value={
                          durationMinutesPart
                        }
                        onChange={(
                          event,
                        ) =>
                          setDurationMinutesPart(
                            event.target
                              .value,
                          )
                        }
                        disabled={
                          loading
                        }
                        className={selectClass}
                      >
                        <option value="0">
                          0 minutes
                        </option>

                        <option value="5">
                          5 minutes
                        </option>

                        <option value="10">
                          10 minutes
                        </option>

                        <option value="15">
                          15 minutes
                        </option>

                        <option value="20">
                          20 minutes
                        </option>

                        <option value="25">
                          25 minutes
                        </option>

                        <option value="30">
                          30 minutes
                        </option>

                        <option value="35">
                          35 minutes
                        </option>

                        <option value="40">
                          40 minutes
                        </option>

                        <option value="45">
                          45 minutes
                        </option>

                        <option value="50">
                          50 minutes
                        </option>

                        <option value="55">
                          55 minutes
                        </option>
                      </select>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-white/30">
                    Duration will be stored internally
                    as total minutes.
                  </p>
                </div>

                <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">
                      Curriculum module
                    </label>

                    <select
                      required
                      value={
                        moduleId
                      }
                      onChange={(event) =>
                        setModuleId(
                          event.target.value,
                        )
                      }
                      disabled={
                        loading ||
                        modules.length === 0
                      }
                      className={selectClass}
                    >
                      {[
                        ...modules,
                      ]
                        .sort(
                          (
                            a,
                            b,
                          ) =>
                            Number(
                              a.module_order ||
                                0,
                            ) -
                            Number(
                              b.module_order ||
                                0,
                            ),
                        )
                        .map(
                          (
                            module,
                          ) => (
                            <option
                              key={
                                module.id
                              }
                              value={
                                module.id
                              }
                            >
                              {module.title ||
                                "Untitled Module"}
                            </option>
                          ),
                        )}
                    </select>
                  </div>

                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">
                    Meeting URL
                  </label>

                  <input
                    value={
                      meetingUrl
                    }
                    onChange={(event) =>
                      setMeetingUrl(
                        event.target.value,
                      )
                    }
                    placeholder="https://..."
                    disabled={loading}
                    className={inputClass}
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">
                    Location
                  </label>

                  <input
                    value={
                      location
                    }
                    onChange={(event) =>
                      setLocation(
                        event.target.value,
                      )
                    }
                    placeholder="Online, ShadowNode training facility, or other location"
                    disabled={loading}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-[#20dc73] px-5 py-2.5 text-sm font-medium text-black transition hover:bg-[#20dc73]/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Scheduling..."
                    : "Schedule Session"}
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    resetCreateForm()
                    setShowCreateForm(
                      false,
                    )
                  }}
                  className="rounded-lg border border-[#143b28] bg-black/20 px-4 py-2.5 text-sm text-white/60 transition hover:border-[#20dc73]/30 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {!canManageSessions && (
        <div className="rounded-xl border border-[#143b28] bg-[#020806]/90 p-4">
          <div className="text-xs uppercase tracking-wider text-white/35">
            View Only
          </div>

          <p className="mt-1 text-sm leading-6 text-white/50">
            You can view scheduled training
            sessions and your available client
            actions, but you cannot modify the
            training schedule.
          </p>
        </div>
      )}

      {/* ============================================================
          SESSION LIST
          ============================================================ */}

      <div className="space-y-4">
        {sortedSessions.length === 0 && (
          <div className="rounded-xl border border-[#143b28] bg-[#020806]/90 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#143b28] bg-black/20 text-[#20dc73]">
              ◷
            </div>

            <h4 className="mt-4 font-semibold text-white">
              No sessions scheduled
            </h4>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-white/45">
              Training sessions will appear here
              once the training delivery schedule
              has been created.
            </p>
          </div>
        )}

        {Array.from(sessionsByModule.entries()).map(
          ([moduleKey, moduleSessions]) => {
            const module =
              moduleKey === "__unassigned__"
                ? null
                : modules.find(
                    (item) => item.id === moduleKey,
                  )

            return (
              <section
                key={moduleKey}
                className="space-y-3"
              >
                <div className="flex items-center gap-3 px-1">
                  <div className="h-px flex-1 bg-[#143b28]" />
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[#20dc73]/70">
                    {module
                      ? `Module ${
                          String(
                            Number(
                              module.module_order || 0,
                            ) || 0,
                          ).padStart(2, "0")
                        } / ${
                          module.title || "Untitled Module"
                        }`
                      : "Module Unassigned"}
                  </div>
                  <div className="h-px flex-1 bg-[#143b28]" />
                </div>

                <div className="space-y-4">
                  {moduleSessions.map(
                    (session, index) => {
            const attendee =
              isClient &&
              (currentUserId ||
                currentProfileId)
                ? (
                    session.attendees ||
                    []
                  ).find(
                    (item) => {
                      const matchesUser =
                        Boolean(
                          currentUserId &&
                            item.user_id ===
                              currentUserId,
                        )

                      const matchesProfile =
                        Boolean(
                          currentProfileId &&
                            item.profile_id ===
                              currentProfileId,
                        )

                      return (
                        matchesUser ||
                        matchesProfile
                      )
                    },
                  )
                : null

            const partstat =
              normalizeRsvp(
                attendee?.partstat,
              )

            const actionLoading =
              actionSessionId ===
              session.id

            const calendarLoading =
              calendarSessionId ===
              session.id

            const calendarSynced =
              Boolean(
                session.calendar_synced,
              )

            const rsvpLocked =
              isClient &&
              Boolean(partstat)

            const sessionCancelled =
              String(
                session.status || "",
              ).toLowerCase() ===
              "cancelled"

            const sessionCompleted =
              String(
                session.status || "",
              ).toLowerCase() ===
              "completed"

            const sessionModule =
              session.module_id
                ? modules.find(
                    (item) =>
                      item.id ===
                      session.module_id,
                  )
                : null

            return (
              <article
                key={session.id}
                className="group rounded-xl border border-[#143b28] bg-[#020806]/90 p-5 transition hover:border-[#20dc73]/30 hover:bg-[#06150d]/95"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-[#20dc73]/60">
                        Session{" "}
                        {String(
                          index + 1,
                        ).padStart(
                          2,
                          "0",
                        )}
                      </span>

                      {sessionModule && (
                        <>
                          <span className="text-white/20">
                            /
                          </span>

                          <span className="text-[10px] uppercase tracking-wider text-white/35">
                            {sessionModule.title}
                          </span>
                        </>
                      )}
                    </div>

                    <h4 className="mt-2 text-base font-semibold text-white">
                      {session.session_notes ||
                        session.session_type ||
                        "Training Session"}
                    </h4>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-white/30">
                          Date
                        </div>

                        <div className="mt-1 text-sm text-white/70">
                          {formatDate(
                            session.scheduled_at,
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-white/30">
                          Duration
                        </div>

                        <div className="mt-1 text-sm text-white/70">
                          {formatDuration(
                            session.duration_minutes,
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-white/30">
                          Format
                        </div>

                        <div className="mt-1 text-sm text-white/70">
                          {formatSessionType(
                            session.session_type,
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-white/30">
                          Attendance
                        </div>

                        <div
                          className={`mt-1 text-sm ${getAttendanceClass(
                            session.attendance_status,
                          )}`}
                        >
                          {formatStatus(
                            session.attendance_status ||
                              "pending",
                          )}
                        </div>
                      </div>
                    </div>

                    {session.meeting_url && (
                      <div className="mt-4 rounded-lg border border-[#143b28]/70 bg-black/20 px-3 py-2.5">
                        <div className="text-[10px] uppercase tracking-wider text-white/30">
                          Meeting
                        </div>

                        <a
                          href={
                            session.meeting_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block break-all text-sm text-white/65 underline decoration-white/20 underline-offset-2 transition hover:text-[#20dc73]"
                        >
                          {
                            session.meeting_url
                          }
                        </a>
                      </div>
                    )}

                    {session.location && (
                      <div className="mt-3 text-sm text-white/55">
                        <span className="text-white/30">
                          Location:
                        </span>{" "}
                        {session.location}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wider ${getStatusClass(
                        session.status,
                      )}`}
                    >
                      {formatStatus(
                        session.status,
                      )}
                    </span>

                    {calendarSynced &&
                      isClient && (
                        <span className="text-[10px] uppercase tracking-wider text-[#20dc73]/60">
                          Google Calendar Synced
                        </span>
                      )}
                  </div>
                </div>

                {/* ----------------------------------------------------
                    SESSION ACTIONS
                    ---------------------------------------------------- */}

                <div className="mt-5 border-t border-[#143b28]/80 pt-4">
                  <div className="flex flex-col gap-3">
                    {/* Client actions */}
                    {isClient && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={
                            calendarLoading ||
                            calendarSynced ||
                            sessionCancelled
                          }
                          onClick={() =>
                            addToGoogleCalendar(
                              session.id,
                            )
                          }
                          title={
                            calendarSynced
                              ? "This session is already synchronized with Google Calendar."
                              : sessionCancelled
                                ? "Cancelled sessions cannot be added to Google Calendar."
                                : "Add this training session to your Google Calendar."
                          }
                          className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            calendarSynced
                              ? "border border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]"
                              : "bg-[#20dc73] text-black hover:bg-[#20dc73]/90"
                          }`}
                        >
                          {calendarLoading
                            ? "Adding..."
                            : calendarSynced
                              ? "✓ Added to Google Calendar"
                              : "Add to Google Calendar"}
                        </button>

                        <a
                          href={`/api/training/session/${session.id}/ics`}
                          className="rounded-lg border border-[#143b28] bg-black/20 px-3 py-2 text-sm text-white/65 transition hover:border-[#20dc73]/40 hover:text-[#20dc73]"
                        >
                          Download .ics
                        </a>
                      </div>
                    )}

                    {/* Client RSVP */}
                    {isClient && (
                      <div className="rounded-lg border border-[#143b28]/70 bg-black/20 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-white/30">
                              Attendance Response
                            </div>

                            <div className="mt-1 text-sm text-white/55">
                              {partstat
                                ? `Response recorded: ${formatRsvp(
                                    partstat,
                                  )}`
                                : "Let the training team know whether you can attend."}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={
                                actionLoading ||
                                rsvpLocked ||
                                sessionCancelled ||
                                sessionCompleted
                              }
                              onClick={() =>
                                submitRsvp(
                                  session.id,
                                  "ACCEPTED",
                                )
                              }
                              className={`rounded-lg px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                partstat ===
                                "ACCEPTED"
                                  ? "bg-[#20dc73] text-black"
                                  : "border border-[#143b28] bg-black/20 text-white/65 hover:border-[#20dc73]/40 hover:text-[#20dc73]"
                              }`}
                            >
                              {partstat ===
                              "ACCEPTED"
                                ? "Accepted ✓"
                                : "Accept"}
                            </button>

                            <button
                              type="button"
                              disabled={
                                actionLoading ||
                                rsvpLocked ||
                                sessionCancelled ||
                                sessionCompleted
                              }
                              onClick={() =>
                                submitRsvp(
                                  session.id,
                                  "TENTATIVE",
                                )
                              }
                              className={`rounded-lg px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                partstat ===
                                "TENTATIVE"
                                  ? "bg-yellow-500 text-black"
                                  : "border border-[#143b28] bg-black/20 text-white/65 hover:border-yellow-500/40 hover:text-yellow-400"
                              }`}
                            >
                              {partstat ===
                              "TENTATIVE"
                                ? "Tentative ✓"
                                : "Tentative"}
                            </button>

                            <button
                              type="button"
                              disabled={
                                actionLoading ||
                                rsvpLocked ||
                                sessionCancelled ||
                                sessionCompleted
                              }
                              onClick={() =>
                                submitRsvp(
                                  session.id,
                                  "DECLINED",
                                )
                              }
                              className={`rounded-lg px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                partstat ===
                                "DECLINED"
                                  ? "bg-red-600 text-white"
                                  : "border border-[#143b28] bg-black/20 text-white/65 hover:border-red-500/40 hover:text-red-300"
                              }`}
                            >
                              {partstat ===
                              "DECLINED"
                                ? "Declined ✓"
                                : "Decline"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Trainer/operator actions */}
                    {canManageSessions && (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-white/30">
                          Session management
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={
                              actionLoading ||
                              sessionCancelled
                            }
                            onClick={() =>
                              openEditModal(
                                session,
                              )
                            }
                            className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {actionLoading
                              ? "Processing..."
                              : "Edit"}
                          </button>

                          <button
                            type="button"
                            disabled={
                              actionLoading ||
                              sessionCancelled ||
                              sessionCompleted
                            }
                            onClick={() =>
                              cancelSession(
                                session.id,
                              )
                            }
                            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
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
      </div>

      {/* ============================================================
          EDIT SESSION MODAL
          ============================================================ */}

      {editingSession && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEditModal()
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#143b28] bg-[#020806] shadow-2xl shadow-black/50">
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#143b28] bg-[#020806]/95 px-5 py-4 backdrop-blur">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#20dc73]/70">
                  Training Delivery
                </div>

                <h3 className="mt-1 text-lg font-semibold text-white">
                  Edit Session
                </h3>

                <p className="mt-1 text-sm text-white/40">
                  Update the schedule and delivery
                  details for this training session.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeEditModal
                }
                disabled={
                  actionSessionId ===
                  editingSession.id
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#143b28] bg-black/20 text-lg text-white/50 transition hover:border-[#20dc73]/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Close edit session"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                saveEditedSession
              }
              className="space-y-5 p-5"
            >
              {/* Session title */}
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">
                  Session title
                </label>

                <input
                  value={editTitle}
                  onChange={(event) =>
                    setEditTitle(
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Advanced Search Techniques"
                  disabled={
                    actionSessionId ===
                    editingSession.id
                  }
                  className={inputClass}
                  autoFocus
                />
              </div>

              {/* Curriculum module */}
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">
                  Curriculum module
                </label>

                <select
                  required
                  value={editModuleId}
                  onChange={(event) =>
                    setEditModuleId(
                      event.target.value,
                    )
                  }
                  disabled={
                    actionSessionId ===
                    editingSession.id
                  }
                  className={selectClass}
                >
                  <option value="">
                    Select a module
                  </option>

                  {[...modules]
                    .sort(
                      (a, b) =>
                        Number(
                          a.module_order ||
                            0,
                        ) -
                        Number(
                          b.module_order ||
                            0,
                        ),
                    )
                    .map((module) => (
                      <option
                        key={module.id}
                        value={module.id}
                      >
                        {module.title ||
                          "Untitled Module"}
                      </option>
                    ))}
                </select>
              </div>

              {/* Date and time */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">
                    Date & time
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      editScheduledAt
                    }
                    onChange={(event) =>
                      setEditScheduledAt(
                        event.target
                          .value,
                      )
                    }
                    disabled={
                      actionSessionId ===
                      editingSession.id
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="rounded-xl border border-[#143b28]/80 bg-black/20 p-4">
                <div className="mb-3">
                  <div className="text-xs uppercase tracking-wider text-white/40">
                    Session duration
                  </div>

                  <div className="mt-1 text-xs text-white/30">
                    Specify the duration in hours and
                    minutes.
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-white/30">
                      Hours
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="1"
                      value={
                        editDurationHours
                      }
                      onChange={(event) =>
                        setEditDurationHours(
                          event.target
                            .value,
                        )
                      }
                      disabled={
                        actionSessionId ===
                        editingSession.id
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-white/30">
                      Minutes
                    </label>

                    <select
                      value={
                        editDurationMinutes
                      }
                      onChange={(event) =>
                        setEditDurationMinutes(
                          event.target
                            .value,
                        )
                      }
                      disabled={
                        actionSessionId ===
                        editingSession.id
                      }
                      className={selectClass}
                    >
                      <option value="0">
                        0 minutes
                      </option>

                      <option value="5">
                        5 minutes
                      </option>

                      <option value="10">
                        10 minutes
                      </option>

                      <option value="15">
                        15 minutes
                      </option>

                      <option value="20">
                        20 minutes
                      </option>

                      <option value="25">
                        25 minutes
                      </option>

                      <option value="30">
                        30 minutes
                      </option>

                      <option value="35">
                        35 minutes
                      </option>

                      <option value="40">
                        40 minutes
                      </option>

                      <option value="45">
                        45 minutes
                      </option>

                      <option value="50">
                        50 minutes
                      </option>

                      <option value="55">
                        55 minutes
                      </option>
                    </select>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-[#143b28]/60 bg-[#020806] px-3 py-2">
                  <span className="text-[10px] uppercase tracking-wider text-white/25">
                    New duration
                  </span>

                  <div className="mt-1 text-sm font-medium text-[#20dc73]">
                    {formatDuration(
                      durationPartsToMinutes(
                        editDurationHours,
                        editDurationMinutes,
                      ),
                    )}
                  </div>
                </div>
              </div>

              {/* Meeting URL */}
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">
                  Meeting URL
                </label>

                <input
                  value={
                    editMeetingUrl
                  }
                  onChange={(event) =>
                    setEditMeetingUrl(
                      event.target.value,
                    )
                  }
                  placeholder="https://..."
                  disabled={
                    actionSessionId ===
                    editingSession.id
                  }
                  className={inputClass}
                />
              </div>

              {/* Location */}
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">
                  Location
                </label>

                <input
                  value={
                    editLocation
                  }
                  onChange={(event) =>
                    setEditLocation(
                      event.target.value,
                    )
                  }
                  placeholder="Online, ShadowNode training facility, or other location"
                  disabled={
                    actionSessionId ===
                    editingSession.id
                  }
                  className={inputClass}
                />
              </div>

              {/* Session information */}
              <div className="rounded-xl border border-[#143b28]/70 bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-wider text-white/25">
                  Session information
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/25">
                      Format
                    </div>

                    <div className="mt-1 text-sm text-white/65">
                      {formatSessionType(
                        editingSession.session_type,
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/25">
                      Current status
                    </div>

                    <div className="mt-1 text-sm text-white/65">
                      {formatStatus(
                        editingSession.status,
                      )}
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-5 text-white/30">
                  Session format and curriculum module
                  are not changed from this editor.
                  Use the existing training structure
                  when those details need to change.
                </p>
              </div>

              {/* Modal actions */}
              <div className="flex flex-col-reverse gap-2 border-t border-[#143b28]/80 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    closeEditModal
                  }
                  disabled={
                    actionSessionId ===
                    editingSession.id
                  }
                  className="rounded-lg border border-[#143b28] bg-black/20 px-4 py-2.5 text-sm text-white/60 transition hover:border-[#20dc73]/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    actionSessionId ===
                    editingSession.id
                  }
                  className="rounded-lg bg-[#20dc73] px-5 py-2.5 text-sm font-medium text-black transition hover:bg-[#20dc73]/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionSessionId ===
                  editingSession.id
                    ? "Saving Changes..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}