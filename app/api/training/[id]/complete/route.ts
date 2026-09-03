import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserProfileId } from "@/lib/services/training-operations-service"
import { completeTrainingEngagement } from "@/lib/services/training-completion-service"

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileId = await getUserProfileId(user.id)

  if (!profileId) return NextResponse.json({ error: 'User profile not found' }, { status: 400 })

  try {
    const { id } = await context.params
    const result = await completeTrainingEngagement(id, profileId)
    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 400 })
  }
}
