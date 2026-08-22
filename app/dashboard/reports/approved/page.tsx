import { redirect } from "next/navigation"

export default function ApprovedReportsPage() {
  redirect("/dashboard/reports?status=approved")
}
