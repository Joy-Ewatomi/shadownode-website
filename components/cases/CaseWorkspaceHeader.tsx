"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronUp, FolderKanban } from "lucide-react"
import { useState } from "react"

export default function CaseWorkspaceHeader({ caseId }: { caseId: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(!pathname.endsWith("/graph"))

  if (!open) {
    return <div className="flex min-h-11 items-center justify-between border-b border-[#143b28] px-2 text-white/55">
      <span className="inline-flex items-center gap-2 text-xs"><FolderKanban className="h-4 w-4 text-[#20dc73]" />Case workspace</span>
      <button type="button" onClick={() => setOpen(true)} aria-expanded="false" className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs hover:bg-white/5 hover:text-white"><ChevronDown className="h-4 w-4" />Open</button>
    </div>
  }

  return <div className="min-w-0 rounded-lg border border-[#143b28] bg-[#06100c] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold text-[#20dc73]">Case Workspace</h1>
        <p className="break-all text-sm text-white/50">Case ID: {caseId}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm text-green-400">ACTIVE</span>
        <button type="button" onClick={() => setOpen(false)} aria-expanded="true" className="inline-flex h-9 items-center gap-2 rounded-md border border-[#143b28] px-3 text-xs text-white/55 hover:bg-white/5 hover:text-white"><ChevronUp className="h-4 w-4" />Close</button>
      </div>
    </div>
    <div className="mt-6 max-w-full overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]">
      <nav className="flex w-max min-w-full gap-5 text-sm text-white/60" aria-label="Case workspace sections">
        <Link className="shrink-0 whitespace-nowrap" href={`/cases/${caseId}`}>Case Overview</Link>
        <Link className="shrink-0 whitespace-nowrap" href={`/cases/${caseId}/graph`}>Entities</Link>
        <Link className="shrink-0 whitespace-nowrap" href={`/cases/${caseId}/timeline`}>Timeline</Link>
        <Link className="shrink-0 whitespace-nowrap" href={`/cases/${caseId}/evidence`}>Evidence</Link>
        <Link className="shrink-0 whitespace-nowrap" href={`/cases/${caseId}/reports`}>Reports</Link>
        <Link className="shrink-0 whitespace-nowrap" href={`/cases/${caseId}/updates`}>Case Activity</Link>
      </nav>
    </div>
  </div>
}
