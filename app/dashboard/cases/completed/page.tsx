import { redirect } from "next/navigation"

export default function CompletedCasesPage() {
  redirect("/dashboard/cases?status=completed")
}
