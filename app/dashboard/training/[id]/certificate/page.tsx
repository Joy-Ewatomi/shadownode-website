import { notFound, redirect } from "next/navigation"

import TrainingShell from "@/components/training/TrainingShell"
import TrainingCertificate from "@/components/training/TrainingCertificate"

import { getCurrentUser } from "@/lib/auth"
import {
  ensureAccess,
  isApprovedTrainerForEngagement,
} from "@/lib/services/training-operations-service"
import { query } from "@/lib/db"

function isSuperAdminRole(
  role: string | null | undefined,
) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const user = await getCurrentUser()

  if (!user) {
    return redirect("/login")
  }

  let access

  try {
    /*
     * Certificate viewing is an engagement-access operation.
     *
     * We do NOT require trainer access here because:
     *
     * - Client should be able to view their certificate
     * - Super Admin should be able to view any certificate
     * - Approved trainer can view the certificate
     * - Admin can view the certificate where their normal
     *   training access allows it
     *
     * Issuing the certificate is authorized separately below.
     */
    access = await ensureAccess(
      id,
      user,
      false,
    )
  } catch {
    return notFound()
  }

  const engRes = await query(
    `
      SELECT
        id,
        engagement_number,
        status,
        training_goal
      FROM training_engagements
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  )

  const engagement = engRes.rows[0]

  if (!engagement) {
    return notFound()
  }

  const certificateRes = await query(
    `
      SELECT
        id,
        certificate_number,
        recipient_name,
        issued_at,
        verification_url
      FROM training_certificates
      WHERE training_engagement_id = $1
      LIMIT 1
    `,
    [id],
  )

  const certificateRow =
    certificateRes.rows[0]

  const certificate = certificateRow
    ? {
        ...certificateRow,
        issued_at: certificateRow.issued_at
          ? String(certificateRow.issued_at)
          : null,
      }
    : null

  /*
   * Certificate issuance authority:
   *
   * 1. Super Administrator
   * 2. Approved trainer assigned to this engagement
   *
   * Being an Administrator, Investigator, or Analyst alone
   * is NOT enough.
   */
  let canIssueCertificate = false

  if (isSuperAdminRole(user.role)) {
    canIssueCertificate = true
  } else {
    canIssueCertificate =
      await isApprovedTrainerForEngagement(
        id,
        user,
        access.profileId,
      )
  }

  /*
   * A certificate cannot be issued while one already exists.
   *
   * This is only a UI decision. The API and completion
   * service remain the real security/business boundaries.
   */
  const showIssueCertificate =
    !certificate && canIssueCertificate

  return (
    <TrainingShell
      user={user}
      engagementId={id}
      engagementNumber={String(
        engagement.engagement_number || id,
      )}
      title="Certificate"
      status={String(
        engagement.status || "unknown",
      )}
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-[#143b28] bg-[#04100b]/60 p-6">
          <TrainingCertificate
            certificate={certificate}
            engagementId={id}
            userRole={user.role}
            canIssueCertificate={
              showIssueCertificate
            }
          />
        </section>
      </div>
    </TrainingShell>
  )
}