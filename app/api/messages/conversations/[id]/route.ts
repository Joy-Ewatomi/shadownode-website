import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"



export async function GET(

_request:NextRequest,

{
params
}:
{
params:Promise<{id:string}>
}

){


try{


const {id}=await params



const supabase = supabaseAdmin






// AUTH CHECK

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








// VERIFY CASE OWNERSHIP


const {
data:caseData,
error:caseError
}

=
await supabase

.from("requests")

.select("id")

.eq(
"id",
id
)

.eq(
"user_id",
user.id
)

.single()






if(caseError || !caseData){


return NextResponse.json(

{
error:"Case not found"
},

{
status:404
}

)

}








// FETCH MESSAGES


const {
data,
error
}

=
await supabase

.from("messages")

.select(`
id,
sender,
sender_name,
content,
created_at
`)

.eq(
"case_id",
id
)

.order(
"created_at",
{
ascending:true
}
)







if(error){


console.error(
"Message error:",
error
)


return NextResponse.json(

{
error:"Failed to fetch messages"
},

{
status:500
}

)

}





return NextResponse.json(
data || []
)






}

catch(error){


console.error(
"Server error:",
error
)


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
