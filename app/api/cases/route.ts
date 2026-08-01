import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireInvestigationWorkspace } from "@/lib/investigation-workspace"


export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>
  }
) {

  try {

    const { id } = await params


    const access =
      await requireInvestigationWorkspace(
        request,
        id
      )


    if (!access.ok) {
      return NextResponse.json(
        {
          error: access.error,
        },
        {
          status: access.status,
        }
      )
    }



    const result =
      await query(
        `
        SELECT
          c.id,
          c.case_number,
          c.title,
          c.description,
          c.service_type,
          c.status,
          c.priority,
          c.progress,
          c.budget,
          c.payment_status,
          c.estimated_completion,
          c.started_at,
          c.completed_at,
          c.created_at,
          c.updated_at,

          up.username AS investigator_username

        FROM cases c

        LEFT JOIN user_profiles up
          ON up.id = c.assigned_to

        WHERE c.id=$1

        LIMIT 1
        `,
        [
          access.caseId
        ]
      )



    if (!result.rows.length) {

      return NextResponse.json(
        {
          error:"Case not found"
        },
        {
          status:404
        }
      )

    }



    return NextResponse.json(
      result.rows[0]
    )


  } catch(error){

    console.error(
      "CASE API ERROR",
      error
    )


    return NextResponse.json(
      {
        error:"Failed to fetch case"
      },
      {
        status:500
      }
    )

  }

}