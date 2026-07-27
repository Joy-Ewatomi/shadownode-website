import Sidebar from "./Sidebar";
import Header from "./Header";


export default function DashboardShell({
children
}:{
children:React.ReactNode
}){

return (

<div className="
min-h-screen
bg-[#020604]
text-white
flex
">


<Sidebar />


<div className="
flex-1
">

<Header />


<main className="
p-6
">

{children}

</main>


</div>


</div>

)

}