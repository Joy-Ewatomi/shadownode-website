import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { query } from "@/lib/db"


export async function GET(
 req:Request,
{
 params
}: {
 params: Promise<{id:string}>
}
){


const {user,response}=await requireUser()


if(!user){
 return response
}



const { id } = await params

const { rows } = await query(
`
SELECT

id,
case_number,
title,
service_type,
description,
status,

approved_quote_amount,
approved_quote_currency,
approved_quote_notes,

approved_estimated_completion,

created_at

FROM requests

WHERE id=$1

AND client_email=$2

LIMIT 1

`,
[
id,
user.email
]

)



if(!rows[0]){

return NextResponse.json(
{
error:"Request not found"
},
{
status:404
}
)

}



return NextResponse.json(rows[0])


}