import { NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET() {
  try {

    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }


    if (!isAdminRole(user.role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }


    const requests = await query(`
      SELECT
        r.*,

        u.username AS client_username,
        u.email AS account_email,

        COALESCE(
          r.client_email,
          u.email
        ) AS client_email

      FROM requests r

      LEFT JOIN app_users u
        ON u.id = r.user_id

      ORDER BY r.created_at DESC
    `)


    return NextResponse.json(
      requests.rows
    )


  } catch(error){

    console.error(
      "ADMIN REQUESTS GET ERROR:",
      error
    )

    return NextResponse.json(
      {
        error:"Failed to fetch requests"
      },
      {
        status:500
      }
    )
  }
}