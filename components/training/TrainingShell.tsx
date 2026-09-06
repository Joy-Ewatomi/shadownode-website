"use client"

import TrainingHeader from "@/components/training/TrainingHeader"

import type { AppUser } from "@/lib/auth"

type TrainingShellProps = {
  user: AppUser
  engagementId: string
  engagementNumber: string
  title: string
  status: string
  isAssignedTrainer?: boolean
  children: React.ReactNode
}

export default function TrainingShell({
  user,
  engagementId,
  engagementNumber,
  title,
  status,
  isAssignedTrainer = false,
  children,
}: TrainingShellProps) {
  return (
   <div className="min-h-screen bg-[#020806] text-white">
          <TrainingHeader
            engagementNumber={engagementNumber}
            title={title}
            status={status}
          />

          <main className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
  )
}