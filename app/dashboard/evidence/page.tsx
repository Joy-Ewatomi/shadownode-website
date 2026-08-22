import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"
import { profileIdForUser } from "@/lib/investigation-workspace"

type EvidenceRow = {
  id: string
  case_id: string
  case_number: string
  case_title: string
  file_name: string
  file_size: number | null
  file_type: string | null
  file_hash: string | null
  evidence_type: string | null
  description: string | null
  uploaded_by: string | null
  created_at: string
}

export default async function EvidencePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const profileId = await profileIdForUser(user.id)
  const isAdmin = isAdminRole(user.role)

  const { rows } = await query<EvidenceRow>(
    `
    SELECT
      ff.id,
      ff.case_id,
      c.case_number,
      c.title AS case_title,
      ff.file_name,
      ff.file_size,
      ff.file_type,
      ff.file_hash,
      ff.evidence_type,
      ff.description,
      uploader.username AS uploaded_by,
      ff.created_at
    FROM forensic_files ff
    JOIN cases c ON c.id = ff.case_id
    LEFT JOIN user_profiles uploader_profile ON uploader_profile.id = ff.uploaded_by
    LEFT JOIN app_users uploader ON uploader.id = uploader_profile.user_id
    WHERE
      $1::boolean = TRUE
      OR c.client_profile_id = $2::uuid
      OR c.assigned_to = $2::uuid
      OR EXISTS (
        SELECT 1
        FROM case_assignments ca
        WHERE ca.case_id = c.id
          AND ca.assigned_to = $2::uuid
          AND ca.removed_at IS NULL
      )
    ORDER BY ff.created_at DESC
    `,
    [isAdmin, profileId],
  )

  return (
    <main className="space-y-6">
      <header className="border-b border-[#143b28] pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">Evidence Vault</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Evidence</h1>
        <p className="mt-2 text-sm text-white/55">Authenticated forensic files attached to visible cases.</p>
      </header>

      <section className="rounded-md border border-[#143b28] bg-[#06110f]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#143b28] px-5 py-4">
          <h2 className="font-semibold text-white">Vault Files</h2>
          <span className="rounded border border-[#20dc73]/30 px-2 py-1 text-xs text-[#20dc73]">{rows.length} records</span>
        </div>

        <div className="divide-y divide-[#143b28]">
          {!rows.length ? (
            <p className="p-5 text-sm text-white/45">No evidence has been uploaded for your visible cases.</p>
          ) : null}

          {rows.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/cases/${item.case_id}/evidence`}
              className="block p-5 transition hover:bg-white/5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-all font-mono text-xs text-[#20dc73]">{item.case_number}</p>
                  <h3 className="mt-2 break-words font-semibold text-white">{item.file_name}</h3>
                  <p className="mt-1 break-words text-sm text-white/50">{item.case_title}</p>
                </div>
                <span className="rounded border border-[#20dc73]/25 px-2 py-1 text-xs text-[#20dc73]">
                  {item.evidence_type || "evidence"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-xs text-white/50 md:grid-cols-4">
                <Info label="Type" value={item.file_type || "unknown"} />
                <Info label="Size" value={`${item.file_size ?? 0} bytes`} />
                <Info label="Uploaded By" value={item.uploaded_by || "unknown"} />
                <Info label="Uploaded" value={new Date(item.created_at).toLocaleString()} />
              </div>

              {item.file_hash ? (
                <p className="mt-3 break-all font-mono text-xs text-white/45">SHA-256: {item.file_hash}</p>
              ) : null}
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded border border-[#143b28] bg-black/25 p-3">
      <p className="uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className="mt-1 break-words text-white/70">{value}</p>
    </div>
  )
}
