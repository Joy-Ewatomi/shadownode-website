import { redirect } from "next/navigation"

export default function NewClientRequestPage() {
  redirect("/dashboard/client/requests#new-request")
}