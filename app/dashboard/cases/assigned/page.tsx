import { redirect } from "next/navigation"

export default function AssignedCasesPage() {
  redirect("/dashboard/cases?status=assigned")
}
