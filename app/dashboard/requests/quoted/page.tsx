import { redirect } from "next/navigation"

export default function QuotedRequestsPage() {
  redirect("/dashboard/requests?status=quoted")
}
