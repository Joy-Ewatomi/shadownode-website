import { redirect } from "next/navigation"

export default function ArchivedRequestsPage() {
  redirect("/dashboard/requests?status=archived")
}
