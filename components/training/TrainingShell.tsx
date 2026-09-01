"use client"

import { useState } from "react"

import TrainingSidebar from "@/components/training/TrainingSidebar"
import TrainingHeader from "@/components/training/TrainingHeader"

import type { AppUser } from "@/lib/auth"

type TrainingShellProps = {
  user: AppUser
  engagementId: string
  engagementNumber: string
  title: string
  status: string
  children: React.ReactNode
}

export default function TrainingShell({
  user,
  engagementId,
  engagementNumber,
  title,
  status,
  children,
}: TrainingShellProps) {
  const [sidebarOpen, setSidebarOpen] =
    useState(false)

  return (
    <div className="min-h-screen bg-[#020806] text-white">
      <TrainingSidebar
        user={user}
        engagementId={engagementId}
        open={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
      />

      <div className="lg:pl-64">
        <TrainingHeader
          engagementNumber={engagementNumber}
          title={title}
          status={status}
          onMenuClick={() =>
            setSidebarOpen(true)
          }
        />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}