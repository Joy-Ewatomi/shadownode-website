"use client"

import {
  TRAINING_OUTCOME_OPTIONS,
} from "../constants"

import { toggleArray } from "../helpers"
import OptionButton from "../OptionButton"

type Props = {
  duration: string

  expectedOutcome: string[]
  customExpectedOutcome: string

  startDate: string
  completionDate: string

  timelineFlexible: boolean

  onDurationChange: (value: string) => void

  onOutcomeChange: (value: string[]) => void

  onCustomExpectedOutcomeChange: (
    value: string,
  ) => void

  onStartDateChange: (
    value: string,
  ) => void

  onCompletionDateChange: (
    value: string,
  ) => void

  onFlexibleChange: (
    value: boolean,
  ) => void

  // CUSTOM SCHEDULE
  customSessionsPerWeek: string
  customHoursPerSession: string
  customTrainingDays: string[]
  customSessionTime: string
  customTrainingPeriod: string

  onCustomSessionsPerWeekChange: (
    value: string,
  ) => void

  onCustomHoursPerSessionChange: (
    value: string,
  ) => void

  onCustomTrainingDaysChange: (
    value: string[],
  ) => void

  onCustomSessionTimeChange: (
    value: string,
  ) => void

  onCustomTrainingPeriodChange: (
    value: string,
  ) => void
}

/* ============================================================
   DATE HELPERS
============================================================ */

function parseLocalDate(
  value: string,
): Date | null {
  if (!value) {
    return null
  }

  const parts = value
    .split("-")
    .map(Number)

  if (
    parts.length !== 3 ||
    parts.some(
      (part) => !Number.isFinite(part),
    )
  ) {
    return null
  }

  const [
    year,
    month,
    day,
  ] = parts

  const date = new Date(
    year,
    month - 1,
    day,
  )

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

function formatDisplayDate(
  value: string,
) {
  const date =
    parseLocalDate(value)

  if (!date) {
    return ""
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  )
}

function calculateDateDifference(
  startDate: string,
  completionDate: string,
) {
  const start =
    parseLocalDate(startDate)

  const completion =
    parseLocalDate(
      completionDate,
    )

  if (
    !start ||
    !completion
  ) {
    return null
  }

  const milliseconds =
    completion.getTime() -
    start.getTime()

  const days = Math.round(
    milliseconds /
      (1000 * 60 * 60 * 24),
  )

  if (days < 0) {
    return {
      days,
      months: 0,
      weeks: 0,
    }
  }

  const weeks = Math.floor(
    days / 7,
  )

  const months = Math.floor(
    days / 30,
  )

  return {
    days,
    weeks,
    months,
  }
}

function formatDurationSummary(
  days: number,
) {
  if (days < 0) {
    return "Completion date is before the start date"
  }

  if (days === 0) {
    return "Same-day training"
  }

  if (days < 7) {
    return `${days} day${
      days === 1 ? "" : "s"
    }`
  }

  if (days < 30) {
    const weeks =
      Math.round(
        days / 7,
      )

    return `${weeks} week${
      weeks === 1 ? "" : "s"
    }`
  }

  const months =
    Math.floor(days / 30)

  const remainingDays =
    days % 30

  if (remainingDays === 0) {
    return `${months} month${
      months === 1 ? "" : "s"
    }`
  }

  return `Approximately ${months} month${
    months === 1 ? "" : "s"
  }`
}

/* ============================================================
   COMPONENT
============================================================ */

export default function TimelineSection({
  duration,

  expectedOutcome,
  customExpectedOutcome,

  startDate,
  completionDate,

  timelineFlexible,

  onDurationChange,
  onOutcomeChange,
  onCustomExpectedOutcomeChange,

  onStartDateChange,
  onCompletionDateChange,

  onFlexibleChange,

  customSessionsPerWeek,
  customHoursPerSession,
  customTrainingDays,
  customSessionTime,
  customTrainingPeriod,

  onCustomSessionsPerWeekChange,
  onCustomHoursPerSessionChange,
  onCustomTrainingDaysChange,
  onCustomSessionTimeChange,
  onCustomTrainingPeriodChange,
}: Props) {
  const dateDifference =
    calculateDateDifference(
      startDate,
      completionDate,
    )

  const datesAreComplete =
    Boolean(
      startDate &&
        completionDate,
    )

  const datesAreInvalid =
    dateDifference !== null &&
    dateDifference.days < 0

  const plannedDuration =
    dateDifference &&
    dateDifference.days >= 0
      ? formatDurationSummary(
          dateDifference.days,
        )
      : null

  /*
   * Keep the existing duration field alive for compatibility
   * with the wider form payload.
   *
   * The visible planning experience is now driven by the
   * selected dates and custom schedule instead of preset
   * duration cards.
   */
  const selectedDuration =
    duration || "custom"

  return (
    <div className="space-y-10">

      {/* =====================================================
          SECTION HEADER
      ===================================================== */}

      <div>
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#20dc73]/20 bg-[#20dc73]/[0.06] text-[#20dc73]">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7 3V6M17 3V6M4 9H20M6 13H9M6 17H9M13 13H18M13 17H16"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />

              <rect
                x="4"
                y="5"
                width="16"
                height="16"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#20dc73]/70">
              Training Timeline
            </p>

            <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Plan your training window
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
              Choose when you would like the training to
              begin and when you expect it to finish.
              ShadowNode will use this timeline to
              structure the engagement.
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          TRAINING WINDOW
      ===================================================== */}

      <div className="overflow-hidden rounded-2xl border border-[#143b28] bg-[#04100b]/70 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">

        {/* TOP BAR */}

        <div className="border-b border-white/5 bg-white/[0.015] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Engagement Window
              </p>

              <p className="mt-1 text-sm text-white/55">
                Set your preferred start and completion
                dates.
              </p>
            </div>

            {plannedDuration && (
              <div className="inline-flex w-fit items-center rounded-full border border-[#20dc73]/20 bg-[#20dc73]/[0.06] px-3 py-1.5 text-xs font-medium text-[#20dc73]">
                {plannedDuration}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6">

          {/* DATES */}

          <div className="grid gap-4 lg:grid-cols-2">

            {/* START */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition focus-within:border-[#20dc73]/30">
              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#20dc73]/20 bg-[#20dc73]/[0.06] text-[#20dc73]">
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="4"
                      y="5"
                      width="16"
                      height="15"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />

                    <path
                      d="M8 3V7M16 3V7M4 9H20"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                    Start Date
                  </p>

                  <p className="mt-1 text-sm text-white/55">
                    When should training begin?
                  </p>
                </div>
              </div>

              <input
                type="date"
                value={startDate}
                max={
                  completionDate ||
                  undefined
                }
                onChange={(event) =>
                  onStartDateChange(
                    event.target.value,
                  )
                }
                className="
                  mt-5
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-[#143b28]
                  bg-[#020806]
                  px-4
                  text-sm
                  font-medium
                  text-white
                  outline-none
                  transition
                  focus:border-[#20dc73]/50
                  focus:ring-1
                  focus:ring-[#20dc73]/10
                "
              />

              {startDate && (
                <p className="mt-2 text-xs text-white/30">
                  {formatDisplayDate(
                    startDate,
                  )}
                </p>
              )}
            </div>

            {/* COMPLETION */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition focus-within:border-[#20dc73]/30">
              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c9a227]/20 bg-[#c9a227]/[0.06] text-[#d6aa43]">
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="8"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />

                    <path
                      d="M12 8V12L15 14"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                    Completion Date
                  </p>

                  <p className="mt-1 text-sm text-white/55">
                    When do you expect training to finish?
                  </p>
                </div>
              </div>

              <input
                type="date"
                value={completionDate}
                min={
                  startDate ||
                  undefined
                }
                onChange={(event) =>
                  onCompletionDateChange(
                    event.target.value,
                  )
                }
                className="
                  mt-5
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-[#143b28]
                  bg-[#020806]
                  px-4
                  text-sm
                  font-medium
                  text-white
                  outline-none
                  transition
                  focus:border-[#20dc73]/50
                  focus:ring-1
                  focus:ring-[#20dc73]/10
                "
              />

              {completionDate && (
                <p className="mt-2 text-xs text-white/30">
                  {formatDisplayDate(
                    completionDate,
                  )}
                </p>
              )}
            </div>
          </div>

          {/* DATE ERROR */}

          {datesAreInvalid && (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.04] px-4 py-3">
              <p className="text-xs font-medium text-red-300">
                Completion date must be on or after the
                training start date.
              </p>
            </div>
          )}

          {/* TIMELINE PREVIEW */}

          {datesAreComplete &&
            !datesAreInvalid &&
            dateDifference && (
              <div className="mt-5 rounded-2xl border border-[#c9a227]/20 bg-[#c9a227]/[0.035] p-5">

                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c9a227]">
                      Planned Training Window
                    </p>

                    <div className="mt-2 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
                      <span className="font-medium text-white">
                        {formatDisplayDate(
                          startDate,
                        )}
                      </span>

                      <span className="hidden text-white/25 sm:inline">
                        →
                      </span>

                      <span className="font-medium text-white">
                        {formatDisplayDate(
                          completionDate,
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 sm:min-w-[330px]">

                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-center">
                      <p className="text-[9px] uppercase tracking-[0.14em] text-white/25">
                        Days
                      </p>

                      <p className="mt-1 font-mono text-lg font-semibold text-white">
                        {dateDifference.days}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-center">
                      <p className="text-[9px] uppercase tracking-[0.14em] text-white/25">
                        Weeks
                      </p>

                      <p className="mt-1 font-mono text-lg font-semibold text-white">
                        {Math.round(
                          dateDifference.days /
                            7,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-center">
                      <p className="text-[9px] uppercase tracking-[0.14em] text-white/25">
                        Window
                      </p>

                      <p className="mt-1 font-mono text-sm font-semibold text-[#20dc73]">
                        {plannedDuration}
                      </p>
                    </div>

                  </div>
                </div>

                {/* TIMELINE BAR */}

                <div className="mt-6">

                  <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.14em] text-white/25">
                    <span>Start</span>
                    <span>Completion</span>
                  </div>

                  <div className="mt-2 flex items-center gap-3">

                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#20dc73]/40 bg-[#20dc73]/10">
                      <div className="h-2 w-2 rounded-full bg-[#20dc73]" />
                    </div>

                    <div className="relative h-px flex-1 bg-[#143b28]">
                      <div className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#20dc73]" />

                      <div className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#c9a227]" />
                    </div>

                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#c9a227]/40 bg-[#c9a227]/10">
                      <div className="h-2 w-2 rounded-full bg-[#c9a227]" />
                    </div>

                  </div>
                </div>
              </div>
            )}

        </div>
      </div>

      {/* =====================================================
          DELIVERY SCHEDULE
      ===================================================== */}

      <div className="rounded-2xl border border-[#143b28] bg-[#04100b]/70 p-5 sm:p-6">

        <div className="flex items-start gap-4">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#20dc73]/20 bg-[#20dc73]/[0.05] text-[#20dc73]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 6H20M4 12H20M4 18H20"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />

              <circle
                cx="8"
                cy="6"
                r="1.5"
                fill="currentColor"
              />

              <circle
                cx="15"
                cy="12"
                r="1.5"
                fill="currentColor"
              />

              <circle
                cx="10"
                cy="18"
                r="1.5"
                fill="currentColor"
              />
            </svg>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#20dc73]/70">
              Delivery Schedule
            </p>

            <h3 className="mt-1 text-lg font-semibold text-white">
              How should the training be delivered?
            </h3>

            <p className="mt-1 text-sm leading-6 text-white/40">
              This helps ShadowNode understand the pace
              and structure that works best for you.
            </p>
          </div>
        </div>

        {/* CUSTOM SCHEDULE */}

        <div className="mt-6 space-y-6">

          {/* SESSIONS + HOURS */}

          <div className="grid gap-4 md:grid-cols-2">

            {/* SESSIONS */}

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">

              <label
                htmlFor="custom-sessions-per-week"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45"
              >
                Sessions Per Week
              </label>

              <p className="mt-1 text-xs text-white/30">
                How many training sessions should take
                place each week?
              </p>

              <select
                id="custom-sessions-per-week"
                value={
                  customSessionsPerWeek
                }
                onChange={(event) =>
                  onCustomSessionsPerWeekChange(
                    event.target.value,
                  )
                }
                className="
                  mt-4
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-[#143b28]
                  bg-[#020806]
                  px-3
                  text-sm
                  text-white
                  outline-none
                  transition
                  focus:border-[#20dc73]/50
                "
              >
                <option value="">
                  Select sessions
                </option>

                <option value="1">
                  1 session per week
                </option>

                <option value="2">
                  2 sessions per week
                </option>

                <option value="3">
                  3 sessions per week
                </option>

                <option value="4">
                  4 sessions per week
                </option>

                <option value="5">
                  5 sessions per week
                </option>

                <option value="6">
                  6 sessions per week
                </option>
              </select>
            </div>

            {/* HOURS */}

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">

              <label
                htmlFor="custom-hours-per-session"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45"
              >
                Hours Per Session
              </label>

              <p className="mt-1 text-xs text-white/30">
                Approximate length of each session.
              </p>

              <select
                id="custom-hours-per-session"
                value={
                  customHoursPerSession
                }
                onChange={(event) =>
                  onCustomHoursPerSessionChange(
                    event.target.value,
                  )
                }
                className="
                  mt-4
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-[#143b28]
                  bg-[#020806]
                  px-3
                  text-sm
                  text-white
                  outline-none
                  transition
                  focus:border-[#20dc73]/50
                "
              >
                <option value="">
                  Select hours
                </option>

                <option value="1">
                  1 hour
                </option>

                <option value="2">
                  2 hours
                </option>

                <option value="3">
                  3 hours
                </option>

                <option value="4">
                  4 hours
                </option>

                <option value="5">
                  5 hours
                </option>

                <option value="6">
                  6 hours
                </option>

                <option value="8">
                  8 hours
                </option>
              </select>
            </div>
          </div>

          {/* TRAINING PERIOD */}

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

              <div>
                <label
                  htmlFor="custom-training-period"
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45"
                >
                  Training Period
                </label>

                <p className="mt-1 text-xs text-white/30">
                  Optional note about the intended training
                  period.
                </p>
              </div>

              {plannedDuration && (
                <span className="text-[10px] uppercase tracking-[0.12em] text-[#20dc73]/60">
                  Calculated from dates above
                </span>
              )}
            </div>

            <input
              id="custom-training-period"
              type="text"
              value={
                customTrainingPeriod
              }
              onChange={(event) =>
                onCustomTrainingPeriodChange(
                  event.target.value,
                )
              }
              placeholder="e.g. intensive 6-week programme"
              className="
                mt-4
                h-11
                w-full
                rounded-xl
                border
                border-[#143b28]
                bg-[#020806]
                px-4
                text-sm
                text-white
                outline-none
                placeholder:text-white/20
                transition
                focus:border-[#20dc73]/50
              "
            />
          </div>

          {/* TRAINING DAYS */}

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                Preferred Training Days
              </p>

              <p className="mt-1 text-xs text-white/30">
                Select the days that generally work best
                for your sessions.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">

              {[
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ].map((day) => {
                const selected =
                  customTrainingDays.includes(
                    day,
                  )

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      if (selected) {
                        onCustomTrainingDaysChange(
                          customTrainingDays.filter(
                            (item) =>
                              item !== day,
                          ),
                        )
                      } else {
                        onCustomTrainingDaysChange([
                          ...customTrainingDays,
                          day,
                        ])
                      }
                    }}
                    className={`
                      rounded-xl
                      border
                      px-3
                      py-3
                      text-xs
                      font-medium
                      transition
                      ${
                        selected
                          ? "border-[#20dc73]/60 bg-[#20dc73]/10 text-[#20dc73] shadow-[0_0_20px_rgba(32,220,115,0.05)]"
                          : "border-white/10 bg-white/[0.015] text-white/45 hover:border-[#20dc73]/25 hover:bg-[#20dc73]/[0.03] hover:text-white/70"
                      }
                    `}
                  >
                    {day.slice(0, 3)}
                  </button>
                )
              })}
            </div>

            {customTrainingDays.length > 0 && (
              <p className="mt-3 text-xs text-white/30">
                Selected:{" "}
                <span className="text-white/55">
                  {customTrainingDays.join(
                    ", ",
                  )}
                </span>
              </p>
            )}
          </div>

          {/* SESSION TIME */}

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">

            <label
              htmlFor="custom-session-time"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45"
            >
              Preferred Session Time
            </label>

            <p className="mt-1 text-xs text-white/30">
              Select the general time of day that works
              best.
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-4">

              {[
                {
                  value: "morning",
                  label: "Morning",
                },
                {
                  value: "afternoon",
                  label: "Afternoon",
                },
                {
                  value: "evening",
                  label: "Evening",
                },
                {
                  value: "night",
                  label: "Night",
                },
              ].map((option) => {
                const selected =
                  customSessionTime ===
                  option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      onCustomSessionTimeChange(
                        option.value,
                      )
                    }
                    className={`
                      rounded-xl
                      border
                      px-4
                      py-3
                      text-sm
                      font-medium
                      transition
                      ${
                        selected
                          ? "border-[#20dc73]/60 bg-[#20dc73]/10 text-[#20dc73]"
                          : "border-white/10 bg-white/[0.015] text-white/45 hover:border-[#20dc73]/25 hover:text-white/70"
                      }
                    `}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            {/* Hidden compatibility value */}
            <input
              id="custom-session-time"
              type="hidden"
              value={customSessionTime}
              readOnly
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          EXPECTED OUTCOMES
      ===================================================== */}

      <div className="rounded-2xl border border-[#143b28] bg-[#04100b]/70 p-5 sm:p-6">

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#20dc73]/70">
            Expected Outcomes
          </p>

          <h3 className="mt-1 text-lg font-semibold text-white">
            What should this training achieve?
          </h3>

          <p className="mt-1 text-sm leading-6 text-white/40">
            Select the outcomes that matter most for this
            engagement.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">

          {TRAINING_OUTCOME_OPTIONS.map(
            (item) => (
              <OptionButton
                key={item}
                label={item}
                active={expectedOutcome.includes(
                  item,
                )}
                onClick={() =>
                  onOutcomeChange(
                    toggleArray(
                      expectedOutcome,
                      item,
                    ),
                  )
                }
              />
            ),
          )}

        </div>

        {expectedOutcome.includes(
          "Custom",
        ) && (
          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">

            <label
              htmlFor="custom-expected-outcome"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45"
            >
              Custom Expected Outcome
            </label>

            <textarea
              id="custom-expected-outcome"
              value={
                customExpectedOutcome
              }
              onChange={(event) =>
                onCustomExpectedOutcomeChange(
                  event.target.value,
                )
              }
              rows={5}
              placeholder="Describe the specific result you expect from the training..."
              className="
                mt-3
                w-full
                resize-y
                rounded-xl
                border
                border-[#143b28]
                bg-[#020806]
                p-4
                text-sm
                leading-6
                text-white
                outline-none
                placeholder:text-white/20
                transition
                focus:border-[#20dc73]/50
                focus:ring-1
                focus:ring-[#20dc73]/10
              "
            />

          </div>
        )}
      </div>

      {/* =====================================================
          FLEXIBLE TIMELINE
      ===================================================== */}

      <label
        className={`
          group
          flex
          cursor-pointer
          items-start
          gap-4
          rounded-2xl
          border
          p-5
          transition
          ${
            timelineFlexible
              ? "border-[#20dc73]/30 bg-[#20dc73]/[0.05]"
              : "border-white/10 bg-white/[0.02] hover:border-[#20dc73]/20"
          }
        `}
      >
        <input
          type="checkbox"
          checked={
            timelineFlexible
          }
          onChange={(event) =>
            onFlexibleChange(
              event.target.checked,
            )
          }
          className="mt-1 h-4 w-4 shrink-0 accent-[#20dc73]"
        />

        <span className="min-w-0">

          <span className="block text-sm font-semibold text-white/80">
            My schedule is flexible
          </span>

          <span className="mt-1 block text-xs leading-5 text-white/35">
            ShadowNode may recommend better training
            dates or scheduling arrangements based on
            trainer availability and the engagement
            requirements.
          </span>

        </span>
      </label>

      {/* =====================================================
          INTERNAL COMPATIBILITY NOTE
      ===================================================== */}

      <input
        type="hidden"
        value={selectedDuration}
        readOnly
        aria-hidden="true"
      />
    </div>
  )
}