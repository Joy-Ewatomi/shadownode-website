"use client"

import {
  Menu,
  ShieldCheck,
} from "lucide-react"

type TrainingHeaderProps = {
  engagementNumber?: string | null
  title?: string | null
  status?: string | null
  onMenuClick?: () => void
}

export default function TrainingHeader({
  engagementNumber,
  title,
  status,
  onMenuClick,
}: TrainingHeaderProps) {
  return (
     <header className="flex min-h-20 items-center justify-between border-b border-[#143b28] bg-[#04100b] px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-white/55 hover:bg-white/5 hover:text-white lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#20dc73]" />

            <p className="truncate font-mono text-xs uppercase tracking-[0.15em] text-[#20dc73]">
              Training Engagement
            </p>
          </div>

          <h1 className="mt-1 truncate text-lg font-semibold text-white">
            {title || "Training Engagement"}
          </h1>

          {engagementNumber && (
            <p className="mt-0.5 font-mono text-[10px] text-white/35">
              {engagementNumber}
            </p>
          )}
        </div>
      </div>

      {status && (
        <div className="ml-4 shrink-0 rounded-full border border-[#20dc73]/30 bg-[#20dc73]/10 px-3 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#20dc73]">
            {status.replaceAll("_", " ")}
          </span>
        </div>
      )}
    </header>
  )
}
