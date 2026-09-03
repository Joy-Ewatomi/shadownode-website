import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  listModules,
  createModule,
  updateModule,
  deleteModule,
  ensureAccess,
} from "@/lib/services/training-operations-service"

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  try {
    const { id } = await context.params
    await ensureAccess(id, user, true)

    const modules = await listModules(id)

    return NextResponse.json({ success: true, modules })
  } catch (error: any) {
    return NextResponse.json({ error: String(error.message || error) }, { status: 403 })
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  try {
    const { id } = await context.params
    const access = await ensureAccess(id, user, true)

    // only trainer/admin can create
    if (!user || (user.role !== 'administrator' && user.role !== 'super_administrator' && user.role !== 'super-administrator' && user.role !== 'investigator' && user.role !== 'analyst')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    const profileId = access.profileId

    const created = await createModule(id, { title: body.title, description: body.description, objectives: body.objectives, module_order: body.module_order }, profileId)

    return NextResponse.json({ success: true, module: created })
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

    if (!body.moduleId) return NextResponse.json({ error: 'moduleId is required' }, { status: 400 })

    const updated = await updateModule(body.moduleId, body.updates || {}, access.profileId)

    return NextResponse.json({ success: true, module: updated })
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

    if (!body.moduleId) return NextResponse.json({ error: 'moduleId is required' }, { status: 400 })

    const result = await deleteModule(body.moduleId, access.profileId)

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    return NextResponse.json({ error: String(error.message || error) }, { status: 400 })
  }
}
