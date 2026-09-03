"use client"

import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

import type { AppUser } from "@/lib/auth"

import Header from "./Header"
import Sidebar from "./Sidebar"
import TrainingSidebar from "./TrainingSidebar"

export default function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: AppUser
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const pathname = usePathname()
  const router = useRouter()

  const isTrainingWorkspace =
    pathname === "/dashboard/training" ||
    pathname.startsWith("/dashboard/training/")

  function handleSidebarClose() {
    setSidebarOpen(false)
  }

  function handleTrainingExit() {
    setSidebarOpen(false)

    if (user.role === "client") {
      router.push("/dashboard")
      return
    }

    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-transparent text-white">
      <div className="relative flex min-h-screen">

        {isTrainingWorkspace ? (
          <TrainingSidebar
            user={user}
            open={sidebarOpen}
            onClose={handleSidebarClose}
            onExit={handleTrainingExit}
          />
        ) : (
          <Sidebar
            user={user}
            open={sidebarOpen}
            onClose={handleSidebarClose}
          />
        )}

        <div className="min-w-0 flex-1 lg:pl-72">
          <Header
            user={user}
            onMenuClick={() => setSidebarOpen(true)}
          />

          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}