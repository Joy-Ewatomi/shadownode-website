import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { normalizePermanentRole } from "@/lib/role-access"

export default async function DashboardPage(){

 const user = await getCurrentUser()

 if(!user){
   redirect("/login")
 }


 switch(normalizePermanentRole(user.role)){

  case "client":
    redirect("/dashboard/client")

  case "staff":
    redirect("/dashboard/staff")

  case "administrator":
    redirect("/dashboard/administrator")

  case "super_administrator":
    redirect("/dashboard/super-administrator")

  default:
    redirect("/403")
 }

}
