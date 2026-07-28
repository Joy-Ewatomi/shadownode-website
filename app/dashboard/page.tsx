import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function Dashboard() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  switch (user.role) {
    case "client":
      redirect("/dashboard/client")

    case "investigator":
      redirect("/dashboard/investigator")

    case "analyst":
      redirect("/dashboard/analyst")

    case "administrator":
      redirect("/dashboard/administrator")

    case "super_administrator":
      redirect("/dashboard/super-administrator")

    default:
      redirect("/login")
  }
}