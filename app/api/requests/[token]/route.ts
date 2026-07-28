import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"



const supabaseUrl =
process.env.NEXT_PUBLIC_SUPABASE_URL!


const supabaseKey =
process.env.SUPABASE_SERVICE_ROLE_KEY!


const supabase =
createClient(
supabaseUrl,
supabaseKey
)





export async function GET(

_request:NextRequest,

{
params
}:
{
params:Promise<{token:string}>
}

){


try{


const {
token
}
=
await params






const {
data,
error
}
=
await supabase

.from("requests")

.select(
`
id,
case_number,
title,
service_type,
description,
timeline,
case_manager,
status,
created_at,
final_price,
currency,
is_anonymous
`
)

.eq(
"token",
token
)

.single()





if(error || !data){


return NextResponse.json(

{
error:"Request not found"
},

{
status:404
}

)

}







return NextResponse.json(

{


request_id:
data.id,


case_number:
data.case_number,


title:
data.title,


service_type:
data.service_type,


status:
data.status,


description:
data.description,


timeline:
data.timeline,


case_manager:
data.case_manager,


created_at:
data.created_at,


final_price:
data.final_price,


currency:
data.currency,


is_anonymous:
data.is_anonymous


}

)





}

catch(error){


console.error(
"Tracking error:",
error
)


return NextResponse.json(

{
error:"Failed to fetch request"
},

{
status:500
}

)


}


}
