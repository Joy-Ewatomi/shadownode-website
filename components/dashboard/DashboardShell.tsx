"use client"

import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

import type { AppUser } from "@/lib/auth"
import { ClientNotificationProvider } from "@/components/notifications/ClientNotificationProvider"

import Header from "./Header"
import Sidebar from "./Sidebar"

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

  function handleSidebarClose() {
    setSidebarOpen(false)
  }

  return (
    <ClientNotificationProvider>
      <div className="h-svh overflow-hidden bg-transparent text-white">
        <div className="relative flex h-full overflow-hidden">

          <Sidebar
            user={user}
            open={sidebarOpen}
            onClose={handleSidebarClose}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:pl-72">
            <Header
              user={user}
              onMenuClick={() => setSidebarOpen(true)}
            />

            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </ClientNotificationProvider>
  )
}
