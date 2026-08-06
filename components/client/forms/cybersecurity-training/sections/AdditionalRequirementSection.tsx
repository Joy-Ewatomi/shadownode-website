"use client"

type Props = {
  value: string
  onChange: (value: string) => void
}

export default function AdditionalRequirementsSection({
  value,
  onChange,
}: Props) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
        Additional Requirements
      </label>

      <textarea
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="min-h-24 w-full rounded-md border border-[#143b28] bg-black p-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#20dc73]/50"
        placeholder="Add any extra requirements, preferred tools, compliance needs, or special instructions..."
      />
    </div>
  )
}