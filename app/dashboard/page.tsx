import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

export default async function DashboardPage(){

 const user = await getCurrentUser()

 if(!user){
   redirect("/login")
 }


 switch(user.role){

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
    redirect("/403")
 }

}