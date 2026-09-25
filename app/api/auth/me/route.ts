import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { query } from "@/lib/db"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const account = await query<{ password_login_enabled: boolean }>(
    "SELECT password_login_enabled FROM app_users WHERE id = $1 LIMIT 1",
    [user.id],
  )
  return NextResponse.json(
    {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.totp_enabled,
        passwordLoginEnabled: account.rows[0]?.password_login_enabled === true,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  )
}
