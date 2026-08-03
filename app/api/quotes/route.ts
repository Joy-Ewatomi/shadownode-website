import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"


export async function GET(){

 const user = await getCurrentUser()

 if(!user){
   return NextResponse.json(
    {error:"Unauthorized"},
    {status:401}
   )
 }


 const result = await query(
 `
 SELECT
 id,
 case_number,
 title,
 service_type,
 status,
 approved_quote_amount,
 approved_quote_currency,
 approved_quote_notes,
 approved_estimated_completion,
 created_at

 FROM requests

 WHERE user_id=$1
 AND status IN ('quote_sent','negotiation_requested')

 ORDER BY created_at DESC
 `,
 [user.id]
 )


 return NextResponse.json(result.rows)

}