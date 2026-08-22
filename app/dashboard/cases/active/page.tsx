import { redirect } from "next/navigation"

export default function ActiveCasesPage() {
  redirect("/dashboard/cases?status=active")
}
