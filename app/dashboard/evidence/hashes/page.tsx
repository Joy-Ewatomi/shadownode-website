import { redirect } from "next/navigation"

export default function EvidenceHashesPage() {
  redirect("/dashboard/evidence?view=hashes")
}
