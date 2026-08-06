"use client"

import FormInput from "../FormInput"

type Props = {
  organizationName: string
  participantCount: string
  clientType: string
  skillLevel: string

  onOrganizationNameChange: (value: string) => void
  onParticipantCountChange: (value: string) => void
  onClientTypeChange: (value: string) => void
  onSkillLevelChange: (value: string) => void
}

export default function OrganizationSection({
  organizationName,
  participantCount,
  clientType,
  skillLevel,
  onOrganizationNameChange,
  onParticipantCountChange,
  onClientTypeChange,
  onSkillLevelChange,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          label="Organization Name"
          value={organizationName}
          onChange={onOrganizationNameChange}
        />

        <FormInput
          label="Expected Number of Learners"
          value={participantCount}
          onChange={onParticipantCountChange}
          placeholder="e.g. 25"
        />
      </div>

      <div>
        <label className="mb-3 block text-xs uppercase tracking-[0.12em] text-white/50">
          Client Type
        </label>

        <div className="grid grid-cols-2 gap-3">
          {["individual", "organization"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onClientTypeChange(type)}
              className={`rounded border p-3 capitalize transition ${
                clientType === type
                  ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                  : "border-[#143b28] text-white/70"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-3 block text-xs uppercase tracking-[0.12em] text-white/50">
          Current Skill Level
        </label>

        <div className="grid grid-cols-3 gap-3">
          {["beginner", "intermediate", "advanced"].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onSkillLevelChange(level)}
              className={`rounded border p-3 capitalize transition ${
                skillLevel === level
                  ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                  : "border-[#143b28] text-white/70"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}