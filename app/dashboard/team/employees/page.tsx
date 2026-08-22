import { redirect } from "next/navigation"

export default function EmployeesPage() {
  redirect("/dashboard/team?view=employees")
}
