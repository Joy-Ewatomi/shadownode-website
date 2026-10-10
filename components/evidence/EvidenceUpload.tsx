"use client"

import { Upload } from "lucide-react"
import { useState } from "react"

import EvidenceDropzone from "./EvidenceDropzone"

export type EvidenceUploadResult = { id: string; file_hash?: string }

export default function EvidenceUpload({ caseId, onUploaded }: { caseId: string; onUploaded: (result: EvidenceUploadResult) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [evidenceType, setEvidenceType] = useState("digital")
  const [description, setDescription] = useState("")
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  async function upload() {
    if (!file) return
    setUploading(true)
    setProgress(20)
    setError("")

    const form = new FormData()
    form.append("file", file)
    form.append("evidence_type", evidenceType)
    form.append("description", description)

    setProgress(55)
    const res = await fetch(`/api/cases/${caseId}/evidence`, {
      method: "POST",
      credentials: "include",
      body: form,
    })

    setProgress(100)
    setUploading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Evidence upload failed")
      return
    }

    const data = await res.json().catch(() => ({}))

    setFile(null)
    setEvidenceType("digital")
    setDescription("")
    setProgress(0)
    onUploaded(data as EvidenceUploadResult)
  }

  return (
    <div className="rounded-md border border-[#143b28] bg-black/25 p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_11rem_1fr_auto]">
        <EvidenceDropzone file={file} onFileChange={setFile} disabled={uploading} label="Drop evidence file" />
        <input value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)} placeholder="Evidence type" className="h-10 rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/60" />
        <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Evidence description" className="h-10 rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/60" />
        <button onClick={upload} disabled={!file || uploading} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#20dc73] px-4 font-bold text-black disabled:opacity-50">
          <Upload className="h-4 w-4" />
          Upload
        </button>
      </div>
      {uploading ? <div className="mt-3 h-2 overflow-hidden rounded bg-[#143b28]"><div className="h-full bg-[#20dc73]" style={{ width: `${progress}%` }} /></div> : null}
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </div>
  )
}
