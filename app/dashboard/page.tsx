import {redirect} from "next/navigation"


async function getUser(){

const res =
await fetch(
"http://localhost:3000/api/auth/me",
{
cache:"no-store"
}
)


return res.json()

}



export default async function Dashboard(){


const user = await getUser()



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