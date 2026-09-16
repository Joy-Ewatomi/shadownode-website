import { redirect } from "next/navigation"

export default function WaitingClientCasesPage() {
  redirect("/dashboard/cases?status=waiting_client")
}
