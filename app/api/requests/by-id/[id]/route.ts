import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(
  req: Request,
  context: {
    params: Promise<{
      id: string
    }>
  }
) {
  const { id } = await context.params

  const result = await query(
    `SELECT *
     FROM requests
     WHERE id = $1
     LIMIT 1`,
    [id]
  )

  if (result.rows.length === 0) {
    return NextResponse.json(
      {
        error: "Request not found",
      },
      {
        status: 404,
      }
    )
  }

  return NextResponse.json(result.rows[0])
}