"use client"

import {
  TRAINING_DURATION_OPTIONS,
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
    value: string
  ) => void

  onStartDateChange: (value: string) => void
  onCompletionDateChange: (value: string) => void

  onFlexibleChange: (value: boolean) => void

  // CUSTOM DURATION
  customSessionsPerWeek: string
  customHoursPerSession: string
  customTrainingDays: string[]
  customSessionTime: string
  customTrainingPeriod: string

  onCustomSessionsPerWeekChange: (
    value: string
  ) => void

  onCustomHoursPerSessionChange: (
    value: string
  ) => void

  onCustomTrainingDaysChange: (
    value: string[]
  ) => void

  onCustomSessionTimeChange: (
    value: string
  ) => void

  onCustomTrainingPeriodChange: (
    value: string
  ) => void
}

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

  // CUSTOM DURATION
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
  return (
    <div className="space-y-6">

      {/* =====================================================
          TRAINING DURATION
      ===================================================== */}

      <div>
        <label className="mb-3 block text-xs uppercase tracking-[0.12em] text-white/50">
          Training Duration
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          {TRAINING_DURATION_OPTIONS.map((item) => (
            <OptionButton
              key={item}
              label={item}
              active={duration === item}
              onClick={() =>
                onDurationChange(item)
              }
            />
          ))}
        </div>
      </div>

      {/* =====================================================
          CUSTOM TRAINING SCHEDULE
      ===================================================== */}

      {duration === "custom" && (
        <div className="space-y-5 rounded-md border border-[#143b28] bg-[#20dc73]/5 p-5">

          <div>
            <h3 className="font-semibold text-[#20dc73]">
              Custom Training Schedule
            </h3>

            <p className="mt-1 text-sm text-white/50">
              Configure how often the training
              should take place.
            </p>
          </div>

          {/* =================================================
              SESSIONS + HOURS
          ================================================= */}

          <div className="grid gap-4 md:grid-cols-2">

            {/* Sessions per week */}

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
                Sessions Per Week
              </label>

              <select
                value={customSessionsPerWeek}
                onChange={(e) =>
                  onCustomSessionsPerWeekChange(
                    e.target.value
                  )
                }
                className="
                  h-10
                  w-full
                  rounded
                  border
                  border-[#143b28]
                  bg-black
                  px-3
                  text-sm
                  text-white
                  outline-none
                  focus:border-[#20dc73]/50
                "
              >
                <option value="">
                  Select
                </option>

                <option value="1">
                  1 session
                </option>

                <option value="2">
                  2 sessions
                </option>

                <option value="3">
                  3 sessions
                </option>

                <option value="4">
                  4 sessions
                </option>

                <option value="5">
                  5 sessions
                </option>

                <option value="6">
                  6 sessions
                </option>
              </select>
            </div>

            {/* Hours per session */}

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
                Hours Per Session
              </label>

              <select
                value={customHoursPerSession}
                onChange={(e) =>
                  onCustomHoursPerSessionChange(
                    e.target.value
                  )
                }
                className="
                  h-10
                  w-full
                  rounded
                  border
                  border-[#143b28]
                  bg-black
                  px-3
                  text-sm
                  text-white
                  outline-none
                  focus:border-[#20dc73]/50
                "
              >
                <option value="">
                  Select
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

          {/* =================================================
              TRAINING PERIOD
          ================================================= */}

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
              Training Period
            </label>

            <input
              type="text"
              value={customTrainingPeriod}
              onChange={(e) =>
                onCustomTrainingPeriodChange(
                  e.target.value
                )
              }
              placeholder="e.g. 6 weeks, 3 months"
              className="
                h-10
                w-full
                rounded
                border
                border-[#143b28]
                bg-black
                px-3
                text-sm
                text-white
                outline-none
                placeholder:text-white/30
                focus:border-[#20dc73]/50
              "
            />
          </div>

          {/* =================================================
              TRAINING DAYS
          ================================================= */}

          <div>
            <label className="mb-3 block text-xs uppercase tracking-[0.12em] text-white/50">
              Preferred Training Days
            </label>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                  customTrainingDays.includes(day)

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      if (selected) {
                        onCustomTrainingDaysChange(
                          customTrainingDays.filter(
                            (item) =>
                              item !== day
                          )
                        )
                      } else {
                        onCustomTrainingDaysChange([
                          ...customTrainingDays,
                          day,
                        ])
                      }
                    }}
                    className={`
                      rounded
                      border
                      p-2
                      text-sm
                      transition
                      ${
                        selected
                          ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                          : "border-[#143b28] text-white/60 hover:border-[#20dc73]/40"
                      }
                    `}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* =================================================
              SESSION TIME
          ================================================= */}

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
              Preferred Session Time
            </label>

            <select
              value={customSessionTime}
              onChange={(e) =>
                onCustomSessionTimeChange(
                  e.target.value
                )
              }
              className="
                h-10
                w-full
                rounded
                border
                border-[#143b28]
                bg-black
                px-3
                text-sm
                text-white
                outline-none
                focus:border-[#20dc73]/50
              "
            >
              <option value="">
                Select
              </option>

              <option value="morning">
                Morning
              </option>

              <option value="afternoon">
                Afternoon
              </option>

              <option value="evening">
                Evening
              </option>

              <option value="night">
                Night
              </option>
            </select>
          </div>

        </div>
      )}

      {/* =====================================================
          EXPECTED OUTCOME
      ===================================================== */}

      <div>
        <label className="mb-3 block text-xs uppercase tracking-[0.12em] text-white/50">
          Expected Training Outcomes
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          {TRAINING_OUTCOME_OPTIONS.map((item) => (
            <OptionButton
              key={item}
              label={item}
              active={expectedOutcome.includes(item)}
              onClick={() =>
                onOutcomeChange(
                  toggleArray(
                    expectedOutcome,
                    item
                  )
                )
              }
            />
          ))}
        </div>

        {expectedOutcome.includes("Custom") && (
          <div className="mt-4">
            <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
              Custom Expected Outcome
            </label>

            <textarea
              value={customExpectedOutcome}
              onChange={(e) =>
                onCustomExpectedOutcomeChange(
                  e.target.value
                )
              }
              rows={5}
              placeholder="Describe your expected training outcome..."
              className="
                w-full
                rounded-md
                border
                border-[#143b28]
                bg-black
                p-4
                text-white
                placeholder:text-white/30
                focus:border-[#20dc73]
                focus:outline-none
              "
            />
          </div>
        )}
      </div>

      {/* =====================================================
          DATES
      ===================================================== */}

      <div className="grid gap-4 md:grid-cols-2">

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
            Preferred Start Date
          </label>

          <input
            type="date"
            value={startDate}
            onChange={(e) =>
              onStartDateChange(
                e.target.value
              )
            }
            className="
              h-10
              w-full
              rounded
              border
              border-[#143b28]
              bg-black
              px-3
              text-sm
              text-white
              outline-none
              focus:border-[#20dc73]/50
            "
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
            Preferred Completion Date
          </label>

          <input
            type="date"
            value={completionDate}
            onChange={(e) =>
              onCompletionDateChange(
                e.target.value
              )
            }
            className="
              h-10
              w-full
              rounded
              border
              border-[#143b28]
              bg-black
              px-3
              text-sm
              text-white
              outline-none
              focus:border-[#20dc73]/50
            "
          />
        </div>

      </div>

      {/* =====================================================
          FLEXIBLE TIMELINE
      ===================================================== */}

      <label
        className="
          flex
          items-center
          gap-3
          rounded
          border
          border-[#143b28]
          p-3
        "
      >
        <input
          type="checkbox"
          checked={timelineFlexible}
          onChange={(e) =>
            onFlexibleChange(
              e.target.checked
            )
          }
          className="accent-[#20dc73]"
        />

        <span className="text-sm text-white/70">
          My schedule is flexible. ShadowNode
          may recommend better training dates.
        </span>
      </label>

    </div>
  )
}