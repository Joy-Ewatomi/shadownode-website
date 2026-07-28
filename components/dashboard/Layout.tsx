import DashboardShell from "@/components/dashboard/DashboardShell";
import type { AppUser } from "@/lib/auth";


export default function Layout({
children,
user
}:{
children:React.ReactNode
user:AppUser
}){


return (

<DashboardShell user={user}>

{children}

</DashboardShell>


)

}
