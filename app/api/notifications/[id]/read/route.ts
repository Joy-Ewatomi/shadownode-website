import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id:string }> }
) {

  const user = await getCurrentUser()

  if(!user){
    return NextResponse.json(
      {error:"Unauthorized"},
      {status:401}
    )
  }

  const {id}=await params

  await query(
    `
    UPDATE notifications
    SET is_read=true
    WHERE id=$1
    AND user_id=$2
    `,
    [
      id,
      user.id
    ]
  )


  return NextResponse.json({
    success:true
  })

}