"use client"

import type { ElementType } from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  FolderOpen,
  TrendingUp,
  Activity,
  MessageSquare,
  Award,
  X,
} from "lucide-react"

import type { AppUser } from "@/lib/auth"
import { hasPermission } from "@/lib/permission"

type TrainingSidebarProps = {
  user: AppUser
  engagementId: string
  open?: boolean
  onClose?: () => void
}

type TrainingNavItem = {
  label: string
  href: string
  icon: ElementType
  permission: Parameters<typeof hasPermission>[1]
}

export default function TrainingSidebar({
  user,
  engagementId,
  open = true,
  onClose,
}: TrainingSidebarProps) {
  const pathname = usePathname()

  const base = `/dashboard/training/${engagementId}`

  const items: TrainingNavItem[] = [
    {
      label: "Overview",
      href: base,
      icon: LayoutDashboard,
      permission: "training:view",
    },
    {
      label: "Training Plan",
      href: `${base}/plan`,
      icon: BookOpen,
      permission: "training:view",
    },
    {
      label: "Schedule",
      href: `${base}/schedule`,
      icon: CalendarDays,
      permission: "training:view",
    },
    {
      label: "Materials",
      href: `${base}/materials`,
      icon: FolderOpen,
      permission: "training:materials",
    },
    {
      label: "Progress",
      href: `${base}/progress`,
      icon: TrendingUp,
      permission: "training:progress",
    },
    {
      label: "Updates",
      href: `${base}/updates`,
      icon: Activity,
      permission: "training:updates",
    },
    {
      label: "Feedback",
      href: `${base}/feedback`,
      icon: MessageSquare,
      permission: "training:feedback",
    },
    {
      label: "Certificate",
      href: `${base}/certificate`,
      icon: Award,
      permission: "training:certificate",
    },
  ]

  const visibleItems = items.filter((item) =>
    hasPermission(user, item.permission),
  )

  function isActive(href: string) {
    if (href === base) {
      return pathname === href
    }

    return pathname.startsWith(href)
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition lg:hidden ${
          open
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#143b28] bg-[#04100b] transition-transform lg:translate-x-0 ${
          open
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* HEADER */}

        <div className="flex h-20 items-center justify-between border-b border-[#143b28] px-5">
          <Link
            href={
              user.role === "client"
                ? "/dashboard/client/training"
                : "/dashboard/training"
            }
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#20dc73]/40 bg-[#20dc73]/10 font-mono text-sm font-bold text-[#20dc73]">
              SN
            </div>

            <div>
              <p className="font-mono text-xs font-bold tracking-[0.12em] text-white">
                TRAINING
              </p>

              <p className="text-[10px] uppercase tracking-[0.15em] text-[#20dc73]">
                Engagement
              </p>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="rounded-md p-2 text-white/50 hover:bg-white/5 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ENGAGEMENT ID */}

        <div className="border-b border-[#143b28] px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/35">
            Engagement
          </p>

          <p className="mt-1 truncate font-mono text-xs text-[#20dc73]">
            {engagementId}
          </p>
        </div>

        {/* NAVIGATION */}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm transition ${
                  active
                    ? "border border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />

                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* SECURITY STATUS */}

        <div className="border-t border-[#143b28] p-4">
          <div className="rounded-md border border-[#143b28] bg-black/30 p-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#20dc73] shadow-[0_0_8px_#20dc73]" />

              <span className="text-[11px] uppercase tracking-[0.12em] text-white/50">
                Engagement Secure
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
