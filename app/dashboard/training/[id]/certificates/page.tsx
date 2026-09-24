import { notFound } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import {
  ensureAccess,
  isApprovedTrainerForEngagement,
} from "@/lib/services/training-operations-service"
import CertificateManagementList, {
  type CertificateParticipant,
} from "@/components/training/CertificateManagementList"

function isSuperAdmin(role: string) {
  return role === "super_administrator" || role === "super-administrator"
}

export default async function TrainingCertificatesPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return notFound()
  const { id } = await params
  let access
  try {
    access = await ensureAccess(id, user, false)
  } catch {
    return notFound()
  }

  const result = await query<{
    id: string
    full_name: string
    email: string | null
    certificate_name: string
    certificate_eligible: boolean
    certificate_id: string | null
    certificate_number: string | null
    certificate_status: string | null
  }>(
    `SELECT tp.id, tp.full_name, tp.email, tp.certificate_name, tp.certificate_eligible,
       tc.id AS certificate_id, tc.certificate_number, tc.status AS certificate_status
     FROM training_participants tp
     LEFT JOIN training_certificates tc ON tc.training_participant_id = tp.id
     WHERE tp.training_engagement_id = $1 AND tp.status <> 'inactive'
     ORDER BY tp.created_at ASC`,
    [id],
  )
  const participants: CertificateParticipant[] = result.rows.map((row) => ({
    id: row.id,
    certificateName: row.certificate_name?.trim() || row.full_name?.trim() || "Certificate recipient",
    email: row.email,
    eligible: row.certificate_eligible === true,
    certificateId: row.certificate_id,
    certificateNumber: row.certificate_number,
    certificateStatus: row.certificate_status,
  }))
  const canIssue = isSuperAdmin(user.role)
    || await isApprovedTrainerForEngagement(id, user, access.profileId)

  return (
    <div className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">Certificate Registry</p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Training certificates</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">Issue eligible certificates where authorized, or download issued certificates as PDF and PNG files.</p>
      </header>
      <CertificateManagementList engagementId={id} participants={participants} canIssue={canIssue} />
    </div>
  )
}
