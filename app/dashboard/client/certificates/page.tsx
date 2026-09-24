import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"
import { getUserProfileId } from "@/lib/services/training-operations-service"

import ClientCertificateList, {
  type ClientCertificateListItem,
} from "./ClientCertificateList"

function toNullableString(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  const result = String(value).trim()

  return result || null
}

export default async function ClientCertificatesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (user.role !== "client") {
    redirect("/dashboard")
  }

  const profileId = await getUserProfileId(user.id)

  if (!profileId) {
    return (
      <div className="space-y-6">
        <header className="border-b border-[#143b28] pb-6">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
            Training Registry
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            Certificates
          </h1>
        </header>

        <div className="rounded-md border border-[#143b28] bg-[#06110f] p-8 text-sm text-white/55">
          No client profile was found for this account.
        </div>
      </div>
    )
  }

  const result = await query(
    `
      SELECT
        tc.id,
        tc.training_engagement_id,
        tc.training_participant_id,
        tc.certificate_number,
        tc.recipient_name,
        tc.organization_name,
        tc.training_title,
        tc.training_type,
        tc.issued_at,
        tc.status,
        tc.verification_url,
        te.engagement_number
      FROM training_certificates tc
      JOIN training_engagements te
        ON te.id = tc.training_engagement_id
      WHERE tc.client_profile_id = $1
        AND te.client_profile_id = $1
      ORDER BY
        tc.issued_at DESC NULLS LAST,
        tc.created_at DESC
    `,
    [profileId],
  )

  const certificates: ClientCertificateListItem[] =
    result.rows.map((row) => ({
      id: toNullableString(row.id) || "",
      training_engagement_id:
        toNullableString(
          row.training_engagement_id,
        ) || "",
      training_participant_id:
        toNullableString(
          row.training_participant_id,
        ),
      certificate_number:
        toNullableString(
          row.certificate_number,
        ) || "Certificate",
      recipient_name:
        toNullableString(
          row.recipient_name,
        ) || "Certificate Recipient",
      organization_name:
        toNullableString(
          row.organization_name,
        ),
      training_title:
        toNullableString(
          row.training_title,
        ) || "Training Certificate",
      training_type:
        toNullableString(
          row.training_type,
        ),
      issued_at:
        toNullableString(
          row.issued_at,
        ),
      status:
        toNullableString(row.status) ||
        "issued",
      verification_url:
        toNullableString(
          row.verification_url,
        ),
      engagement_number:
        toNullableString(
          row.engagement_number,
        ),
    }))

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#20dc73]">
          Training Registry
        </p>

        <div>
          <h1 className="text-3xl font-bold text-white">
            Certificates
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
            Download issued certificates as official PDF files
            or high-resolution PNG images, and verify each credential
            through the public ShadowNode registry.
          </p>
        </div>
      </header>

      <ClientCertificateList
        certificates={certificates}
      />
    </div>
  )
}
