import { notFound, redirect } from "next/navigation"
import TrainingShell from "@/components/training/TrainingShell"
import TrainingFeedback from "@/components/training/TrainingFeedback"
import { getCurrentUser } from "@/lib/auth"
import { ensureAccess } from "@/lib/services/training-operations-service"
import { query } from "@/lib/db"

export default async function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await getCurrentUser()
  if (!user) return redirect('/login')

  try {
    await ensureAccess(id, user, false)
  } catch (err) {
    return notFound()
  }

  const engRes = await query(`SELECT id, engagement_number, status, training_goal FROM training_engagements WHERE id = $1 LIMIT 1`, [id])
  const engagement = engRes.rows[0]
  if (!engagement) return notFound()

  // Use schema columns: client_profile_id and feedback
  const res = await query(`SELECT id, client_profile_id, rating, feedback AS comments, created_at FROM training_feedback WHERE training_engagement_id = $1 ORDER BY created_at DESC`, [id])
  const feedbacks = res.rows.map((f: any) => ({ ...f, created_at: f.created_at ? String(f.created_at) : null }))

  return (
    <TrainingShell user={user} engagementId={id} engagementNumber={String(engagement.engagement_number || id)} title={`Feedback`} status={String(engagement.status || 'unknown')}>
      <div className="space-y-6">
        <section className="rounded-xl border border-[#143b28] bg-[#04100b]/60 p-6">
          <TrainingFeedback initialFeedback={feedbacks} engagementId={id} userRole={user.role} currentUserId={user.id} />
        </section>
      </div>
    </TrainingShell>
  )
}

