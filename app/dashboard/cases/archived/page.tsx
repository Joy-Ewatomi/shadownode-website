import { redirect } from "next/navigation"

export default function ArchivedCasesPage() {
  redirect("/dashboard/cases?status=archived")
}
