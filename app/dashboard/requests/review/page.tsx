import { redirect } from "next/navigation"

export default function ReviewRequestsPage() {
  redirect("/dashboard/requests?status=review")
}
