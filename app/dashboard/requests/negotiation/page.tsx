import { redirect } from "next/navigation"

export default function NegotiationRequestsPage() {
  redirect("/dashboard/requests?status=negotiation")
}
