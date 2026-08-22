import { redirect } from "next/navigation"

export default function RejectedRequestsPage() {
  redirect("/dashboard/requests?status=rejected")
}
