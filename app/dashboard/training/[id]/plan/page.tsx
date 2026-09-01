export default async function TrainingPlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-white/40">
          Training
        </p>

        <h1 className="mt-2 text-2xl font-semibold text-white">
          Training Plan
        </h1>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6 text-white/60">
        Training plan workspace for engagement {id}.
      </div>
    </div>
  )
}
