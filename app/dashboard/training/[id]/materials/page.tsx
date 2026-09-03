import { getCurrentUser } from "@/lib/auth"
import { listMaterials } from "@/lib/services/training-operations-service"
import MaterialsManager from "@/components/training/MaterialsManager"

export default async function TrainingMaterialsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await getCurrentUser()

  const materials = await listMaterials(id)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-white/40">Training</p>

        <h1 className="mt-2 text-2xl font-semibold text-white">Materials</h1>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6 text-white/60">
        <MaterialsManager initialMaterials={materials} engagementId={id} userRole={user?.role || null} />
      </div>
    </div>
  )
}
