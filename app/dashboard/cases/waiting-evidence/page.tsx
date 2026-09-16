import { redirect } from "next/navigation"

export default function WaitingEvidenceCasesPage() {
  redirect("/dashboard/cases?status=waiting_evidence")
}
