import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  listSessions,
  createSession,
  updateSession,
  deleteSession,
  ensureAccess,
} from "@/lib/services/training-operations-service"

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  try {
    const { id } = await context.params
    await ensureAccess(id, user, true)
    const sessions = await listSessions(id)
    return NextResponse.json({ success: true, sessions })
  } catch (error: any) {
    return NextResponse.json({ error: String(error.message || error) }, { status: 403 })
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  try {
    const { id } = await context.params
    const access = await ensureAccess(id, user, true)

    if (!user || (user.role !== 'administrator' && user.role !== 'super_administrator' && user.role !== 'super-administrator' && user.role !== 'investigator' && user.role !== 'analyst')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const created = await createSession(id, body, access.profileId)

    return NextResponse.json({ success: true, session: created })
  } catch (error: any) {
    return NextResponse.json({ error: String(error.message || error) }, { status: 400 })
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  try {
    const { id } = await context.params
    const access = await ensureAccess(id, user, true)

    if (!user || (user.role !== 'administrator' && user.role !== 'super_administrator' && user.role !== 'super-administrator' && user.role !== 'investigator' && user.role !== 'analyst')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    if (!body.sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })

    const updated = await updateSession(body.sessionId, body.updates || {}, access.profileId)

    return NextResponse.json({ success: true, session: updated })
  } catch (error: any) {
    return NextResponse.json({ error: String(error.message || error) }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  try {
    const { id } = await context.params
    const access = await ensureAccess(id, user, true)

    if (!user || (user.role !== 'administrator' && user.role !== 'super_administrator' && user.role !== 'super-administrator' && user.role !== 'investigator' && user.role !== 'analyst')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    if (!body.sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })

    const result = await deleteSession(body.sessionId, access.profileId)

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    return NextResponse.json({ error: String(error.message || error) }, { status: 400 })
  }
}
