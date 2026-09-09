"use client"

import {
  useEffect,
  useState,
} from "react"
import QRCode from "qrcode"

type CertificateData = {
  id: string
  certificate_number: string
  recipient_name: string | null
  training_title?: string | null
  training_type?: string | null
  trainer_name?: string | null
  completion_date?: string | null
  issued_at?: string | null
  verification_url?: string | null
}

type FeedbackData = {
  rating: number
  comments: string | null
  certificate_recipient_name?: string | null
  submitted_at?: string | null
}

type TrainingCertificateProps = {
  certificate: CertificateData | null
  engagementId: string
  userRole: string
  canIssueCertificate: boolean

  progress?: number
  trainingStatus?: string | null
  feedbackSubmitted?: boolean

  trainingTitle?: string | null
  trainerName?: string | null
  completionDate?: string | null
  duration?: string | null

  feedbackRating?: number | null
  feedbackComments?: string | null
  certificateRecipientName?: string | null
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

function clampRating(value: number) {
  return Math.min(5, Math.max(0, Math.round(value)))
}

export default function TrainingCertificate({
  certificate,
  engagementId,
  userRole,
  canIssueCertificate,
  progress = 0,
  trainingStatus = null,
  feedbackSubmitted = false,
  trainingTitle = null,
  trainerName = null,
  completionDate = null,
  duration = null,
  feedbackRating = null,
  feedbackComments = null,
  certificateRecipientName = null,
}: TrainingCertificateProps) {
  const [cert, setCert] =
    useState<CertificateData | null>(certificate)

  const [loading, setLoading] = useState(false)

  const [feedback, setFeedback] = useState<FeedbackData | null>(
    feedbackRating ||
      feedbackComments ||
      certificateRecipientName
      ? {
          rating: clampRating(feedbackRating || 0),
          comments: feedbackComments || null,
          certificate_recipient_name:
            certificateRecipientName || null,
        }
      : null,
  )

  const [feedbackLoading, setFeedbackLoading] =
    useState(false)

  const safeProgress = clampProgress(progress)

  const isTrainingComplete =
    safeProgress >= 100 ||
    trainingStatus === "completed"

  const hasFeedback =
    feedbackSubmitted ||
    !!feedback

  const certificateUnlocked =
    isTrainingComplete &&
    hasFeedback

  /*
   * ============================================================
   * LOAD EXISTING FEEDBACK
   * ============================================================
   */

  useEffect(() => {
    let cancelled = false

    async function loadFeedback() {
      if (!engagementId) {
        return
      }

      setFeedbackLoading(true)

      try {
        const response = await fetch(
          `/api/training/${engagementId}/feedback`,
          {
            method: "GET",
            cache: "no-store",
          },
        )

        if (!response.ok) {
          return
        }

        const payload = await response.json()

        if (cancelled) {
          return
        }

        const rawFeedback =
          payload?.feedback ||
          payload?.data ||
          payload?.feedbackData ||
          null

        if (
          rawFeedback &&
          !Array.isArray(rawFeedback) &&
          typeof rawFeedback === "object"
        ) {
          const ratingValue = Number(
            rawFeedback.rating ??
              rawFeedback.rating_value ??
              0,
          )

          setFeedback({
            rating: clampRating(
              Number.isFinite(ratingValue)
                ? ratingValue
                : 0,
            ),
            comments:
              rawFeedback.feedback ??
              rawFeedback.comments ??
              rawFeedback.comment ??
              null,
            certificate_recipient_name:
              rawFeedback.certificate_recipient_name ??
              rawFeedback.certificate_name ??
              null,
            submitted_at:
              rawFeedback.submitted_at ??
              rawFeedback.created_at ??
              null,
          })

          return
        }

        if (Array.isArray(rawFeedback)) {
          const first = rawFeedback[0]

          if (!first) {
            return
          }

          const ratingValue = Number(
            first.rating ??
              first.rating_value ??
              0,
          )

          setFeedback({
            rating: clampRating(
              Number.isFinite(ratingValue)
                ? ratingValue
                : 0,
            ),
            comments:
              first.feedback ??
              first.comments ??
              first.comment ??
              null,
            certificate_recipient_name:
              first.certificate_recipient_name ??
              first.certificate_name ??
              null,
            submitted_at:
              first.submitted_at ??
              first.created_at ??
              null,
          })
        }
      } catch (error) {
        console.error(
          "Failed to load training feedback:",
          error,
        )
      } finally {
        if (!cancelled) {
          setFeedbackLoading(false)
        }
      }
    }

    loadFeedback()

    return () => {
      cancelled = true
    }
  }, [engagementId])

  /*
   * ============================================================
   * ISSUE CERTIFICATE
   * ============================================================
   */

  async function issueCertificate() {
    if (!certificateUnlocked) {
      return
    }

    const confirmed = window.confirm(
      "Issue this Certificate of Completion?",
    )

    if (!confirmed) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        `/api/training/${engagementId}/certificate`,
        {
          method: "POST",
        },
      )

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Failed to issue certificate",
        )
      }

      setCert({
        id: payload.certificate_id,
        certificate_number:
          payload.certificate_number,
        recipient_name:
          payload.recipient_name ||
          feedback?.certificate_recipient_name ||
          null,
        training_title:
          payload.training_title ||
          trainingTitle ||
          "Cybersecurity Awareness Training",
        training_type:
          payload.training_type || null,

        /*
         * Public certificate designation.
         * Do not expose internal role labels such as
         * "analyst" on the certificate.
         */
        trainer_name:
          "ShadowNode Training Facilitator",

        completion_date:
          payload.completion_date ||
          completionDate ||
          null,
        issued_at:
          payload.issued_at ||
          new Date().toISOString(),
        verification_url:
          payload.verification_url || null,
      })

      window.alert(
        "Certificate issued successfully.",
      )
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to issue certificate",
      )
    } finally {
      setLoading(false)
    }
  }

  function printCertificate() {
    document.body.classList.add(
      "printing-training-certificate",
    )

    window.setTimeout(() => {
      window.print()
    }, 100)

    window.setTimeout(() => {
      document.body.classList.remove(
        "printing-training-certificate",
      )
    }, 1500)
  }

  /*
   * ============================================================
   * CERTIFICATE VALUES
   * ============================================================
   */

  const finalTrainingTitle =
    cert?.training_title ||
    trainingTitle ||
    "Cybersecurity Awareness Training"

  /*
   * Public-facing trainer designation.
   * Never show internal role labels such as "analyst".
   */
  const finalTrainerName =
    "ShadowNode Training Facilitator"

  const finalCompletionDate =
    cert?.completion_date ||
    completionDate ||
    null

  const finalRecipientName =
    cert?.recipient_name ||
    feedback?.certificate_recipient_name ||
    "Certificate Recipient"

  const finalRating = feedback?.rating
    ? clampRating(feedback.rating)
    : 0

  const finalComments =
    feedback?.comments?.trim() || ""

  /*
   * ============================================================
   * PRINT STYLES
   * ============================================================
   */

  const printStyles = `
    @page {
      size: A4 landscape;
      margin: 0;
    }

    html,
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    @media print {
      html,
      body {
        width: 297mm !important;
        height: 210mm !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: #ffffff !important;
      }

      body.printing-training-certificate > * {
        visibility: hidden !important;
      }

      body.printing-training-certificate
        #training-certificate,
      body.printing-training-certificate
        #training-certificate * {
        visibility: visible !important;
      }

      body.printing-training-certificate
        #training-certificate {
        position: fixed !important;
        inset: 0 !important;
        width: 297mm !important;
        height: 210mm !important;
        max-width: none !important;
        max-height: none !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        box-shadow: none !important;
        border: 0 !important;
      }

      body.printing-training-certificate
        #training-certificate
        > .certificate-page {
        width: 297mm !important;
        height: 210mm !important;
        min-height: 0 !important;
        max-height: 210mm !important;
        aspect-ratio: auto !important;
        overflow: hidden !important;
      }

      body.printing-training-certificate
        #training-certificate
        .certificate-content {
        width: 100% !important;
        height: 100% !important;
        min-height: 0 !important;
      }

      body.printing-training-certificate
        #training-certificate
        .certificate-meta,
      body.printing-training-certificate
        #training-certificate
        .certificate-footer-extra {
        display: none !important;
      }

      body.printing-training-certificate
        #training-certificate * {
        break-inside: avoid !important;
      }
    }
  `

  /*
   * ============================================================
   * ISSUED CERTIFICATE
   * ============================================================
   */

  if (cert) {
    return (
      <>
        <style jsx global>
          {printStyles}
        </style>

        <div className="space-y-6">
          {/* SCREEN HEADER */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#c9a227]">
                Certificate Registry
              </p>

              <h3 className="mt-2 text-2xl font-semibold text-white">
                Certificate of Completion
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                Official completion record for the
                ShadowNode training engagement.
              </p>
            </div>

            <button
              type="button"
              onClick={printCertificate}
              className="rounded-lg border border-[#c9a227]/40 bg-[#c9a227]/10 px-4 py-2 text-sm font-medium text-[#e8cf72] transition hover:bg-[#c9a227]/20"
            >
              Print / Save PDF
            </button>
          </div>

          {/* ==================================================
              CERTIFICATE
             ================================================== */}

        <div
  id="training-certificate"
  className="mx-auto w-full max-w-[1400px] bg-[#f7f1e4] text-[#10203b] shadow-2xl print:max-w-none print:shadow-none print:overflow-hidden"
>
  <div className="certificate-page relative w-full overflow-hidden bg-[#f7f1e4] aspect-[297/210] print:aspect-auto">
              {/* Base */}
              <div className="absolute inset-0 bg-[#f7f1e4]" />

              {/* Subtle radial */}
              <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
                <div className="absolute left-1/2 top-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#10203b]" />
              </div>

              {/* Watermark */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="font-serif text-[14rem] font-bold tracking-[0.08em] text-[#10203b]/[0.022]">
                  SN
                </div>
              </div>

              {/* ========== TOP-LEFT CORNER ========== */}
              <div
                className="absolute left-0 top-0 h-[42%] w-[26%] bg-[#07162f]"
                style={{
                  clipPath:
                    "polygon(0 0, 100% 0, 0 100%)",
                }}
              />

              <div
                className="absolute left-[6.8%] top-0 h-[44%] w-[6.2%] bg-[#d6aa43]"
                style={{
                  clipPath:
                    "polygon(0 0, 100% 0, 0 100%)",
                }}
              />

              <div
                className="absolute left-[11.5%] top-0 h-[38%] w-[3.8%] bg-[#f2d17a]"
                style={{
                  clipPath:
                    "polygon(0 0, 100% 0, 0 100%)",
                }}
              />

              <div
                className="absolute left-[14.2%] top-0 h-[32%] w-[2.2%] bg-[#c79b31]"
                style={{
                  clipPath:
                    "polygon(0 0, 100% 0, 0 100%)",
                }}
              />

              {/* ========== BOTTOM-RIGHT CORNER ========== */}
              <div
                className="absolute bottom-0 right-0 h-[43%] w-[27%] bg-[#07162f]"
                style={{
                  clipPath:
                    "polygon(100% 0, 100% 100%, 0 100%)",
                }}
              />

              <div
                className="absolute bottom-0 right-[6.8%] h-[45%] w-[6.2%] bg-[#d6aa43]"
                style={{
                  clipPath:
                    "polygon(100% 0, 100% 100%, 0 100%)",
                }}
              />

              <div
                className="absolute bottom-0 right-[11.5%] h-[39%] w-[3.8%] bg-[#f2d17a]"
                style={{
                  clipPath:
                    "polygon(100% 0, 100% 100%, 0 100%)",
                }}
              />

              <div
                className="absolute bottom-0 right-[14.2%] h-[33%] w-[2.2%] bg-[#c79b31]"
                style={{
                  clipPath:
                    "polygon(100% 0, 100% 100%, 0 100%)",
                }}
              />

              {/* Gold frames */}
              <div className="absolute inset-[3.4%] border-[2.5px] border-[#c79b31]" />

              <div className="absolute inset-[5.5%] border border-[#d5ae52]/75" />

              {/* CONTENT */}
              <div className="certificate-content relative z-10 flex h-full flex-col px-[6.2%] py-[4.0%]">
                {/* BRAND */}
                <div className="flex items-start justify-center">
                  <div className="flex items-center gap-3.5">
                    <ShieldLogo />

                    <div>
                      <div className="font-sans text-[1.65rem] font-semibold tracking-[0.12em] text-[#10203b] sm:text-[1.85rem]">
                        SHADOWNODE
                      </div>

                      <div className="mt-0.5 text-center text-[8px] font-medium uppercase tracking-[0.32em] text-[#ae7d18] sm:text-[9px]">
                        Trusted. Secure. Unseen.
                      </div>
                    </div>
                  </div>
                </div>

                {/* EXCELLENCE RIBBON */}
                <div className="absolute right-[5.2%] top-[0.8%] hidden h-[34%] w-[8.2%] sm:block">
                  <div className="relative h-full">
                    <div className="absolute inset-x-0 top-0 h-[76%] bg-[#0a1934] shadow-xl">
                      <div className="absolute inset-[6px] border border-[#d7af4d]/65" />

                      <div className="absolute left-1/2 top-[14%] flex h-[88px] w-[88px] -translate-x-1/2 flex-col items-center justify-center rounded-full border-[1.5px] border-[#ddb94f] bg-[#0a1934]">
                        <div className="text-[11px] leading-none text-[#f0d36d]">
                          ★ ★ ★
                        </div>

                        <div className="mt-1.5 text-[7px] font-semibold uppercase tracking-[0.12em] text-white">
                          Commitment to
                        </div>

                        <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#f0d36d]">
                          Excellence
                        </div>

                        <div className="mt-1.5 text-[10px] text-[#f0d36d]">
                          ★
                        </div>
                      </div>
                    </div>

                    <div
                      className="absolute bottom-[6%] left-0 right-0 h-[28%] bg-[#0a1934]"
                      style={{
                        clipPath:
                          "polygon(0 0, 100% 0, 50% 100%)",
                      }}
                    />
                  </div>
                </div>

                {/* TITLE */}
                <div className="mt-[2.6%] text-center">
                  <div className="font-serif text-[clamp(2.8rem,5.8vw,5.4rem)] font-medium uppercase leading-none tracking-[0.12em] text-[#10203b]">
                    Certificate
                  </div>

                  <div className="mt-2.5 flex items-center justify-center gap-4">
                    <div className="h-px w-16 bg-[#c79b31] sm:w-24" />

                    <div className="font-serif text-[clamp(0.95rem,1.9vw,1.45rem)] uppercase tracking-[0.36em] text-[#a97918]">
                      Of Completion
                    </div>

                    <div className="h-px w-16 bg-[#c79b31] sm:w-24" />
                  </div>
                </div>

                {/* RECIPIENT */}
                <div className="mt-[2.2%] text-center">
                  <div className="flex items-center justify-center gap-4">
                    <div className="h-px w-16 bg-[#a97918] sm:w-24" />

                    <p className="text-[8px] font-semibold uppercase tracking-[0.28em] text-[#1a2940] sm:text-[10px]">
                      This is to certify that
                    </p>

                    <div className="h-px w-16 bg-[#a97918] sm:w-24" />
                  </div>

                  <div className="mt-3.5 break-words px-4 font-serif text-[clamp(1.9rem,4.2vw,4.1rem)] italic leading-none text-[#10203b]">
                    {finalRecipientName}
                  </div>

                  <div className="mx-auto mt-2.5 h-px w-64 bg-[#c79b31]/70 sm:w-80" />
                </div>

                {/* TRAINING */}
                <div className="mt-[1.7%] text-center">
                  <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-[#3d4654] sm:text-[11px]">
                    Has successfully completed the
                  </p>

                  <div className="mt-1.5 px-6 font-serif text-[clamp(1.05rem,2.2vw,1.9rem)] font-semibold uppercase tracking-wide text-[#10203b]">
                    {finalTrainingTitle}
                  </div>

                  <p className="mx-auto mt-2 max-w-3xl text-[8.5px] leading-4 text-[#555d68] sm:text-[10.5px] sm:leading-5">
                    This training has equipped the participant
                    with essential knowledge and practical
                    skills to identify, prevent, and respond
                    to modern cybersecurity threats.
                  </p>
                </div>

                {/* DETAILS */}
                <div className="mt-[1.6%] border-y border-[#c79b31]/60 py-[1.35%]">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <CertificateDetail
                      icon="calendar"
                      label="Completion Date"
                      value={formatDate(
                        finalCompletionDate,
                      )}
                    />

                    <CertificateDetail
                      icon="clock"
                      label="Duration"
                      value={duration || "20 Hours"}
                    />

                    <CertificateDetail
                      icon="certificate"
                      label="Certificate ID"
                      value={cert.certificate_number}
                    />

                    <CertificateDetail
                      icon="trainer"
                      label="Trainer"
                      value={finalTrainerName}
                    />

                    <CertificateDetail
                      icon="issued"
                      label="Issued On"
                      value={formatDate(cert.issued_at)}
                    />
                  </div>
                </div>

                {/* LOWER SECTION */}
                <div className="mt-[1.4%] grid grid-cols-1 gap-4 sm:grid-cols-[0.78fr_1.7fr_0.82fr] sm:items-start">
                  {/* SEAL */}
                  <div className="flex items-center justify-start">
                    <CertificateSeal />
                  </div>

                  {/* FEEDBACK */}
                  <div className="rounded-[14px] border border-[#c79b31] bg-[#fbf6eb]/95 px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-px w-8 bg-[#c79b31]" />

                      <p className="text-[8.5px] font-semibold uppercase tracking-[0.2em] text-[#a97918] sm:text-[9.5px]">
                        Participant Feedback
                      </p>

                      <div className="h-px w-8 bg-[#c79b31]" />
                    </div>

                    <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-[0.85fr_1.35fr]">
                      <div className="text-center sm:border-r sm:border-[#c79b31]/40 sm:pr-3">
                        <p className="text-[7.5px] font-medium text-[#2b3544] sm:text-[8.5px]">
                          How would you rate this training?
                        </p>

                        <div className="mt-1.5 flex justify-center gap-0.5">
                          {Array.from(
                            { length: 5 },
                            (_, index) => {
                              const starNumber =
                                index + 1

                              return (
                                <span
                                  key={starNumber}
                                  className={
                                    finalRating >=
                                    starNumber
                                      ? "text-[20px] leading-none text-[#d3a13a]"
                                      : "text-[20px] leading-none text-[#d3a13a]/30"
                                  }
                                  aria-hidden="true"
                                >
                                  ★
                                </span>
                              )
                            },
                          )}
                        </div>

                        <p className="mt-0.5 text-[6.5px] font-semibold uppercase tracking-[0.14em] text-[#8c6a1d]">
                          {finalRating
                            ? `${finalRating}/5`
                            : "Submitted"}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[7.5px] font-medium text-[#2b3544] sm:text-[8.5px]">
                          Your Feedback / Comments
                        </p>

                        <div className="mt-1">
                          <div className="border-b border-[#8c8065]/40" />

                          <div className="min-h-[38px] border-b border-[#8c8065]/40 py-1">
                            <p className="max-h-[42px] overflow-hidden break-words text-[7.5px] leading-3.5 text-[#293242] sm:text-[8.5px]">
                              {finalComments ||
                                "Thank you for completing and participating in the training programme."}
                            </p>
                          </div>

                          <div className="border-b border-[#8c8065]/40" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SIGNATURE */}
                  <div className="pt-0.5 text-center">
                    <div className="font-serif text-[1.55rem] italic leading-none text-[#17243b] sm:text-[1.85rem]">
                      Joy Ewatomi
                    </div>

                    <div className="mx-auto mt-1 h-px w-32 bg-[#17243b]/40" />

                    <p className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-[#17243b] sm:text-[9px]">
                      Joy Ewatomi
                    </p>

                    <p className="mt-0.5 text-[6.5px] uppercase tracking-[0.2em] text-[#a97918] sm:text-[7.5px]">
                      Founder &amp; CEO
                    </p>
                  </div>
                </div>

                {/* VERIFICATION */}
                <div className="mt-auto pt-[0.8%]">
                  <div className="border-t border-[#c79b31]/45 pt-2">
                    <div className="flex items-center justify-between gap-3">
                      {/* LEFT */}
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                          <ShieldCheckIcon />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[6.5px] font-semibold uppercase tracking-[0.16em] text-[#17243b]">
                            Verification
                          </p>

                          <p className="mt-0.5 text-[7px] leading-tight text-[#5f6470]">
                            Verify this certificate at:
                          </p>

                         <p className="mt-0.5 break-all text-[7px] font-bold text-[#192840]">
  {cert.verification_url}
</p>
                        </div>
                      </div>

                      {/* QR */}
                      <div className="shrink-0">
                        {cert.verification_url ? (
                          <RealQrCode
                            value={cert.verification_url}
                            size={58}
                          />
                        ) : (
                          <div className="flex h-[58px] w-[58px] items-center justify-center border border-[#17243b]/20 bg-white px-1 text-center text-[6px] uppercase leading-tight tracking-[0.04em] text-[#6b7079]">
                            QR
                            <br />
                            unavailable
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  /*
   * ============================================================
   * TRAINING COMPLETE — FEEDBACK MISSING
   * ============================================================
   */

  if (isTrainingComplete && !hasFeedback) {
    return (
      <LockedState
        eyebrow="Certificate Locked"
        title="Feedback Required"
        description="Training has reached 100% completion. The Certificate of Completion will unlock after the client submits the required training feedback."
        progress={100}
        detail="Training is complete. Client feedback is the remaining requirement."
      />
    )
  }

  /*
   * ============================================================
   * TRAINING COMPLETE — FEEDBACK SUBMITTED
   * ============================================================
   */

  if (isTrainingComplete && hasFeedback) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[#20dc73]/20 bg-[#04100b]/70 p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#20dc73]/70">
                Certificate Unlocked
              </p>

              <h3 className="mt-2 text-2xl font-semibold text-white">
                Training Completed
              </h3>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/45">
                The training engagement has reached 100%
                completion and the required participant
                feedback has been submitted.
              </p>
            </div>

            <div className="shrink-0 rounded-xl border border-[#20dc73]/20 bg-[#20dc73]/10 px-5 py-4 text-center">
              <div className="font-mono text-3xl font-semibold text-[#20dc73]">
                100%
              </div>

              <div className="mt-1 text-[9px] uppercase tracking-[0.16em] text-[#20dc73]/60">
                Training Complete
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#c9a227]/30 bg-[#c9a227]/[0.04] p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c9a227]/30 bg-[#c9a227]/10 text-[#e0ba53]">
              ✓
            </div>

            <div>
              <p className="text-sm font-semibold text-[#e0ba53]">
                Participant feedback received
              </p>

              <p className="mt-1 text-xs leading-6 text-white/40">
                The feedback requirement for this training
                engagement has been satisfied.
              </p>

              {feedback?.certificate_recipient_name ? (
                <p className="mt-3 text-xs text-white/55">
                  Certificate name:{" "}
                  <span className="font-semibold text-white">
                    {feedback.certificate_recipient_name}
                  </span>
                </p>
              ) : null}

              {feedback?.rating ? (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex gap-0.5 text-[#d5a63b]">
                    {Array.from(
                      { length: 5 },
                      (_, index) => (
                        <span
                          key={index}
                          className="text-lg leading-none"
                        >
                          {feedback.rating > index
                            ? "★"
                            : "☆"}
                        </span>
                      ),
                    )}
                  </div>

                  <span className="font-mono text-xs text-[#d5a63b]">
                    {feedback.rating}/5
                  </span>
                </div>
              ) : null}

              {feedback?.comments ? (
                <p className="mt-3 text-xs italic leading-6 text-white/45">
                  “{feedback.comments}”
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {canIssueCertificate ? (
          <div className="rounded-xl border border-[#143b28] bg-[#04100b]/70 p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/25">
              Certificate Registry
            </p>

            <h4 className="mt-2 text-lg font-semibold text-white">
              Certificate of Completion Ready
            </h4>

            <p className="mt-2 text-sm leading-6 text-white/40">
              All certificate requirements have been
              satisfied. Issue the official Certificate of
              Completion for this engagement.
            </p>

            <button
              type="button"
              onClick={issueCertificate}
              disabled={loading}
              className="mt-5 inline-flex items-center rounded-lg bg-[#20dc73] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#35e47f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Issuing Certificate..."
                : "Issue Certificate"}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-[#143b28] bg-[#04100b]/70 p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/25">
              Certificate Registry
            </p>

            <h4 className="mt-2 text-lg font-semibold text-white">
              Certificate Ready
            </h4>

            <p className="mt-2 text-sm leading-6 text-white/40">
              Training completion and participant feedback
              have both been recorded. Certificate issuance
              is handled by an authorized training operator.
            </p>
          </div>
        )}
      </div>
    )
  }

  /*
   * ============================================================
   * TRAINING STILL IN PROGRESS
   * ============================================================
   */

  return (
    <div className="space-y-5">
      <LockedState
        eyebrow="Certificate Locked"
        title="Training In Progress"
        description="The Certificate of Completion becomes available after all training requirements have been completed and the engagement reaches 100% progress."
        progress={safeProgress}
        detail={`Current training progress: ${safeProgress}%`}
      />

      {canIssueCertificate && (
        <div className="rounded-xl border border-[#143b28] bg-[#04100b]/60 p-5 text-sm text-white/45">
          Certificate issuance will become available after
          training completion and participant feedback.
        </div>
      )}
    </div>
  )
}

/*
 * ============================================================
 * REAL QR CODE
 * ============================================================
 */

function RealQrCode({
  value,
  size = 58,
}: {
  value: string
  size?: number
}) {
  const [qrDataUrl, setQrDataUrl] =
    useState<string | null>(null)

  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function generateQr() {
      if (!value) {
        setQrDataUrl(null)
        return
      }

      try {
        setError(false)

        const dataUrl = await QRCode.toDataURL(value, {
          errorCorrectionLevel: "H",
          margin: 1,
          width: 300,
          color: {
            dark: "#101b32",
            light: "#ffffff",
          },
        })

        if (!cancelled) {
          setQrDataUrl(dataUrl)
        }
      } catch (error) {
        console.error(
          "Failed to generate certificate QR:",
          error,
        )

        if (!cancelled) {
          setError(true)
          setQrDataUrl(null)
        }
      }
    }

    generateQr()

    return () => {
      cancelled = true
    }
  }, [value])

  if (error) {
    return (
      <div
        className="flex items-center justify-center border border-[#101b32]/20 bg-white text-center text-[6px] uppercase leading-tight tracking-[0.04em] text-[#6b7079]"
        style={{
          width: size,
          height: size,
        }}
      >
        QR
        <br />
        unavailable
      </div>
    )
  }

  if (!qrDataUrl) {
    return (
      <div
        className="flex items-center justify-center bg-white"
        style={{
          width: size,
          height: size,
        }}
        aria-label="Generating verification QR code"
      >
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#101b32]/15 border-t-[#101b32]" />
      </div>
    )
  }

  return (
    <a
      href={value}
      target="_blank"
      rel="noreferrer"
      title="Open certificate verification"
      className="block shrink-0 bg-white p-[3px] transition hover:opacity-90"
      style={{
        width: size,
        height: size,
      }}
    >
      <img
        src={qrDataUrl}
        alt="Scan to verify this ShadowNode certificate"
        width={size - 6}
        height={size - 6}
        className="block"
        style={{
          width: size - 6,
          height: size - 6,
        }}
      />
    </a>
  )
}

/*
 * ============================================================
 * CERTIFICATE SEAL
 * ============================================================
 */

function CertificateSeal() {
  return (
    <div className="relative flex h-[110px] w-[110px] items-center justify-center">
      <svg
        width="110"
        height="110"
        viewBox="0 0 110 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
      >
        <defs>
          <linearGradient
            id="goldGrad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop
              offset="0%"
              stopColor="#f0d36d"
            />

            <stop
              offset="40%"
              stopColor="#d6aa43"
            />

            <stop
              offset="100%"
              stopColor="#b8860b"
            />
          </linearGradient>

          <linearGradient
            id="goldGradLight"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop
              offset="0%"
              stopColor="#f8e7a0"
            />

            <stop
              offset="100%"
              stopColor="#c99b31"
            />
          </linearGradient>

          <path
            id="topArc"
            d="M 22,55 A 33,33 0 0,1 88,55"
            fill="none"
          />

          <path
            id="bottomArc"
            d="M 88,55 A 33,33 0 0,1 22,55"
            fill="none"
          />
        </defs>

        {/* Outer gold disc */}
        <circle
          cx="55"
          cy="55"
          r="52"
          fill="url(#goldGrad)"
        />

        {/* Scalloped edge */}
        {Array.from({ length: 24 }).map(
          (_, i) => {
            const angle =
              (i * 15 * Math.PI) / 180

            const x =
              55 + Math.cos(angle) * 49

            const y =
              55 + Math.sin(angle) * 49

            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4.2"
                fill="url(#goldGradLight)"
              />
            )
          },
        )}

        {/* Inner cream */}
        <circle
          cx="55"
          cy="55"
          r="42"
          fill="#f7f1e4"
        />

        {/* Gold rings */}
        <circle
          cx="55"
          cy="55"
          r="39.5"
          fill="none"
          stroke="url(#goldGrad)"
          strokeWidth="2.5"
        />

        <circle
          cx="55"
          cy="55"
          r="34"
          fill="none"
          stroke="#c99b31"
          strokeWidth="1.2"
          opacity="0.7"
        />

        {/* Curved text */}
        <text
          fill="#8b6615"
          fontSize="6.2"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="1.8"
        >
          <textPath
            href="#topArc"
            startOffset="50%"
            textAnchor="middle"
          >
            SHADOWNODE
          </textPath>
        </text>

        <text
          fill="#8b6615"
          fontSize="4.8"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.6"
        >
          <textPath
            href="#bottomArc"
            startOffset="50%"
            textAnchor="middle"
          >
            CYBER INTELLIGENCE SOLUTIONS
          </textPath>
        </text>

        {/* Side stars */}
        <text
          x="18"
          y="58"
          fill="#8b6615"
          fontSize="9"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          ★
        </text>

        <text
          x="92"
          y="58"
          fill="#8b6615"
          fontSize="9"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          ★
        </text>

        {/* Central SN */}
        <circle
          cx="55"
          cy="55"
          r="18"
          fill="#d6aa43"
          fillOpacity="0.15"
          stroke="#c99b31"
          strokeWidth="1.5"
        />

        <path
          d="M55 42 L66 46 V55 C66 61 61 66 55 69 C49 66 44 61 44 55 V46 L55 42Z"
          fill="#101B32"
          stroke="#c99b31"
          strokeWidth="1"
        />

        <text
          x="55"
          y="58"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#E1B84F"
          fontSize="13"
          fontWeight="700"
          fontFamily="Georgia, 'Times New Roman', serif"
        >
          SN
        </text>
      </svg>
    </div>
  )
}

/*
 * ============================================================
 * CERTIFICATE DETAIL
 * ============================================================
 */

function CertificateDetail({
  icon,
  label,
  value,
}: {
  icon:
    | "calendar"
    | "clock"
    | "certificate"
    | "trainer"
    | "issued"
  label: string
  value: string
}) {
  return (
    <div className="px-2 text-center">
      <div className="mx-auto mb-1.5 flex h-7 items-center justify-center text-[#b17d16]">
        {icon === "calendar" && (
          <CalendarIcon />
        )}

        {icon === "clock" && (
          <ClockIcon />
        )}

        {icon === "certificate" && (
          <CertificateIcon />
        )}

        {icon === "trainer" && (
          <UserIcon />
        )}

        {icon === "issued" && (
          <IssuedIcon />
        )}
      </div>

      <p className="text-[7px] font-semibold uppercase tracking-[0.13em] text-[#777b84] sm:text-[8px]">
        {label}
      </p>

      <p className="mx-auto mt-1 max-w-[170px] break-words text-[8px] font-semibold text-[#10203b] sm:text-[9px]">
        {value}
      </p>
    </div>
  )
}

/*
 * ============================================================
 * LOCKED STATE
 * ============================================================
 */

function LockedState({
  eyebrow,
  title,
  description,
  progress,
  detail,
}: {
  eyebrow: string
  title: string
  description: string
  progress: number
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-[#143b28] bg-[#04100b]/60 p-6 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#c9a227]/70">
            {eyebrow}
          </p>

          <h3 className="mt-2 text-2xl font-semibold text-white">
            {title}
          </h3>

          <p className="mt-3 text-sm leading-7 text-white/45">
            {description}
          </p>

          <p className="mt-4 text-xs text-white/30">
            {detail}
          </p>
        </div>

        <div className="w-full max-w-xs">
          <div className="flex items-end justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em] text-white/30">
              Training Progress
            </span>

            <span className="font-mono text-xl text-[#20dc73]">
              {progress}%
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-[#20dc73] transition-all"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-white/20">
            <span>Locked</span>
            <span>100% Required</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/*
 * ============================================================
 * SHIELD LOGO
 * ============================================================
 */

function ShieldLogo() {
  return (
    <svg
      width="40"
      height="46"
      viewBox="0 0 42 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M21 2L38 8V20.5C38 31.2 31.1 40.3 21 46C10.9 40.3 4 31.2 4 20.5V8L21 2Z"
        fill="#D6AA43"
        fillOpacity="0.18"
        stroke="#C99B31"
        strokeWidth="2"
      />

      <path
        d="M21 8L32 12V20C32 27.4 27.8 34.1 21 38.2C14.2 34.1 10 27.4 10 20V12L21 8Z"
        fill="#101B32"
      />

      <text
        x="21"
        y="26.5"
        textAnchor="middle"
        fill="#E1B84F"
        fontSize="11.5"
        fontFamily="Georgia, serif"
        fontWeight="700"
      >
        SN
      </text>
    </svg>
  )
}

/*
 * ============================================================
 * SHIELD CHECK
 * ============================================================
 */

function ShieldCheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 3L19 6V11.5C19 16.2 16.1 20.2 12 22C7.9 20.2 5 16.2 5 11.5V6L12 3Z"
        stroke="#14243C"
        strokeWidth="1.7"
      />

      <path
        d="M8.5 12L10.7 14.2L15.7 9.4"
        stroke="#A97A19"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/*
 * ============================================================
 * ICONS
 * ============================================================
 */

function CalendarIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M8 3V7M16 3V7M4 9H20"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <path
        d="M8 12H8.01M12 12H12.01M16 12H16.01M8 16H8.01M12 16H12.01"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M12 7V12L15 14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CertificateIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 4.5C6 3.67 6.67 3 7.5 3H16.5C17.33 3 18 3.67 18 4.5V15H6V4.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M9 7H15M9 10H15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <path
        d="M9 15V21L12 19L15 21V15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M5 20C5.6 15.8 8 14 12 14C16 14 18.4 15.8 19 20"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IssuedIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="9"
        r="6"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M9.5 15L8.5 21L12 19L15.5 21L14.5 15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="M10 9L11.5 10.5L14 8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}