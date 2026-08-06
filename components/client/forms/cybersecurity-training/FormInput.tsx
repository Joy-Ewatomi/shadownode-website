"use client"

type FormInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}

export default function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: FormInputProps) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#20dc73]/50"
      />
    </div>
  )
}