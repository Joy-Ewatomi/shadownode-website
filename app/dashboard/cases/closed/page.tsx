import { redirect } from "next/navigation"

export default function ClosedCasesPage() {
  redirect("/dashboard/cases?status=closed")
}
