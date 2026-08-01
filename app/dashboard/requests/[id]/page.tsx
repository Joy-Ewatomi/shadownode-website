import { getCurrentUser } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import RequestReviewCard from "@/components/requests/RequestReviewCard"


export default async function RequestDetailPage({
params
}:{
params:Promise<{
id:string
}>
}){


const user = await getCurrentUser()


if(!user){
redirect("/login")
}


const {id}=await params



const res = await fetch(
`${process.env.NEXT_PUBLIC_APP_URL}/api/requests/${id}`,
{
cache:"no-store"
}
)



if(!res.ok){
notFound()
}



const request = await res.json()



return (

<div className="space-y-6">


<header className="border-b border-[#143b28] pb-6">


<p className="font-mono text-xs uppercase tracking-[0.2em] text-[#20dc73]">
Request Investigation
</p>


<h1 className="mt-2 text-3xl font-bold text-white">
{request.title}
</h1>


<p className="text-white/50">
{request.case_number}
</p>


</header>



<RequestReviewCard
request={request}
/>


</div>

)

}