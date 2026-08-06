import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireUser } from "@/lib/auth"


export async function GET(
  request: NextRequest
) {

  try {

    const { user, response } =
      await requireUser()


    if (!user) {
      return response
    }


    const result =
      await query(
        `
        SELECT
          id,
          case_number,
          title,
          description,
          service_type,
          status,
          priority,
          progress,
          created_at,
          updated_at

        FROM cases

        WHERE client_email=$1

        ORDER BY created_at DESC
        `,
        [
          user.email
        ]
      )


    return NextResponse.json(
      result.rows
    )


  } catch(error){

    console.error(
      "CASES LIST ERROR",
      error
    )


    return NextResponse.json(
      {
        error:"Failed to fetch cases"
      },
      {
        status:500
      }
    )

  }

}