import { redirect } from "next/navigation"

export default function ApprovedRequestsPage() {
  redirect("/dashboard/requests?status=approved")
}
