import { redirect } from "next/navigation"

export default function EvidenceUploadsPage() {
  redirect("/dashboard/evidence?view=uploads")
}
