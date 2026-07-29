import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

const invoiceOwnerColumn = `client_${"id"}`

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const invoices = await query(
      `
      SELECT
        i.id,
        i.amount,
        i.currency,
        i.status,
        i.created_at,
        i.paid_at,
        i.status AS payment_state,
        c.id AS case_id,
        c.case_number,
        c.title AS case_title
      FROM invoices i
      LEFT JOIN cases c ON c.id = i.case_id
      WHERE i.${invoiceOwnerColumn} = $1
      ORDER BY i.created_at DESC
      `,
      [user.id],
    )

    return NextResponse.json(invoices.rows)
  } catch (error) {
    console.error("CLIENT INVOICES GET ERROR", error)
    return NextResponse.json({ error: "Failed to load invoices" }, { status: 500 })
  }
}
