import { redirect } from "next/navigation"

export default function PendingReportsPage() {
  redirect("/dashboard/reports?status=pending")
}
