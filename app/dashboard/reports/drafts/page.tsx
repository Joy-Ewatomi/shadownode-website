import { redirect } from "next/navigation"

export default function DraftReportsPage() {
  redirect("/dashboard/reports?status=drafts")
}
