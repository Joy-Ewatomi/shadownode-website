import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { listMaterials, createMaterial, updateMaterial, deleteMaterial, ensureAccess } from "@/lib/services/training-operations-service"

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  try {
    const { id } = await context.params
    await ensureAccess(id, user, true)
    const materials = await listMaterials(id)
    return NextResponse.json({ success: true, materials })
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

    const created = await createMaterial(id, body, access.profileId)

    return NextResponse.json({ success: true, material: created })
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

    if (!body.materialId) return NextResponse.json({ error: 'materialId is required' }, { status: 400 })

    const updated = await updateMaterial(body.materialId, body.updates || {}, access.profileId)

    return NextResponse.json({ success: true, material: updated })
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

    if (!body.materialId) return NextResponse.json({ error: 'materialId is required' }, { status: 400 })

    const result = await deleteMaterial(body.materialId, access.profileId)

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    return NextResponse.json({ error: String(error.message || error) }, { status: 400 })
  }
}
