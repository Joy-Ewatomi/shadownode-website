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
      <div className="min-h-screen bg-transparent text-white">
        <div className="relative flex min-h-screen">

          <Sidebar
            user={user}
            open={sidebarOpen}
            onClose={handleSidebarClose}
          />

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
    </ClientNotificationProvider>
  )
}
