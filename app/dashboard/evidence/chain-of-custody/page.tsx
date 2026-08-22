import { redirect } from "next/navigation"

export default function ChainOfCustodyPage() {
  redirect("/dashboard/evidence?view=chain-of-custody")
}
