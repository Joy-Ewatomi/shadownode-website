import { redirect } from "next/navigation"

export default function InProgressCasesPage() {
  redirect("/dashboard/cases?status=active")
}
