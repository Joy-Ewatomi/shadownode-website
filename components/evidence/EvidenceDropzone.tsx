"use client"

import { FileUp, X } from "lucide-react"
import { useRef, useState } from "react"

const ACCEPTED_EVIDENCE = "image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.mp4,.mov,.avi,.mp3,.wav,.zip"

export default function EvidenceDropzone({
  file,
  onFileChange,
  disabled = false,
  label = "Drop evidence here",
}: {
  file: File | null
  onFileChange: (file: File | null) => void
  disabled?: boolean
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  function selectFile(next: File | null | undefined) {
    if (!next || disabled) return
    onFileChange(next)
  }

  function clearFile() {
    if (inputRef.current) inputRef.current.value = ""
    onFileChange(null)
  }

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault()
        if (!disabled) setDragActive(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault()
        setDragActive(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragActive(false)
        selectFile(event.dataTransfer.files.item(0))
      }}
      className={`rounded-md border border-dashed p-3 transition ${dragActive ? "border-[#20dc73] bg-[#20dc73]/10" : "border-[#27543a] bg-black/20"} ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer hover:border-[#20dc73]/60"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EVIDENCE}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => selectFile(event.target.files?.[0])}
      />
      {file ? (
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{file.name}</p><p className="mt-1 text-xs text-white/45">{file.type || "unknown type"} · {file.size.toLocaleString()} bytes</p></div>
          <button type="button" onClick={clearFile} disabled={disabled} className="grid h-8 w-8 shrink-0 place-items-center rounded border border-white/15 text-white/55 hover:border-red-400/40 hover:text-red-300" aria-label="Remove selected evidence"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled} className="flex min-h-14 w-full items-center gap-3 text-left">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded border border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]"><FileUp className="h-4 w-4" /></span>
          <span><span className="block text-sm font-medium text-white/80">{label}</span><span className="mt-1 block text-xs text-white/45">Drag and drop a file, or browse from this device.</span></span>
        </button>
      )}
    </div>
  )
}
