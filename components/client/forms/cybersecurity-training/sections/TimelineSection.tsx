"use client"

import { TRAINING_DURATION_OPTIONS, TRAINING_OUTCOME_OPTIONS } from "../constants"
import OptionButton from "../OptionButton"

type Props = {
  duration: string

  expectedOutcome: string
  customExpectedOutcome: string

  startDate: string
  completionDate: string

  timelineFlexible: boolean

  onDurationChange: (value: string) => void
  onOutcomeChange: (value: string) => void

  onCustomExpectedOutcomeChange: (value: string) => void

  onStartDateChange: (value: string) => void
  onCompletionDateChange: (value: string) => void

  onFlexibleChange: (value: boolean) => void
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
}: Props) {

  return (
    <div className="space-y-6">


      {/* TRAINING DURATION */}

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




      {/* EXPECTED OUTCOME */}

      <div>

        <label className="mb-3 block text-xs uppercase tracking-[0.12em] text-white/50">
          Expected Outcome
        </label>


        <div className="grid gap-3 sm:grid-cols-2">

          {TRAINING_OUTCOME_OPTIONS.map((item) => (

            <OptionButton
              key={item}
              label={item}
              active={expectedOutcome === item}
              onClick={() =>
                onOutcomeChange(item)
              }
            />

          ))}

        </div>



        {/* CUSTOM EXPECTED OUTCOME */}

        {expectedOutcome === "custom" && (

          <div className="mt-4">

            <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
              Custom Expected Outcome
            </label>


            <textarea

              value={customExpectedOutcome}

              onChange={(e)=>
                onCustomExpectedOutcomeChange(
                  e.target.value
                )
              }

              rows={5}

              placeholder="Describe the expected training outcome..."

              className="
                w-full rounded-md
                border border-[#143b28]
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





      {/* TIMELINE */}

      <div className="grid gap-4 md:grid-cols-2">


        <div>

          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
            Preferred Start Date
          </label>


          <input

            type="date"

            value={startDate}

            onChange={(e)=>
              onStartDateChange(
                e.target.value
              )
            }

            className="
              h-10 w-full rounded
              border border-[#143b28]
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

            onChange={(e)=>
              onCompletionDateChange(
                e.target.value
              )
            }


            className="
              h-10 w-full rounded
              border border-[#143b28]
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





      {/* FLEXIBLE TIMELINE */}

      <label className="
        flex
        items-center
        gap-3
        rounded
        border
        border-[#143b28]
        p-3
      ">


        <input

          type="checkbox"

          checked={timelineFlexible}

          onChange={(e)=>
            onFlexibleChange(
              e.target.checked
            )
          }

          className="accent-[#20dc73]"

        />



        <span className="text-sm text-white/70">

          My schedule is flexible. ShadowNode may recommend better training dates.

        </span>


      </label>


    </div>
  )
}