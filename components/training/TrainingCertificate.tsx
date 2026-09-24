"use client"

import {
  useEffect,
  useRef,
  useState,
} from "react"

import QRCode from "qrcode"

type CertificateData = {
  id: string
  certificate_number: string
  training_participant_id?: string | null
  recipient_name: string | null
  organization_name?: string | null
  training_title?: string | null
  training_type?: string | null
  trainer_name?: string | null
  completion_date?: string | null
  issued_at?: string | null
  verification_url?: string | null
  pdf_url?: string | null
}

const automaticPrintStarted = new Set<string>()

type CertificateParticipant = {
  id: string
  full_name: string
  email?: string | null
  certificate_name: string
  organization_name?: string | null
  status?: string | null
  certificate_eligible?: boolean | null
  certificate_id?: string | null
  certificate_number?: string | null
  certificate_status?: string | null
  certificate_issued_at?: string | null
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

  /*
   * Training timeline
   */
  startDate?: string | null
  completionDate?: string | null

  /*
   * Optional legacy duration value.
   *
   * It is retained for compatibility with existing callers,
   * but the certificate duration is now calculated from
   * startDate -> completionDate whenever both are available.
   */
  duration?: string | null

  feedbackRating?: number | null
  feedbackComments?: string | null
  certificateRecipientName?: string | null
  organizationName?: string | null
  participants?: CertificateParticipant[]
}

function parseDateOnly(
  value?: string | null,
): Date | null {
  if (!value) {
    return null
  }

  const parts =
    String(value)
      .slice(0, 10)
      .split("-")
      .map(Number)

  if (
    parts.length !== 3 ||
    parts.some(
      (part) => !Number.isFinite(part),
    )
  ) {
    return null
  }

  const [
    year,
    month,
    day,
  ] = parts

  const date = new Date(
    year,
    month - 1,
    day,
  )

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "—"
  }

  const date =
    parseDateOnly(value)

  if (!date) {
    const fallback = new Date(value)

    if (
      Number.isNaN(
        fallback.getTime(),
      )
    ) {
      return value
    }

    return fallback.toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      },
    )
  }

  return date.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  )
}

function calculateTrainingDuration(
  startDate?: string | null,
  completionDate?: string | null,
) {
  const start =
    parseDateOnly(startDate)

  const completion =
    parseDateOnly(
      completionDate,
    )

  if (
    !start ||
    !completion
  ) {
    return null
  }

  const milliseconds =
    completion.getTime() -
    start.getTime()

  const days = Math.round(
    milliseconds /
      (1000 * 60 * 60 * 24),
  )

  if (days < 0) {
    return null
  }

  if (days === 0) {
    return {
      days: 0,
      weeks: 0,
      months: 0,
      label: "1 Day",
    }
  }

  /*
   * Prefer calendar-month wording when the range
   * represents an exact number of months.
   */
  let calendarMonths =
    (completion.getFullYear() -
      start.getFullYear()) *
      12 +
    (completion.getMonth() -
      start.getMonth())

  const sameOrLaterDay =
    completion.getDate() >=
    start.getDate()

  if (!sameOrLaterDay) {
    calendarMonths -= 1
  }

  if (
    calendarMonths > 0 &&
    completion.getDate() ===
      start.getDate()
  ) {
    return {
      days,
      weeks: Math.round(
        days / 7,
      ),
      months: calendarMonths,
      label: `${calendarMonths} Month${
        calendarMonths === 1
          ? ""
          : "s"
      }`,
    }
  }

  if (days >= 60) {
    const months =
      Math.round(
        days / 30,
      )

    return {
      days,
      weeks: Math.round(
        days / 7,
      ),
      months,
      label: `Approximately ${months} Month${
        months === 1
          ? ""
          : "s"
      }`,
    }
  }

  if (days >= 14) {
    const weeks =
      Math.round(
        days / 7,
      )

    return {
      days,
      weeks,
      months: 0,
      label: `${weeks} Week${
        weeks === 1
          ? ""
          : "s"
      }`,
    }
  }

  return {
    days,
    weeks: 0,
    months: 0,
    label: `${days} Day${
      days === 1 ? "" : "s"
    }`,
  }
}

function clampProgress(
  value: number,
) {
  return Math.min(
    100,
    Math.max(
      0,
      Math.round(value),
    ),
  )
}

function clampRating(
  value: number,
) {
  return Math.min(
    5,
    Math.max(
      0,
      Math.round(value),
    ),
  )
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
  startDate = null,
  completionDate = null,
  duration = null,
  feedbackRating = null,
  feedbackComments = null,
  certificateRecipientName = null,
  organizationName = null,
  participants = [],
}: TrainingCertificateProps) {
  const [cert, setCert] =
    useState<CertificateData | null>(
      certificate,
    )

  const [loading, setLoading] =
    useState(false)
  const [certificateVisualReady, setCertificateVisualReady] =
    useState(!certificate?.verification_url)
  const printingRef = useRef(false)

  const [feedback, setFeedback] =
    useState<FeedbackData | null>(
      feedbackRating ||
        feedbackComments ||
        certificateRecipientName
        ? {
            rating:
              clampRating(
                feedbackRating || 0,
              ),

            comments:
              feedbackComments ||
              null,

            certificate_recipient_name:
              certificateRecipientName ||
              null,
          }
        : null,
    )

  const [feedbackLoading, setFeedbackLoading] =
    useState(false)

  const safeProgress =
    clampProgress(progress)

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
        const response =
          await fetch(
            `/api/training/${engagementId}/feedback`,
            {
              method: "GET",
              cache: "no-store",
            },
          )

        if (!response.ok) {
          return
        }

        const payload =
          await response.json()

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
          !Array.isArray(
            rawFeedback,
          ) &&
          typeof rawFeedback ===
            "object"
        ) {
          const ratingValue =
            Number(
              rawFeedback.rating ??
                rawFeedback.rating_value ??
                0,
            )

          setFeedback({
            rating: clampRating(
              Number.isFinite(
                ratingValue,
              )
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

        if (
          Array.isArray(
            rawFeedback,
          )
        ) {
          const first =
            rawFeedback[0]

          if (!first) {
            return
          }

          const ratingValue =
            Number(
              first.rating ??
                first.rating_value ??
                0,
            )

          setFeedback({
            rating: clampRating(
              Number.isFinite(
                ratingValue,
              )
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

  async function issueCertificate(
    participantId?: string | null,
    issueAll = false,
  ) {
    if (!certificateUnlocked) {
      return
    }

    const confirmed =
      window.confirm(
        issueAll
          ? "Issue certificates for all eligible participants?"
          : "Issue this Certificate of Completion?",
      )

    if (!confirmed) {
      return
    }

    setLoading(true)

    try {
      const response =
        await fetch(
          `/api/training/${engagementId}/certificate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              participant_id:
                participantId || undefined,
              issue_all:
                issueAll || undefined,
            }),
          },
        )

      const payload =
        await response.json()

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Failed to issue certificate",
        )
      }

      if (
        issueAll &&
        Array.isArray(
          payload.certificates,
        )
      ) {
        window.alert(
          `${payload.certificates.length} certificate${
            payload.certificates.length === 1
              ? ""
              : "s"
          } issued successfully.`,
        )
        window.location.reload()
        return
      }

      setCert({
        id:
          payload.certificate_id,

        certificate_number:
          payload.certificate_number,

        training_participant_id:
          payload.training_participant_id ||
          participantId ||
          null,

        recipient_name:
          payload.recipient_name ||
          feedback
            ?.certificate_recipient_name ||
          null,

        organization_name:
          payload.organization_name ||
          organizationName ||
          null,

        training_title:
          payload.training_title ||
          trainingTitle ||
          "Cybersecurity Awareness Training",

        training_type:
          payload.training_type ||
          null,

        trainer_name:
          payload.trainer_name ||
          null,

        /*
         * The certificate completion date should
         * come from the engagement timeline.
         */
        completion_date:
          payload.completion_date ||
          completionDate ||
          null,

        issued_at:
          payload.issued_at ||
          new Date().toISOString(),

        verification_url:
          payload.verification_url ||
          null,

        pdf_url:
          payload.pdf_url ||
          null,
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

  async function waitForCertificateAssets() {
    if (!cert || !certificateVisualReady) return false
    if (document.fonts?.ready) await document.fonts.ready
    const images = Array.from(document.querySelectorAll<HTMLImageElement>("#training-certificate img"))
    await Promise.all(images.map(async (image) => {
      if (image.complete) {
        try { await image.decode() } catch { /* A loaded image may not support decode. */ }
        return
      }
      await new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true })
        image.addEventListener("error", () => resolve(), { once: true })
      })
    }))
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    return true
  }

  async function printCertificate() {
    if (printingRef.current || !await waitForCertificateAssets()) return
    printingRef.current = true
    document.body.classList.add("printing-training-certificate")
    const cleanup = () => {
      document.body.classList.remove("printing-training-certificate")
      printingRef.current = false
      window.removeEventListener("afterprint", cleanup)
    }
    window.addEventListener("afterprint", cleanup)
    window.print()
    window.setTimeout(cleanup, 60000)
  }

  useEffect(() => {
    if (!cert || !certificateVisualReady || new URLSearchParams(window.location.search).get("print") !== "1") return
    if (automaticPrintStarted.has(cert.id)) return
    automaticPrintStarted.add(cert.id)
    void printCertificate()
  }, [cert, certificateVisualReady])


  /*
   * ============================================================
   * CERTIFICATE VALUES
   * ============================================================
   */

  const finalTrainingTitle =
    cert?.training_title ||
    trainingTitle ||
    "Training Certificate"

  const finalTrainerName =
    cert?.trainer_name ||
    trainerName ||
    null

  /*
   * Certificate completion date:
   *
   * 1. Actual certificate record if already issued
   * 2. Engagement timeline completion date
   * 3. Legacy fallback
   */
  const finalCompletionDate =
    cert?.completion_date ||
    completionDate ||
    null



  const finalRecipientName =
    cert?.recipient_name ||
    feedback
      ?.certificate_recipient_name ||
    certificateRecipientName ||
    "Certificate Recipient"

  const finalOrganizationName =
    cert?.organization_name ||
    organizationName ||
    null

  const showOrganizationName =
    finalOrganizationName &&
    finalOrganizationName
      .trim()
      .toLowerCase() !==
      finalRecipientName
        .trim()
        .toLowerCase()

  /*
   * ============================================================
   * PRINT STYLES
   * ============================================================
   */

  const printStyles = `
    @page {
      size: A4 landscape;
      margin: 8mm;
    }

    @media print {
      html,
      body {
        width: auto !important;
        height: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        background: #ffffff !important;
      }

      body.printing-training-certificate,
      body.printing-training-certificate * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      body.printing-training-certificate * {
        visibility: hidden !important;
      }

      body.printing-training-certificate #training-certificate,
      body.printing-training-certificate #training-certificate * {
        visibility: visible !important;
      }

      body.printing-training-certificate #training-certificate {
        position: fixed !important;
        inset: 0 auto auto 50% !important;
        transform: translateX(-50%) !important;
        box-sizing: border-box !important;
        width: 100% !important;
        height: auto !important;
        min-width: 0 !important;
        max-width: 274mm !important;
        min-height: 0 !important;
        max-height: 194mm !important;
        aspect-ratio: 297 / 210 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        border: 0 !important;
        box-shadow: none !important;
        break-inside: avoid-page !important;
        page-break-inside: avoid !important;
      }

      body.printing-training-certificate #training-certificate > .certificate-page,
      body.printing-training-certificate #training-certificate .certificate-content {
        box-sizing: border-box !important;
        width: 100% !important;
        height: 100% !important;
        min-height: 0 !important;
        max-height: 100% !important;
        overflow: hidden !important;
      }

      body.printing-training-certificate #training-certificate .certificate-page {
        aspect-ratio: auto !important;
        break-after: avoid-page !important;
        page-break-after: avoid !important;
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
              onClick={() => void printCertificate()}
              disabled={!certificateVisualReady}
              className="rounded-lg border border-[#c9a227]/40 bg-[#c9a227]/10 px-4 py-2 text-sm font-medium text-[#e8cf72] transition hover:bg-[#c9a227]/20"
            >
              {certificateVisualReady ? "Print / Save as PDF" : "Preparing certificate..."}
            </button>

            {cert.pdf_url ? (
              <a href={cert.pdf_url} download className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white">
                Download certificate
              </a>
            ) : null}
          </div>

          {/* ==================================================
              CERTIFICATE
             ================================================== */}
<div
  id="training-certificate"
  className="mx-auto w-full max-w-[1400px] bg-[#f7f1e4] text-[#10203b] shadow-2xl print:max-w-none print:shadow-none print:overflow-hidden"
>
  {/* On screen → allow full height. On print → force A4 landscape */}
  <div className="certificate-page relative w-full bg-[#f7f1e4] aspect-[297/210] print:aspect-auto print:h-[210mm] print:overflow-hidden">

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

              {/* TOP-LEFT */}

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

              {/* BOTTOM-RIGHT */}

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

              {/* Frames */}

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

                {/* EXCELLENCE */}

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

                  <div className="mt-3.5 break-words px-4 font-serif text-[clamp(1.55rem,3.8vw,4.1rem)] italic leading-tight text-[#10203b] [overflow-wrap:anywhere]">
                    {finalRecipientName}
                  </div>

                  {showOrganizationName && (
                    <div className="mt-2 text-center">
                      <p className="text-[8px] uppercase tracking-[0.24em] text-[#4a5462] sm:text-[9px]">
                        of
                      </p>

                      <p className="mt-1 break-words px-8 font-serif text-[clamp(0.82rem,1.45vw,1.25rem)] font-semibold leading-tight text-[#10203b] [overflow-wrap:anywhere]">
                        {finalOrganizationName}
                      </p>
                    </div>
                  )}

                  <div className="mx-auto mt-2.5 h-px w-64 bg-[#c79b31]/70 sm:w-80" />
                </div>

                {/* TRAINING */}

                <div className="mt-[1.7%] text-center">
                  <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-[#3d4654] sm:text-[11px]">
                    Has successfully completed the
                  </p>

                  <div className="mt-1.5 break-words px-6 font-serif text-[clamp(0.95rem,1.85vw,1.75rem)] font-semibold uppercase leading-tight tracking-wide text-[#10203b] [overflow-wrap:anywhere]">
                    {finalTrainingTitle}
                  </div>

                </div>

                {/* DETAILS */}

                <div className="mt-[1.6%] border-y border-[#c79b31]/60 py-[1.35%]">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                    <CertificateDetail
                      icon="calendar"
                      label="Completion Date"
                      value={formatDate(
                        finalCompletionDate,
                      )}
                    />

                    <CertificateDetail
                      icon="certificate"
                      label="Certificate ID"
                      value={
                        cert.certificate_number
                      }
                    />

                    {finalTrainerName ? (
                      <CertificateDetail
                        icon="trainer"
                        label="Trainer"
                        value={finalTrainerName}
                      />
                    ) : null}

                    <CertificateDetail
                      icon="issued"
                      label="Issued On"
                      value={formatDate(
                        cert.issued_at,
                      )}
                    />
                  </div>
                </div>

                {/* LOWER SECTION */}

                <div className="mt-[1.4%] grid grid-cols-1 gap-4 sm:grid-cols-[0.78fr_1.7fr_0.82fr] sm:items-start">

                  {/* SEAL */}

                  <div className="flex items-center justify-start">
                    <CertificateSeal />
                  </div>

                  {/* CREDENTIAL STATEMENT */}

                  <div className="rounded-[14px] border border-[#c79b31] bg-[#fbf6eb]/95 px-4 py-3">

                    <div className="flex items-center justify-center gap-2">
                      <div className="h-px w-8 bg-[#c79b31]" />

                      <p className="text-[8.5px] font-semibold uppercase tracking-[0.2em] text-[#a97918] sm:text-[9.5px]">
                        Credential Record
                      </p>

                      <div className="h-px w-8 bg-[#c79b31]" />
                    </div>

                    <div className="mt-2.5 text-center">
                      <p className="text-[8px] leading-4 text-[#293242] sm:text-[9px] sm:leading-5">
                        This certificate is recorded in the
                        ShadowNode training registry and may be
                        verified using the certificate number,
                        QR code, or verification URL shown here.
                      </p>

                      <p className="mt-2 font-mono text-[7px] uppercase tracking-[0.16em] text-[#8c6a1d] sm:text-[8px]">
                        Status: Issued
                      </p>
                    </div>
                  </div>

                  {/* SIGNATORY */}

                  <div className="pt-0.5 text-center">
                    {finalTrainerName ? (
                      <>
                        <div className="mx-auto mt-5 h-px w-32 bg-[#17243b]/40" />
                        <p className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-[#17243b] sm:text-[9px]">
                          {finalTrainerName}
                        </p>
                        <p className="mt-0.5 text-[6.5px] uppercase tracking-[0.2em] text-[#a97918] sm:text-[7.5px]">
                          Recorded trainer / signatory
                        </p>
                      </>
                    ) : null}
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
                            {cert.verification_url ||
                              "Verification URL unavailable"}
                          </p>

                        </div>
                      </div>

                      {/* QR */}

                      <div className="shrink-0">

                        {cert.verification_url ? (
                          <RealQrCode
                            value={cert.verification_url}
                            size={58}
                            onReady={() => setCertificateVisualReady(true)}
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

  if (
    isTrainingComplete &&
    !hasFeedback
  ) {
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

  if (
    isTrainingComplete &&
    hasFeedback
  ) {
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

              {feedback?.certificate_recipient_name && (
                <p className="mt-3 text-xs text-white/55">
                  Certificate name:{" "}
                  <span className="font-semibold text-white">
                    {
                      feedback.certificate_recipient_name
                    }
                  </span>
                </p>
              )}

              {feedback?.rating ? (
                <div className="mt-3 flex items-center gap-3">

                  <div className="flex gap-0.5 text-[#d5a63b]">
                    {Array.from(
                      {
                        length: 5,
                      },
                      (
                        _,
                        index,
                      ) => (
                        <span
                          key={
                            index
                          }
                          className="text-lg leading-none"
                        >
                          {feedback.rating >
                          index
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
              satisfied. Issue official Certificates of
              Completion for eligible participants.
            </p>

            {participants.length > 0 ? (
              <div className="mt-5 space-y-3">
                {participants.map(
                  (participant) => {
                    const issued =
                      Boolean(
                        participant.certificate_id,
                      )

                    return (
                      <div
                        key={participant.id}
                        className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {
                              participant.certificate_name
                            }
                          </p>

                          {participant.email && (
                            <p className="mt-1 truncate text-xs text-white/35">
                              {
                                participant.email
                              }
                            </p>
                          )}

                          {issued && (
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#20dc73]/75">
                              Issued{" "}
                              {
                                participant.certificate_number
                              }
                            </p>
                          )}
                        </div>

                        {issued ? (
                          <a
                            href={`/dashboard/training/${engagementId}/certificate?certificateId=${participant.certificate_id}`}
                            className="inline-flex items-center justify-center rounded-lg border border-[#20dc73]/30 bg-[#20dc73]/10 px-4 py-2 text-xs font-semibold text-[#20dc73] transition hover:bg-[#20dc73]/15"
                          >
                            View
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              issueCertificate(
                                participant.id,
                              )
                            }
                            disabled={
                              loading ||
                              participant.certificate_eligible ===
                                false
                            }
                            className="inline-flex items-center justify-center rounded-lg bg-[#20dc73] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#35e47f] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {loading
                              ? "Issuing..."
                              : "Issue"}
                          </button>
                        )}
                      </div>
                    )
                  },
                )}

                {participants.some(
                  (participant) =>
                    !participant.certificate_id &&
                    participant.certificate_eligible !==
                      false,
                ) && (
                  <button
                    type="button"
                    onClick={() =>
                      issueCertificate(
                        null,
                        true,
                      )
                    }
                    disabled={loading}
                    className="inline-flex items-center rounded-lg border border-[#20dc73]/40 bg-[#20dc73]/10 px-5 py-3 text-sm font-semibold text-[#20dc73] transition hover:bg-[#20dc73]/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? "Issuing Certificates..."
                      : "Issue All Eligible"}
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  issueCertificate()
                }
                disabled={
                  loading
                }
                className="mt-5 inline-flex items-center rounded-lg bg-[#20dc73] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#35e47f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Issuing Certificate..."
                  : "Issue Certificate"}
              </button>
            )}

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
  onReady,
}: {
  value: string
  size?: number
  onReady?: () => void
}) {
  const [qrDataUrl, setQrDataUrl] =
    useState<string | null>(null)

  const [error, setError] =
    useState(false)

  const onReadyRef = useRef(onReady)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    let cancelled = false

    async function generateQr() {
      if (!value) {
        setQrDataUrl(null)
        return
      }

      try {
        setError(false)

        const dataUrl =
          await QRCode.toDataURL(
            value,
            {
              errorCorrectionLevel:
                "H",
              margin: 1,
              width: 300,
              color: {
                dark: "#101b32",
                light: "#ffffff",
              },
            },
          )

        if (!cancelled) {
          setQrDataUrl(
            dataUrl,
          )
          onReadyRef.current?.()
        }
      } catch (error) {
        console.error(
          "Failed to generate certificate QR:",
          error,
        )

        if (!cancelled) {
          setError(true)
          setQrDataUrl(null)
          onReadyRef.current?.()
        }
      }
    }

    generateQr()

    return () => {
      cancelled = true
    }
  }, [value, onReady])

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

        {Array.from(
          { length: 24 },
        ).map(
          (_, i) => {
            const angle =
              (i * 15 * Math.PI) /
              180

            const x =
              55 +
              Math.cos(angle) *
                49

            const y =
              55 +
              Math.sin(angle) *
                49

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

        {/* Top curved text */}

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

        {/* Bottom curved text */}

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

        {/* Stars */}

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

        {icon ===
          "calendar" && (
          <CalendarIcon />
        )}

        {icon ===
          "clock" && (
          <ClockIcon />
        )}

        {icon ===
          "certificate" && (
          <CertificateIcon />
        )}

        {icon ===
          "trainer" && (
          <UserIcon />
        )}

        {icon ===
          "issued" && (
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
