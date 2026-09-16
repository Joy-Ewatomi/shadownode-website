import { notFound, redirect } from "next/navigation"

import TrainingShell from "@/components/training/TrainingShell"
import TrainingFeedback from "@/components/training/TrainingFeedback"

import { getCurrentUser } from "@/lib/auth"
import { ensureAccess } from "@/lib/services/training-operations-service"
import { query } from "@/lib/db"

type FeedbackRow = {
  id: string
  client_profile_id: string
  rating: number | string
  comments: string | null
  certificate_recipient_name: string | null
  created_at: string | null
}

type EngagementRow = {
  id: string
  engagement_number: string | null
  status: string | null
  progress: number | string | null
  training_goal: string | null
  client_profile_id: string | null
  training_client_type: string | null
  training_organization_name: string | null
  participant_count: number | string | null
}

type ParticipantRow = {
  id: string
  full_name: string
  email: string | null
  certificate_name: string
  organization_name: string | null
  status: string | null
  certificate_eligible: boolean | null
}

function normalizeStatus(
  value:
    | string
    | null
    | undefined,
): string {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/\s+/g, "_") ||
    "unknown"
  )
}

function formatDate(
  value:
    | string
    | null
    | undefined,
): string {
  if (!value) {
    return "Unknown date"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Unknown date"
  }

  return date.toLocaleString()
}

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{
    id: string
  }>
}) {
  const { id } = await params

  const user = await getCurrentUser()

  if (!user) {
    return redirect("/login")
  }

  /*
   * ============================================================
   * TRAINING ACCESS
   * ============================================================
   */

  let access:
    | {
        profileId: string | null
        role: string | null
      }
    | undefined

  try {
    access = await ensureAccess(
      id,
      user,
      false,
    )
  } catch {
    return notFound()
  }

  /*
   * ============================================================
   * LOAD ENGAGEMENT
   * ============================================================
   */

  const engagementResult =
    await query<EngagementRow>(
      `
        SELECT
          id,
          engagement_number,
          status,
          progress,
          training_goal,
          client_profile_id,
          training_client_type,
          training_organization_name,
          participant_count
        FROM training_engagements
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    )

  const engagement =
    engagementResult.rows[0]

  if (!engagement) {
    return notFound()
  }

  const progress = Number(
    engagement.progress || 0,
  )

  const feedbackUnlocked =
    Number.isFinite(progress) &&
    progress >= 100

  /*
   * ============================================================
   * LOAD FEEDBACK
   * ============================================================
   *
   * The certificate recipient name is now loaded from the same
   * feedback record.
   * ============================================================
   */

  let feedbackQuery = `
    SELECT
      id,
      client_profile_id,
      rating,
      feedback AS comments,
      certificate_recipient_name,
      created_at
    FROM training_feedback
    WHERE training_engagement_id = $1
  `

  const feedbackValues: string[] = [id]

  /*
   * Clients only see their own feedback.
   */

  if (user.role === "client") {
    const clientProfileId =
      access?.profileId ||
      engagement.client_profile_id

    if (!clientProfileId) {
      return notFound()
    }

    feedbackQuery += `
      AND client_profile_id = $2
    `

    feedbackValues.push(
      clientProfileId,
    )
  }

  feedbackQuery += `
    ORDER BY created_at DESC
  `

  const feedbackResult =
    await query<FeedbackRow>(
      feedbackQuery,
      feedbackValues,
    )

  const feedbacks =
    feedbackResult.rows.map(
      (feedback) => ({
        ...feedback,
        rating: Number(
          feedback.rating,
        ),
        created_at:
          feedback.created_at
            ? String(
                feedback.created_at,
              )
            : null,
        certificate_recipient_name:
          feedback.certificate_recipient_name
            ? String(
                feedback.certificate_recipient_name,
              ).trim() || null
            : null,
      }),
    )

  const feedbackSubmitted =
    feedbacks.length > 0

  let participants: ParticipantRow[] = []

  if (engagement.client_profile_id) {
    const participantResult =
      await query<ParticipantRow>(
        `
          SELECT
            id,
            full_name,
            email,
            certificate_name,
            organization_name,
            status,
            certificate_eligible
          FROM training_participants
          WHERE training_engagement_id = $1
            AND client_profile_id = $2
          ORDER BY created_at ASC
        `,
        [
          id,
          engagement.client_profile_id,
        ],
      )

    participants =
      participantResult.rows
  }

  /*
   * ============================================================
   * CLIENT / OPERATIONAL ROLE
   * ============================================================
   */

  const isClient =
    user.role === "client"

  /*
   * ============================================================
   * INITIAL FEEDBACK FOR FORM
   * ============================================================
   *
   * TrainingFeedback should receive the existing submitted
   * response when available, including the certificate name.
   * ============================================================
   */

  const initialFeedback =
    feedbacks.map(
      (feedback) => ({
        id: feedback.id,
        client_profile_id:
          feedback.client_profile_id,
        rating: feedback.rating,
        comments: feedback.comments,
        certificate_recipient_name:
          feedback.certificate_recipient_name,
        created_at:
          feedback.created_at,
      }),
    )

  return (
    <TrainingShell
      user={user}
      engagementId={id}
      engagementNumber={String(
        engagement.engagement_number ||
          id,
      )}
      title="Feedback"
      status={normalizeStatus(
        engagement.status,
      )}
    >
      <div className="space-y-6">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <section className="rounded-2xl border border-white/10 bg-[#07130f] p-6 shadow-xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
                Training Feedback
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                Training Feedback
              </h1>

              <p className="mt-2 text-sm text-white/45">
                Share your experience after
                completing the training engagement.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 md:min-w-[190px]">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                Overall Progress
              </p>

              <p className="mt-1 text-3xl font-semibold text-white">
                {Number.isFinite(progress)
                  ? `${Math.round(
                      Math.max(
                        0,
                        Math.min(
                          100,
                          progress,
                        ),
                      ),
                    )}%`
                  : "0%"}
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            CLIENT LOCK
        ===================================================== */}

        {isClient &&
          !feedbackUnlocked && (
            <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
                  🔒
                </div>

                <div>
                  <h2 className="font-semibold text-white">
                    Feedback is locked
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
                    Feedback becomes available only
                    after your training reaches 100%
                    overall completion.
                  </p>

                  <div className="mt-4 rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-xs text-white/45">
                    Current progress:{" "}
                    <span className="font-semibold text-white">
                      {Math.round(
                        Math.max(
                          0,
                          Math.min(
                            100,
                            progress,
                          ),
                        ),
                      )}
                      %
                    </span>

                    {" "}·{" "}

                    Required:{" "}
                    <span className="font-semibold text-emerald-300">
                      100%
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

        {/* =====================================================
            CLIENT ALREADY SUBMITTED
        ===================================================== */}

        {isClient &&
          feedbackUnlocked &&
          feedbackSubmitted && (
            <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                  ✓
                </div>

                <div>
                  <h2 className="font-semibold text-white">
                    Feedback submitted
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Thank you. Your training feedback
                    has already been submitted for this
                    engagement.
                  </p>

                  <p className="mt-3 text-xs text-white/30">
                    Feedback is a one-time submission and
                    cannot be submitted again.
                  </p>
                </div>
              </div>
            </section>
          )}

        {/* =====================================================
            CLIENT SUBMISSION FORM
        ===================================================== */}

        {isClient &&
          feedbackUnlocked &&
          !feedbackSubmitted && (
            <section className="rounded-2xl border border-[#143b28] bg-[#04100b]/60 p-6">
              <TrainingFeedback
                initialFeedback={
                  initialFeedback
                }
                engagementId={id}
                userRole={user.role}
                currentUserId={
                  user.id
                }
                clientType={
                  engagement.training_client_type
                }
                organizationName={
                  engagement.training_organization_name
                }
                participantCount={
                  Number(
                    engagement.participant_count ||
                      1,
                  )
                }
                initialParticipants={
                  participants
                }
              />
            </section>
          )}

        {/* =====================================================
            CLIENT SUBMITTED FEEDBACK
        ===================================================== */}

        {isClient &&
          feedbackUnlocked &&
          feedbackSubmitted && (
            <section className="rounded-2xl border border-white/10 bg-[#07130f] p-6">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                  Submitted Response
                </p>

                <h2 className="mt-1 text-xl font-semibold text-white">
                  Your Training Feedback
                </h2>
              </div>

              {feedbacks.map(
                (feedback) => (
                  <article
                    key={feedback.id}
                    className="rounded-xl border border-white/10 bg-white/[0.025] p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.13em] text-white/35">
                          Rating
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-lg tracking-wide text-amber-300">
                            {Array.from(
                              {
                                length: 5,
                              },
                              (
                                _,
                                index,
                              ) =>
                                index <
                                Number(
                                  feedback.rating,
                                )
                                  ? "★"
                                  : "☆",
                            ).join("")}
                          </span>

                          <span className="text-sm font-medium text-white/70">
                            {Number(
                              feedback.rating,
                            )}
                            /5
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-white/30">
                        Submitted{" "}
                        {formatDate(
                          feedback.created_at,
                        )}
                      </p>
                    </div>

                    {/* CERTIFICATE NAME */}

                    {feedback.certificate_recipient_name && (
                      <div className="mt-5 border-t border-white/10 pt-5">
                        <p className="text-xs uppercase tracking-[0.13em] text-white/35">
                          Certificate Name
                        </p>

                        <p className="mt-2 text-sm font-medium text-white">
                          {
                            feedback.certificate_recipient_name
                          }
                        </p>

                        <p className="mt-1 text-xs leading-5 text-white/35">
                          This is the name provided for the
                          Certificate of Completion.
                        </p>
                      </div>
                    )}

                    {/* COMMENTS */}

                    {feedback.comments && (
                      <div className="mt-5 border-t border-white/10 pt-5">
                        <p className="text-xs uppercase tracking-[0.13em] text-white/35">
                          Comments
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/60">
                          {feedback.comments}
                        </p>
                      </div>
                    )}
                  </article>
                ),
              )}
            </section>
          )}

        {/* =====================================================
            OPERATIONAL REVIEW
        ===================================================== */}

        {!isClient && (
          <section className="rounded-2xl border border-white/10 bg-[#07130f] p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                  Feedback Review
                </p>

                <h2 className="mt-1 text-xl font-semibold text-white">
                  Client Feedback
                </h2>
              </div>

              <div className="text-sm text-white/40">
                {feedbacks.length}{" "}
                submission
                {feedbacks.length ===
                1
                  ? ""
                  : "s"}
              </div>
            </div>

            {!feedbacks.length ? (
              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.025] p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/30">
                  —
                </div>

                <h3 className="mt-4 font-medium text-white">
                  No feedback submitted
                </h3>

                <p className="mt-1 text-sm text-white/40">
                  Client feedback will appear here
                  after the training is completed.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {feedbacks.map(
                  (feedback) => (
                    <article
                      key={feedback.id}
                      className="rounded-xl border border-white/10 bg-white/[0.025] p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-white/35">
                            Rating
                          </p>

                          <p className="mt-1 text-amber-300">
                            {Array.from(
                              {
                                length: 5,
                              },
                              (
                                _,
                                index,
                              ) =>
                                index <
                                Number(
                                  feedback.rating,
                                )
                                  ? "★"
                                  : "☆",
                            ).join("")}
                          </p>
                        </div>

                        <p className="text-xs text-white/30">
                          {formatDate(
                            feedback.created_at,
                          )}
                        </p>
                      </div>

                      {feedback.certificate_recipient_name && (
                        <div className="mt-4">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                            Certificate Name
                          </p>

                          <p className="mt-1 text-sm font-medium text-white/80">
                            {
                              feedback.certificate_recipient_name
                            }
                          </p>
                        </div>
                      )}

                      {feedback.comments && (
                        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/55">
                          {feedback.comments}
                        </p>
                      )}
                    </article>
                  ),
                )}
              </div>
            )}
          </section>
        )}

        {/* =====================================================
            CERTIFICATE NEXT STEP
        ===================================================== */}

        {isClient &&
          feedbackUnlocked &&
          feedbackSubmitted && (
            <section className="rounded-2xl border border-blue-400/20 bg-blue-400/[0.04] p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/10 text-blue-300">
                  ✓
                </div>

                <div>
                  <h2 className="font-semibold text-white">
                    Certificate unlocked
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Your training is complete and your
                    feedback has been submitted. The
                    certificate stage is now available.
                  </p>
                </div>
              </div>
            </section>
          )}
      </div>
    </TrainingShell>
  )
}
