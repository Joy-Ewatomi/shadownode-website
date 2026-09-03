"use client"

import type { AppUser } from "@/lib/auth"

import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Package,
  TrendingUp,
  X,
} from "lucide-react"

import Link from "next/link"
import { usePathname } from "next/navigation"

const roleLabels: Record<string, string> = {
  client: "Client",
  investigator: "Investigator",
  analyst: "Analyst",
  administrator: "Administrator",
  super_administrator: "Super Administrator",
  "super-administrator": "Super Administrator",
}

export default function TrainingSidebar({
  user,
  open,
  onClose,
  onExit,
}: {
  user: AppUser
  open: boolean
  onClose: () => void
  onExit: () => void
}) {
  const pathname = usePathname()

  const trainingId = getTrainingId(pathname)

  const basePath = trainingId
    ? `/dashboard/training/${trainingId}`
    : "/dashboard/training"

  const navigation = [
    {
      label: "Training Overview",
      href: basePath,
      icon: LayoutDashboard,
      exact: true,
    },
    ...(trainingId
      ? [
          {
            label: "Training Plan",
            href: `${basePath}/plan`,
            icon: BookOpen,
            exact: false,
          },
          {
            label: "Schedule",
            href: `${basePath}/schedule`,
            icon: CalendarDays,
            exact: false,
          },
          {
            label: "Materials",
            href: `${basePath}/materials`,
            icon: Package,
            exact: false,
          },
          {
            label: "Progress",
            href: `${basePath}/progress`,
            icon: TrendingUp,
            exact: false,
          },
          {
            label: "Updates",
            href: `${basePath}/updates`,
            icon: MessageSquare,
            exact: false,
          },
          {
            label: "Feedback",
            href: `${basePath}/feedback`,
            icon: CheckCircle2,
            exact: false,
          },
          {
            label: "Certificate",
            href: `${basePath}/certificate`,
            icon: Award,
            exact: false,
          },
        ]
      : []),
  ]

  function isActive(
    href: string,
    exact: boolean,
  ) {
    if (exact) {
      return pathname === href
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    )
  }

  return (
    <>
      {/* MOBILE OVERLAY */}

      <div
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition lg:hidden ${
          open
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* SIDEBAR */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#143b28] bg-[#04100b] transition-transform lg:translate-x-0 ${
          open
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        {/* BRAND */}

        <div className="flex h-20 items-center justify-between border-b border-[#143b28] px-5">
          <Link
            href="/dashboard/training"
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#20dc73]/40 bg-[#20dc73]/10 font-mono font-bold text-[#20dc73]">
              SN
            </div>

            <div>
              <p className="font-mono text-sm font-bold tracking-[0.12em] text-white">
                SHADOWNODE
              </p>

              <p className="text-[11px] uppercase tracking-[0.18em] text-[#20dc73]">
                Training Bureau
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-white/55 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close training sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* USER */}

        <div className="border-b border-[#143b28] px-5 py-4">
          <p className="truncate text-sm font-semibold text-white">
            {user.username}
          </p>

          <p className="truncate text-xs text-white/45">
            {user.email}
          </p>

          <span className="mt-3 inline-flex rounded border border-[#20dc73]/30 bg-[#20dc73]/10 px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-[#20dc73]">
            {roleLabels[user.role] ||
              user.role}
          </span>
        </div>

        {/* TRAINING LABEL */}

        <div className="border-b border-[#143b28] px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#20dc73]/60">
            Training Workspace
          </p>

          <p className="mt-1 text-xs text-white/40">
            Training operations
          </p>
        </div>

        {/* NAVIGATION */}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            const active = isActive(
              item.href,
              item.exact,
            )

            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm transition ${
                  active
                    ? "border border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]"
                    : "text-white/68 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />

                <span className="truncate">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* BACK TO MAIN DASHBOARD */}

        <div className="border-t border-[#143b28] p-4">
          <button
            type="button"
            onClick={onExit}
            className="flex w-full items-center gap-3 rounded-md border border-[#143b28] bg-black/30 px-3 py-3 text-sm text-white/60 transition hover:border-[#20dc73]/30 hover:bg-[#20dc73]/5 hover:text-[#20dc73]"
          >
            <ArrowLeft className="h-4 w-4" />

            <span>
              Back to Dashboard
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}

function getTrainingId(
  pathname: string,
): string | null {
  const match =
    pathname.match(
      /^\/dashboard\/training\/([^/]+)/,
    )

  return match?.[1] || null
}