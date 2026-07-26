import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"



export async function PATCH(

request:NextRequest,

{
params
}:
{
params:Promise<{id:string}>
}

){


try{


const {id}=await params

const body = await request.json()


const supabase = supabaseAdmin






// CHECK AUTH


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








if (user.role !== "admin") {


return NextResponse.json(

{
error:"Forbidden"
},

{
status:403
}

)

}









// UPDATE CASE


const {
data,
error
}

=
await supabase

.from("requests")

.update({

case_number:
body.case_number,

case_manager:
body.case_manager,

status:
body.status,


// pricing workflow

ai_price:
body.ai_price,

final_price:
body.final_price,


payment_status:
body.payment_status,


updated_at:
new Date().toISOString()

})

.eq(
"id",
id
)

.select()

.single()







if(error){


console.error(error)


return NextResponse.json(

{
error:"Failed to update case"
},

{
status:500
}

)

}







return NextResponse.json(data)



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
