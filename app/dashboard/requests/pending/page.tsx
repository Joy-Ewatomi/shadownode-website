import { redirect } from "next/navigation"

export default function PendingRequestsPage() {
  redirect("/dashboard/requests?status=pending")
}
