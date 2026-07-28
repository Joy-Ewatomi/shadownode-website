import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import ClientCasePortal from "./ClientCasePortal"

export default async function ClientCasePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (user.role !== "client") {
    redirect("/403")
  }

  const { id } = await params

  return <ClientCasePortal caseId={id} />
}
