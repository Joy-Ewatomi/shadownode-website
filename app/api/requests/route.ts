import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireUser } from "@/lib/auth"


export async function GET(
  request: NextRequest,
  {
    params
  }: {
    params: Promise<{ id:string }>
  }
){

  const { user, response } = await requireUser()


  if(!user){
    return response
  }


  try {

    const { id } = await params


    const { rows } = await query(
      `
      SELECT
        id,
        case_number,
        client_email,
        title,
        service_type,
        description,
        timeline,
        status,
        priority,
        ai_price_estimate,
        ai_complexity,
        ai_confidence,
        ai_reasoning,
        approved_quote_amount,
        approved_quote_currency,
        created_at

      FROM requests

      WHERE id=$1

      LIMIT 1
      `,
      [
        id
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



    return NextResponse.json(
      rows[0]
    )



  } catch(error){

    console.error(
      "REQUEST DETAIL ERROR",
      error
    )


    return NextResponse.json(
      {
        error:"Failed to load request"
      },
      {
        status:500
      }
    )

  }

}