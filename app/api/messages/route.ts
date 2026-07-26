import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"



export async function POST(
request:NextRequest
){


try{


const {
case_id,
content
}
=
await request.json()



if(!case_id || !content){

return NextResponse.json(
{
error:"Case ID and content required"
},
{
status:400
}
)

}




const supabase = supabaseAdmin



const user = await getCurrentUser()



if(!user){

return NextResponse.json(
{
error:"Unauthorized"
},
{
status:401
}
)

}





// verify case belongs to user


const {
data:caseData
}
=
await supabase
.from("requests")
.select("id")
.eq("id",case_id)
.eq(
"user_id",
user.id
)
.single()



if(!caseData){

return NextResponse.json(
{
error:"Case not found"
},
{
status:404
}
)

}





const {
data,
error
}
=
await supabase
.from("messages")
.insert({

case_id,

sender_id:user.id,

sender_role:"client",

sender_name:"Client",

content,

encrypted:true

})
.select()
.single()



if(error){

console.error(error)

return NextResponse.json(
{
error:error.message
},
{
status:500
}
)

}




return NextResponse.json(
data,
{
status:201
}
)



}

catch(error){


console.error(error)


return NextResponse.json(
{
error:"Server error"
},
{
status:500
}
)

}


}
