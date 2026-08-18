"use client"

import { TRAINING_OBJECTIVES } from "../constants"
import { toggleArray } from "../helpers"

type Props = {
  objectives: string[]
  customObjective: string

  onChange: (value: string[]) => void
  onCustomChange: (value: string) => void
}

export default function ObjectivesSection({
  objectives,
  customObjective,
  onChange,
  onCustomChange,
}: Props) {
  return (
    <div className="space-y-4">

      <div>
        <label className="mb-3 block text-xs uppercase tracking-[0.12em] text-white/50">
          Training Objectives
        </label>

        <p className="mb-3 text-sm text-white/50">
          Select the primary goals this training should achieve.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {TRAINING_OBJECTIVES.map((objective) => (
            <button
              key={objective}
              type="button"
              onClick={() =>
                onChange(
                  toggleArray(objectives, objective)
                )
              }
              className={`rounded border p-3 text-left transition ${
                objectives.includes(objective)
                  ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                  : "border-[#143b28] text-white/70 hover:border-[#20dc73]/40"
              }`}
            >
              {objective}
            </button>
          ))}
        </div>
      </div>

      {objectives.includes("custom") && (
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
            Custom Training Objective
          </label>

          <textarea
            value={customObjective}
            onChange={(e) =>
              onCustomChange(e.target.value)
            }
            rows={5}
            placeholder="Describe your training objective..."
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
  )
}