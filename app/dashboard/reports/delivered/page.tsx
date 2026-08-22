import { redirect } from "next/navigation"

export default function DeliveredReportsPage() {
  redirect("/dashboard/reports?status=delivered")
}
