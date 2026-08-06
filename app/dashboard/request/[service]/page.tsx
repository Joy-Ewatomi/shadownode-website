import { notFound } from "next/navigation"

import { SERVICE_REGISTRY } from "@/lib/services"

import RequestBuilder from "@/components/request-builder/RequestBuilder"


type Props = {

params: Promise<{
service:string
}>

}



export default async function RequestServicePage({
params
}:Props){


const { service: serviceId } = await params


const service =
SERVICE_REGISTRY[
serviceId
]


if(!service){

notFound()

}



async function submit(){

"use server"


// Temporary placeholder.
// Next we connect this to the request API.

console.log(
"Submitting request:",
service.id
)

}



const initialData = {}



return (

<div className="mx-auto w-full max-w-7xl px-4 py-8">

<RequestBuilder

service={service}

submit={submit}

submitting={false}

/>

</div>

)


}