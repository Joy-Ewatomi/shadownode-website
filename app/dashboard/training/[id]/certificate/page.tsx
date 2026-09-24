import { notFound, redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { ensureAccess } from "@/lib/services/training-operations-service"

export default async function RetiredCertificatePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  const { id } = await params
  try {
    await ensureAccess(id, user, false)
  } catch {
    notFound()
  }
  if (user.role === "client") redirect("/dashboard/client/certificates")
  redirect(`/dashboard/training/${id}/certificates`)
}
