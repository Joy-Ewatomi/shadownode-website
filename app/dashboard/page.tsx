import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"



export default async function Dashboard(){


const user = await getCurrentUser()

if (!user) {

redirect("/login")

}



switch(user.role){


case "client":

redirect("/dashboards/client")


case "investigator":

redirect("/dashboards/investigator")


case "analyst":

redirect("/dashboards/analyst")


case "administrator":

redirect("/dashboards/administrator")


case "super_administrator":

redirect("/dashboards/super-admin")


default:

redirect("/login")


}



}
