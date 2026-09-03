import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { listModuleProgress, upsertModuleProgress, ensureAccess } from "@/lib/services/training-operations-service"

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  try {
    const { id } = await context.params
    const access = await ensureAccess(id, user, true)

    const profileId = access.profileId

    const progress = await listModuleProgress(id, profileId || undefined)

    return NextResponse.json({ success: true, progress })
  } catch (error: any) {
    return NextResponse.json({ error: String(error.message || error) }, { status: 403 })
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  try {
    const { id } = await context.params
    const access = await ensureAccess(id, user, true)

    // only trainer/admin can update progress
    if (!user || (user.role !== 'administrator' && user.role !== 'super_administrator' && user.role !== 'super-administrator' && user.role !== 'investigator' && user.role !== 'analyst')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    if (!body.moduleId || !body.clientProfileId) return NextResponse.json({ error: 'moduleId and clientProfileId are required' }, { status: 400 })

    const updated = await upsertModuleProgress(id, body.moduleId, body.clientProfileId, { status: body.status, completion_percentage: body.completion_percentage, trainer_notes: body.trainer_notes }, access.profileId)

    return NextResponse.json({ success: true, progress: updated })
  } catch (error: any) {
    return NextResponse.json({ error: String(error.message || error) }, { status: 400 })
  }
}
