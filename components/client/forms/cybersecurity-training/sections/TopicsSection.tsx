"use client"

import FormInput from "../FormInput"
import { TRAINING_TOPICS } from "../constants"
import { toggleArray } from "../helpers"

type Props = {
  topics: string[]
  customTopic: string

  onTopicsChange: (topics: string[]) => void
  onCustomTopicChange: (value: string) => void
}

export default function TopicsSection({
  topics,
  customTopic,
  onTopicsChange,
  onCustomTopicChange,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <label className="mb-3 block text-xs uppercase tracking-[0.12em] text-white/50">
          Training Topics
        </label>

        <p className="mb-3 text-sm text-white/50">
          Select the topics you would like this training to cover.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {TRAINING_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() =>
                onTopicsChange(toggleArray(topics, topic))
              }
              className={`rounded border p-3 text-left transition ${
                topics.includes(topic)
                  ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                  : "border-[#143b28] text-white/70 hover:border-[#20dc73]/40"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {topics.includes("Custom") && (
        <FormInput
          label="Custom Topic"
          value={customTopic}
          onChange={onCustomTopicChange}
          placeholder="Describe your custom topic"
        />
      )}
    </div>
  )
}