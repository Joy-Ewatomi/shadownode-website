"use client"

import React, { useState } from "react"

type FeedbackItem = {
  id: string
  client_profile_id: string
  rating: number | string
  comments: string | null
  certificate_recipient_name: string | null
  created_at: string | null
}

type CertificateRecipient = {
  full_name: string
  certificate_name: string
  email?: string | null
}

type TrainingFeedbackProps = {
  initialFeedback?: FeedbackItem[]
  engagementId: string
  userRole: string
  currentUserId: string
  clientType?: string | null
  organizationName?: string | null
  participantCount?: number | null
  initialParticipants?: CertificateRecipient[]
}

export default function TrainingFeedback({
  initialFeedback = [],
  engagementId,
  userRole,
  currentUserId,
  clientType = null,
  organizationName = null,
  participantCount = 1,
  initialParticipants = [],
}: TrainingFeedbackProps) {
  const [feedback, setFeedback] =
    useState<FeedbackItem[]>(initialFeedback)

  const [rating, setRating] =
    useState(5)

  const [comments, setComments] =
    useState("")

  const [certificateRecipientName, setCertificateRecipientName] =
    useState("")

  const isOrganizationTraining =
    String(clientType || "")
      .toLowerCase()
      .includes("organization") ||
    Boolean(organizationName) ||
    Number(participantCount || 1) > 1

  const [certificateRecipients, setCertificateRecipients] =
    useState<CertificateRecipient[]>(
      initialParticipants.length > 0
        ? initialParticipants.map(
            (participant) => ({
              full_name:
                participant.full_name ||
                participant.certificate_name ||
                "",
              certificate_name:
                participant.certificate_name ||
                participant.full_name ||
                "",
              email:
                participant.email ||
                null,
            }),
          )
        : Array.from(
            {
              length: Math.max(
                1,
                isOrganizationTraining
                  ? Number(participantCount || 1)
                  : 1,
              ),
            },
            () => ({
              full_name: "",
              certificate_name: "",
              email: null,
            }),
          ),
    )

  const [publicTestimonialAllowed, setPublicTestimonialAllowed] =
    useState(false)

  const [submitting, setSubmitting] =
    useState(false)

  async function submitFeedback(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault()

    const recipients =
      isOrganizationTraining
        ? certificateRecipients.map(
            (recipient) => {
              const certificateName =
                recipient.certificate_name.trim() ||
                recipient.full_name.trim()

              return {
                full_name:
                  recipient.full_name.trim() ||
                  certificateName,
                certificate_name:
                  certificateName,
                email:
                  recipient.email?.trim() ||
                  null,
              }
            },
          )
        : [
            {
              full_name:
                certificateRecipientName.trim(),
              certificate_name:
                certificateRecipientName.trim(),
              email: null,
            },
          ]

    const validRecipients =
      recipients.filter(
        (recipient) =>
          recipient.full_name &&
          recipient.certificate_name,
      )

    const trimmedName =
      validRecipients[0]?.certificate_name || ""

    const trimmedComments =
      comments.trim()

    if (!trimmedName || validRecipients.length === 0) {
      alert(
        "Please enter the full name exactly as it should appear on each Certificate of Completion.",
      )
      return
    }

    if (
      validRecipients.some(
        (recipient) =>
          recipient.full_name.length > 160 ||
          recipient.certificate_name.length > 160,
      )
    ) {
      alert(
        "Each certificate name must be 160 characters or fewer.",
      )
      return
    }

    if (
      !Number.isFinite(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      alert("Rating must be between 1 and 5.")
      return
    }

    if (!trimmedComments) {
      alert("Please enter your feedback.")
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch(
        `/api/training/${engagementId}/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rating,
            feedback: trimmedComments,
            comments: trimmedComments,
            certificate_recipient_name:
              trimmedName,
            certificate_recipients:
              validRecipients,
            public_testimonial_allowed:
              publicTestimonialAllowed,
          }),
        },
      )

      const payload = await res.json()

      if (!res.ok) {
        throw new Error(
          payload?.error ||
            "Failed to submit feedback",
        )
      }

      if (payload?.feedback) {
        const submittedFeedback =
          payload.feedback as FeedbackItem

        setFeedback((current) => [
          submittedFeedback,
          ...current,
        ])

        setComments("")

        setCertificateRecipientName("")

        setCertificateRecipients([
          {
            full_name: "",
            certificate_name: "",
            email: null,
          },
        ])

        setPublicTestimonialAllowed(false)

        alert(
          "Feedback submitted successfully.",
        )

        return
      }

      alert(
        "Feedback submitted successfully.",
      )
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to submit feedback",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/70">
          Training Feedback
        </p>

        <h3 className="mt-2 text-lg font-semibold text-white">
          Feedback
        </h3>

        <p className="mt-2 text-sm leading-6 text-white/45">
          Your feedback helps ShadowNode improve future
          training engagements.
        </p>
      </div>

      {/* ======================================================
          EXISTING FEEDBACK
         ====================================================== */}

      <div className="mt-6 space-y-4">
        {feedback.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-black/20 p-5">
            <p className="text-sm text-white/40">
              No feedback has been submitted yet.
            </p>
          </div>
        )}

        {feedback.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-white/10 bg-black/20 p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                  Rating
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-lg tracking-wide text-amber-300">
                    {Array.from(
                      { length: 5 },
                      (_, index) =>
                        index <
                        Number(item.rating)
                          ? "★"
                          : "☆",
                    ).join("")}
                  </span>

                  <span className="text-sm text-white/60">
                    {Number(item.rating)}/5
                  </span>
                </div>
              </div>

              <p className="text-xs text-white/30">
                {item.created_at
                  ? new Date(
                      String(
                        item.created_at,
                      ),
                    ).toLocaleString()
                  : ""}
              </p>
            </div>

            {item.certificate_recipient_name && (
              <div className="mt-5 border-t border-white/10 pt-5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                  Certificate Name
                </p>

                <p className="mt-2 text-sm font-medium text-white">
                  {
                    item.certificate_recipient_name
                  }
                </p>

                <p className="mt-1 text-xs leading-5 text-white/35">
                  This is the name provided for your
                  Certificate of Completion.
                </p>
              </div>
            )}

            {item.comments && (
              <div className="mt-5 border-t border-white/10 pt-5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                  Comments
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/60">
                  {item.comments}
                </p>
              </div>
            )}
          </article>
        ))}
      </div>

      {/* ======================================================
          CLIENT FORM
         ====================================================== */}

      {userRole === "client" && (
        <form
          onSubmit={submitFeedback}
          className="mt-8 space-y-6"
        >
          {/* CERTIFICATE NAMES */}

          {!isOrganizationTraining ? (
            <div>
              <label
                htmlFor="certificate_recipient_name"
                className="text-sm font-medium text-white"
              >
                Full name / Name to appear on certificate *
              </label>

              <p className="mt-1 text-xs leading-5 text-white/40">
                Full name exactly as it should appear
                on the Certificate of Completion.
              </p>

              <input
                id="certificate_recipient_name"
                name="certificate_recipient_name"
                type="text"
                value={
                  certificateRecipientName
                }
                onChange={(event) =>
                  setCertificateRecipientName(
                    event.target.value,
                  )
                }
                maxLength={160}
                required
                autoComplete="name"
                placeholder="Jane Doe"
                className="mt-3 w-full rounded-lg border border-[#143b28] bg-[#020806] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 transition focus:border-[#20dc73]/50 focus:ring-1 focus:ring-[#20dc73]/20"
              />

              <div className="mt-1.5 flex justify-end">
                <span className="text-[10px] text-white/25">
                  {
                    certificateRecipientName.length
                  }
                  /160
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#143b28] bg-[#020806]/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <label className="text-sm font-medium text-white">
                    Certificate Recipients *
                  </label>

                  <p className="mt-1 text-xs leading-5 text-white/40">
                    Add each participant&apos;s full
                    name / name to appear on certificate
                    exactly as it should be printed.
                  </p>

                  {organizationName && (
                    <p className="mt-2 text-xs text-[#20dc73]/70">
                      Organization:{" "}
                      <span className="font-medium text-[#20dc73]">
                        {organizationName}
                      </span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCertificateRecipients(
                      (current) => [
                        ...current,
                        {
                          full_name: "",
                          certificate_name:
                            "",
                          email: null,
                        },
                      ],
                    )
                  }
                  className="rounded-lg border border-[#20dc73]/40 bg-[#20dc73]/10 px-3 py-2 text-xs font-semibold text-[#20dc73] transition hover:bg-[#20dc73]/15"
                >
                  Add Participant
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {certificateRecipients.map(
                  (recipient, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-white/10 bg-black/20 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                          Participant {index + 1}
                        </p>

                        {certificateRecipients.length >
                          1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setCertificateRecipients(
                                (current) =>
                                  current.filter(
                                    (_, itemIndex) =>
                                      itemIndex !==
                                      index,
                                  ),
                              )
                            }
                            className="text-xs text-white/35 transition hover:text-red-300"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={
                          recipient.certificate_name
                        }
                        onChange={(event) =>
                          setCertificateRecipients(
                            (current) =>
                              current.map(
                                (
                                  item,
                                  itemIndex,
                                ) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        full_name:
                                          event.target
                                            .value,
                                        certificate_name:
                                          event.target
                                            .value,
                                      }
                                    : item,
                              ),
                          )
                        }
                        maxLength={160}
                        required
                        placeholder="Full name / Name to appear on certificate"
                        className="mt-3 w-full rounded-lg border border-[#143b28] bg-[#020806] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 transition focus:border-[#20dc73]/50 focus:ring-1 focus:ring-[#20dc73]/20"
                      />

                      <input
                        type="email"
                        value={
                          recipient.email || ""
                        }
                        onChange={(event) =>
                          setCertificateRecipients(
                            (current) =>
                              current.map(
                                (
                                  item,
                                  itemIndex,
                                ) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        email:
                                          event.target
                                            .value,
                                      }
                                    : item,
                              ),
                          )
                        }
                        placeholder="Email optional"
                        className="mt-2 w-full rounded-lg border border-[#143b28] bg-[#020806] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 transition focus:border-[#20dc73]/50 focus:ring-1 focus:ring-[#20dc73]/20"
                      />
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* RATING */}

          <div>
            <label
              htmlFor="training-feedback-rating"
              className="text-sm font-medium text-white"
            >
              Training Rating *
            </label>

            <p className="mt-1 text-xs text-white/40">
              Rate your overall training experience from
              1 to 5.
            </p>

            <div className="mt-3 flex items-center gap-3">
              <input
                id="training-feedback-rating"
                type="number"
                min={1}
                max={5}
                step={1}
                value={rating}
                onChange={(event) => {
                  const next = Number(
                    event.target.value,
                  )

                  if (
                    Number.isFinite(next)
                  ) {
                    setRating(
                      Math.max(
                        1,
                        Math.min(5, next),
                      ),
                    )
                  }
                }}
                className="w-20 rounded-lg border border-[#143b28] bg-[#020806] px-3 py-2.5 text-center text-sm text-white outline-none focus:border-[#20dc73]/50"
              />

              <div className="flex gap-0.5">
                {Array.from(
                  { length: 5 },
                  (_, index) => {
                    const starNumber =
                      index + 1

                    return (
                      <button
                        key={
                          starNumber
                        }
                        type="button"
                        onClick={() =>
                          setRating(
                            starNumber,
                          )
                        }
                        className={`text-2xl leading-none transition ${
                          rating >=
                          starNumber
                            ? "text-amber-300"
                            : "text-white/15 hover:text-amber-300/60"
                        }`}
                        aria-label={`Rate ${starNumber} out of 5`}
                      >
                        ★
                      </button>
                    )
                  },
                )}
              </div>
            </div>
          </div>

          {/* COMMENTS */}

          <div>
            <label
              htmlFor="training-feedback-comments"
              className="text-sm font-medium text-white"
            >
              Your Feedback *
            </label>

            <textarea
              id="training-feedback-comments"
              value={comments}
              onChange={(event) =>
                setComments(
                  event.target.value,
                )
              }
              required
              rows={6}
              placeholder="Tell us about your training experience..."
              className="mt-3 w-full resize-y rounded-lg border border-[#143b28] bg-[#020806] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/20 transition focus:border-[#20dc73]/50 focus:ring-1 focus:ring-[#20dc73]/20"
            />
          </div>

          {/* TESTIMONIAL PERMISSION */}

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={
                  publicTestimonialAllowed
                }
                onChange={(event) =>
                  setPublicTestimonialAllowed(
                    event.target.checked,
                  )
                }
                className="mt-1 h-4 w-4 accent-[#20dc73]"
              />

              <span>
                <span className="block text-sm font-medium text-white/80">
                  Allow ShadowNode to use my feedback
                  as a public testimonial
                </span>

                <span className="mt-1 block text-xs leading-5 text-white/35">
                  This is optional. Your feedback will
                  not be used publicly unless you permit
                  it.
                </span>
              </span>
            </label>
          </div>

          {/* SUBMIT */}

          <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-white/30">
              Feedback is a one-time submission for this
              training engagement.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-lg bg-[#20dc73] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#35e47f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Submitting..."
                : "Submit Feedback"}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
