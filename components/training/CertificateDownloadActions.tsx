"use client"

import { Download, FileImage, Loader2 } from "lucide-react"
import { useState } from "react"

export default function CertificateDownloadActions({
  engagementId,
  certificateId,
}: {
  engagementId: string
  certificateId: string
}) {
  const [downloading, setDownloading] = useState<"pdf" | "png" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function download(format: "pdf" | "png") {
    if (downloading) return
    setDownloading(format)
    setError(null)
    try {
      const response = await fetch(
        `/api/training/${encodeURIComponent(engagementId)}/certificate/download?format=${format}&certificateId=${encodeURIComponent(certificateId)}`,
        { credentials: "include", cache: "no-store" },
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || "Certificate download failed.")
      }
      const blob = await response.blob()
      const disposition = response.headers.get("content-disposition") || ""
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `ShadowNode-Certificate.${format}`
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Certificate download failed.")
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="min-w-0">
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" disabled={Boolean(downloading)} onClick={() => download("pdf")} className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md bg-[#20dc73] px-3 text-xs font-semibold text-black transition hover:bg-[#37e684] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60" aria-label="Download certificate as PDF">
          {downloading === "pdf" ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
          <span className="break-words">Download certificate (PDF)</span>
        </button>
        <button type="button" disabled={Boolean(downloading)} onClick={() => download("png")} className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md border border-white/15 px-3 text-xs font-semibold text-white/70 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20dc73] disabled:cursor-wait disabled:opacity-60" aria-label="Download certificate as PNG image">
          {downloading === "png" ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <FileImage className="h-4 w-4" aria-hidden="true" />}
          <span className="break-words">Download image (PNG)</span>
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  )
}
