import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function resolveCaseId(caseId: string) {
  if (!caseId) {
    return null
  }

  if (isUuid(caseId)) {
    return caseId
  }

  const result = await query<{ id: string }>(
    `SELECT id FROM cases WHERE case_number = $1 OR id::text = $1 LIMIT 1`,
    [caseId]
  )

  return result.rows[0]?.id ?? null
}

// GET ALL ENTITIES FOR A CASE
export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string
    }>
  }
) {

  try {

    const { id } = await context.params
    const resolvedCaseId = await resolveCaseId(id)

    if (!resolvedCaseId) {
      return NextResponse.json([], { status: 200 })
    }

    const result = await query(
      `
      SELECT
        id,
        name,
        entity_type,
        description,
        verification_status,
        confidence_score,
        created_at,
        updated_at

      FROM investigation_entities

      WHERE case_id = $1

      ORDER BY created_at DESC
      `,
      [resolvedCaseId]
    )


    return NextResponse.json(
      result.rows,
      {
        status:200
      }
    )


  } catch(error){

    console.error(
      "GET ENTITIES ERROR:",
      error
    )


    return NextResponse.json(
      {
        error:"Failed to load entities"
      },
      {
        status:500
      }
    )

  }

}





// CREATE NEW ENTITY
export async function POST(
  req: NextRequest,
  context:{
    params: Promise<{
      id:string
    }>
  }
){

  try {


    const {id}=await context.params
    const resolvedCaseId = await resolveCaseId(id)

    if (!resolvedCaseId) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      )
    }

    const body=await req.json()



    if(!body.name){

      return NextResponse.json(
        {
          error:"Entity name required"
        },
        {
          status:400
        }
      )

    }



    const result = await query(
      `
      INSERT INTO investigation_entities
      (
        case_id,
        entity_type,
        name,
        description,
        verification_status,
        confidence_score
      )

      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
      )

      RETURNING *
      `,
      [
        resolvedCaseId,
        body.entity_type ?? "UNKNOWN",
        body.name,
        body.description ?? null,
        body.verification_status ?? "unverified",
        Number(body.confidence_score ?? 0)
      ]
    )



    return NextResponse.json(
      result.rows[0],
      {
        status:201
      }
    )



  }catch(error){


    console.error(
      "CREATE ENTITY ERROR:",
      error
    )


    return NextResponse.json(
      {
        error:"Failed to create entity"
      },
      {
        status:500
      }
    )

  }

}