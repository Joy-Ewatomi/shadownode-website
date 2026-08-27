import { NextRequest, NextResponse } from "next/server"
import { auditLog, getCurrentUser, isAdminRole } from "@/lib/auth"
import { query } from "@/lib/db"

const invoiceOwnerColumn = `client_${"id"}`

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (!isAdminRole(user.role)) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  return { user }
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth.response) return auth.response

    const invoices = await query(
      `
      SELECT i.*, c.case_number, c.title AS case_title, u.email AS client_email
      FROM invoices i
      LEFT JOIN cases c ON c.id = i.case_id
      LEFT JOIN app_users u ON u.id = i.${invoiceOwnerColumn}
      ORDER BY i.created_at DESC
      `,
    )

    return NextResponse.json(invoices.rows)
  } catch (error) {
    console.error("ADMIN INVOICES GET ERROR", error)
    return NextResponse.json({ error: "Failed to load invoices" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth.response) return auth.response

    const { case_id, user_id, amount, currency, status } = await request.json()
    if (!user_id || !amount) return NextResponse.json({ error: "Client and amount required" }, { status: 400 })

  const quoteResult = await query(
  `
  SELECT approved_quote_amount, approved_quote_currency
  FROM requests
  WHERE id = $1
  `,
  [case_id]
)

const approvedQuote = quoteResult.rows[0]

const finalCurrency =
  currency || approvedQuote?.approved_quote_currency || "USD"

const finalAmount =
  amount || approvedQuote?.approved_quote_amount || 0

    const inserted = await query(
      `
      INSERT INTO invoices (case_id, ${invoiceOwnerColumn}, amount, currency, status, paid_at)
      VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 = 'paid' THEN NOW() ELSE NULL END)
      RETURNING *
      `,
      [
  case_id || null,
  user_id,
  Number(finalAmount),
  finalCurrency,
  status || "draft"
]
    )

    await auditLog(auth.user?.id || null, "invoice_created", request, { invoice_id: inserted.rows[0].id, case_id, user_id })

    return NextResponse.json(inserted.rows[0], { status: 201 })
  } catch (error) {
    console.error("ADMIN INVOICES POST ERROR", error)
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 })
  }
}
