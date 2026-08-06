"use client"

type OptionButtonProps = {
  active: boolean
  label: string
  onClick: () => void
}

export default function OptionButton({
  active,
  label,
  onClick,
}: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border p-3 text-left transition ${
        active
          ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
          : "border-[#143b28] text-white/70 hover:border-white/30"
      }`}
    >
      {label}
    </button>
  )
}