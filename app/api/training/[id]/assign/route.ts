import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { assignTrainer } from "@/lib/services/training-operations-service"
import { query } from "@/lib/db"

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  if (!user || (user.role !== "administrator" && user.role !== "super_administrator" && user.role !== "super-administrator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()

  const { id } = await context.params
  if (!body.trainerProfileId) return NextResponse.json({ error: 'trainerProfileId is required' }, { status: 400 })

  // Validate trainerProfileId refers to an active user with a trainer-capable role
  const validRes = await query(
    `
      SELECT au.role, au.status
      FROM user_profiles up
      JOIN app_users au ON au.id = up.user_id
      WHERE up.id = $1
      LIMIT 1
    `,
    [body.trainerProfileId],
  )

  const profileRow = validRes.rows[0] as { role: string | null; status: string | null } | undefined
  if (!profileRow) {
    return NextResponse.json({ error: "Trainer profile not found" }, { status: 404 })
  }

  const allowedRoles = ["investigator", "analyst"]
  if (!profileRow.role || !allowedRoles.includes(profileRow.role) || profileRow.status !== "active") {
    return NextResponse.json({ error: "Target profile is not authorized to act as a trainer" }, { status: 403 })
  }

  try {
    // actor profile id from admin
    // admin may act via their profile id if available in request context; we don't require it for now
    await assignTrainer(id, body.trainerProfileId, null)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 400 })
  }
}
