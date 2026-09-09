import Link from "next/link"
import { notFound } from "next/navigation"

import { query } from "@/lib/db"

type CertificateRow = {
  id: string
  certificate_number: string | null
  recipient_name: string | null
  training_title: string | null
  training_type: string | null
  trainer_name: string | null
  completion_date: string | null
  issued_at: string | null
  status: string | null
}

type CertificateVerificationPageProps = {
  params: Promise<{
    token: string
  }>
}

function toNullableString(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  const stringValue =
    String(value).trim()

  return stringValue || null
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
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

export default async function CertificateVerificationPage({
  params,
}: CertificateVerificationPageProps) {
  const { token } = await params

  const cleanToken =
    String(token || "").trim()

  if (!cleanToken) {
    notFound()
  }

  const result = await query(
    `
      SELECT
        id,
        certificate_number,
        recipient_name,
        training_title,
        training_type,
        trainer_name,
        completion_date,
        issued_at,
        status
      FROM training_certificates
      WHERE verification_token = $1
      LIMIT 1
    `,
    [cleanToken],
  )

  const rawCertificate =
    result.rows[0] as
      | Record<string, unknown>
      | undefined

  if (!rawCertificate) {
    return (
      <main className="min-h-screen bg-[#020806] px-4 py-10 text-white">
        <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
          <section className="w-full overflow-hidden rounded-2xl border border-red-500/20 bg-[#04100b] shadow-2xl">
            <div className="border-b border-red-500/10 bg-red-500/[0.04] px-6 py-8 sm:px-10">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-red-400/30 bg-red-400/10 text-red-300">
                  <WarningIcon />
                </div>

                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-red-300/70">
                    ShadowNode Verification
                  </p>

                  <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                    Certificate Not Found
                  </h1>
                </div>
              </div>
            </div>

            <div className="px-6 py-8 sm:px-10">
              <p className="text-sm leading-7 text-white/55">
                The certificate verification token
                provided is invalid or the certificate
                is no longer available in the ShadowNode
                certificate registry.
              </p>

              <div className="mt-6 rounded-xl border border-white/5 bg-black/20 p-4">
                <p className="text-[9px] uppercase tracking-[0.18em] text-white/25">
                  Verification Result
                </p>

                <p className="mt-2 font-mono text-sm text-red-300">
                  NOT VERIFIED
                </p>
              </div>

              <Link
                href="/"
                className="mt-6 inline-flex rounded-lg border border-[#20dc73]/30 bg-[#20dc73]/10 px-4 py-2 text-sm font-medium text-[#20dc73] transition hover:bg-[#20dc73]/15"
              >
                Return to ShadowNode
              </Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  /*
   * Normalize every database value.
   * This prevents unknown values from reaching
   * JSX and child components.
   */
  const certificate: CertificateRow = {
    id:
      toNullableString(
        rawCertificate.id,
      ) || "",

    certificate_number:
      toNullableString(
        rawCertificate.certificate_number,
      ),

    recipient_name:
      toNullableString(
        rawCertificate.recipient_name,
      ),

    training_title:
      toNullableString(
        rawCertificate.training_title,
      ),

    training_type:
      toNullableString(
        rawCertificate.training_type,
      ),

    trainer_name:
      toNullableString(
        rawCertificate.trainer_name,
      ),

    completion_date:
      toNullableString(
        rawCertificate.completion_date,
      ),

    issued_at:
      toNullableString(
        rawCertificate.issued_at,
      ),

    status:
      toNullableString(
        rawCertificate.status,
      ),
  }

  const certificateStatus =
    String(
      certificate.status || "",
    ).toLowerCase()

  const verified =
    certificateStatus === "issued"

  const completionDate =
    formatDate(
      certificate.completion_date,
    )

  const issuedDate =
    formatDate(
      certificate.issued_at,
    )

  const certificateNumber =
    certificate.certificate_number ||
    "—"

  const recipientName =
    certificate.recipient_name ||
    "Certificate Recipient"

  const trainingTitle =
    certificate.training_title ||
    "Cybersecurity Training"

  const trainerName =
    certificate.trainer_name ||
    "ShadowNode Training Team"

  return (
    <main className="min-h-screen bg-[#020806] text-white">
      {/* ======================================================
          BACKGROUND
         ====================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-220px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#20dc73]/[0.03] blur-3xl" />

        <div className="absolute bottom-[-220px] right-[-150px] h-[450px] w-[450px] rounded-full bg-[#c9a227]/[0.035] blur-3xl" />
      </div>

      {/* ======================================================
          HEADER
         ====================================================== */}

      <header className="relative border-b border-[#143b28] bg-[#020806]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <ShieldLogo />

            <div>
              <div className="text-sm font-semibold tracking-[0.16em] text-white">
                SHADOWNODE
              </div>

              <div className="mt-1 text-[8px] uppercase tracking-[0.28em] text-white/30">
                Trusted. Secure. Unseen.
              </div>
            </div>
          </Link>

          <div className="text-right">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">
              Public Registry
            </p>

            <p className="mt-1 text-xs text-white/45">
              Certificate Verification
            </p>
          </div>
        </div>
      </header>

      {/* ======================================================
          MAIN
         ====================================================== */}

      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {/* ====================================================
            VERIFIED BANNER
           ==================================================== */}

        <section
          className={
            verified
              ? "overflow-hidden rounded-2xl border border-[#20dc73]/20 bg-[#04100b] shadow-2xl shadow-black/30"
              : "overflow-hidden rounded-2xl border border-yellow-500/20 bg-[#04100b] shadow-2xl shadow-black/30"
          }
        >
          <div
            className={
              verified
                ? "border-b border-[#20dc73]/10 bg-[#20dc73]/[0.035] px-6 py-8 sm:px-10"
                : "border-b border-yellow-500/10 bg-yellow-500/[0.035] px-6 py-8 sm:px-10"
            }
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={
                    verified
                      ? "flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#20dc73]/30 bg-[#20dc73]/10 text-[#20dc73]"
                      : "flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
                  }
                >
                  {verified ? (
                    <CheckIcon />
                  ) : (
                    <WarningIcon />
                  )}
                </div>

                <div>
                  <p
                    className={
                      verified
                        ? "font-mono text-[10px] uppercase tracking-[0.24em] text-[#20dc73]/70"
                        : "font-mono text-[10px] uppercase tracking-[0.24em] text-yellow-300/70"
                    }
                  >
                    ShadowNode Certificate Registry
                  </p>

                  <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                    {verified
                      ? "Certificate Verified"
                      : "Certificate Verification Notice"}
                  </h1>
                </div>
              </div>

              <div
                className={
                  verified
                    ? "inline-flex self-start rounded-full border border-[#20dc73]/20 bg-[#20dc73]/10 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#20dc73] sm:self-auto"
                    : "inline-flex self-start rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-yellow-300 sm:self-auto"
                }
              >
                {verified
                  ? "VERIFIED"
                  : "NOT VERIFIED"}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            {/* ==================================================
                CERTIFICATE HERO
               ================================================== */}

            <div className="text-center">
              <div className="font-serif text-3xl font-semibold uppercase tracking-[0.12em] text-[#d8b55a] sm:text-4xl">
                Certificate
              </div>

              <div className="mt-2 text-sm uppercase tracking-[0.32em] text-white/45">
                Of Completion
              </div>

              <div className="mx-auto mt-5 h-px w-24 bg-[#c9a227]" />
            </div>

            {/* ==================================================
                RECIPIENT
               ================================================== */}

            <div className="mt-10 text-center">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/30">
                This certificate was issued to
              </p>

              <h2 className="mt-4 break-words font-serif text-3xl italic text-white sm:text-4xl">
                {recipientName}
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/45">
                The ShadowNode Operations Bureau confirms
                that the above participant successfully
                completed the recorded training engagement.
              </p>
            </div>

            {/* ==================================================
                TRAINING
               ================================================== */}

            <div className="mx-auto mt-9 max-w-3xl rounded-xl border border-[#143b28] bg-black/15 p-5 text-center sm:p-7">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/25">
                Training Programme
              </p>

              <p className="mt-3 font-serif text-xl font-semibold text-[#d7b34f] sm:text-2xl">
                {trainingTitle}
              </p>

              {certificate.training_type && (
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/30">
                  {certificate.training_type}
                </p>
              )}
            </div>

            {/* ==================================================
                DETAILS
               ================================================== */}

            <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-[#143b28] bg-[#143b28] sm:grid-cols-2 lg:grid-cols-4">
              <VerificationDetail
                label="Certificate ID"
                value={certificateNumber}
              />

              <VerificationDetail
                label="Completion Date"
                value={completionDate}
              />

              <VerificationDetail
                label="Trainer"
                value={trainerName}
              />

              <VerificationDetail
                label="Issued On"
                value={issuedDate}
              />
            </div>

            {/* ==================================================
                VERIFICATION RESULT
               ================================================== */}

            <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div
                className={
                  verified
                    ? "rounded-xl border border-[#20dc73]/15 bg-[#20dc73]/[0.035] p-5"
                    : "rounded-xl border border-yellow-400/15 bg-yellow-400/[0.035] p-5"
                }
              >
                <div className="flex items-start gap-3">
                  <div
                    className={
                      verified
                        ? "mt-0.5 text-[#20dc73]"
                        : "mt-0.5 text-yellow-300"
                    }
                  >
                    {verified ? (
                      <CheckIcon size={18} />
                    ) : (
                      <WarningIcon size={18} />
                    )}
                  </div>

                  <div>
                    <p
                      className={
                        verified
                          ? "text-sm font-semibold text-[#20dc73]"
                          : "text-sm font-semibold text-yellow-300"
                      }
                    >
                      {verified
                        ? "This certificate is valid."
                        : "This certificate requires verification attention."}
                    </p>

                    <p className="mt-2 text-xs leading-6 text-white/40">
                      Verification was performed against
                      the ShadowNode certificate registry
                      using the certificate's unique
                      verification token.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-[#c9a227]/30 bg-white">
                <RegistryMark />
              </div>
            </div>

            {/* ==================================================
                FOOTER
               ================================================== */}

            <div className="mt-10 border-t border-[#143b28] pt-6">
              <div className="flex flex-col gap-4 text-xs text-white/25 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em]">
                    ShadowNode Operations Bureau
                  </p>

                  <p className="mt-1">
                    Trusted. Secure. Unseen.
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-[9px] uppercase tracking-[0.16em]">
                    Certificate Number
                  </p>

                  <p className="mt-1 font-mono text-xs text-white/45">
                    {certificateNumber}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            VERIFICATION NOTE
           ==================================================== */}

        <div className="mt-6 text-center">
          <p className="text-[10px] leading-5 text-white/20">
            This page is publicly accessible for certificate
            verification. No account is required.
          </p>
        </div>
      </div>
    </main>
  )
}

/*
 * ============================================================
 * VERIFICATION DETAIL
 * ============================================================
 */

function VerificationDetail({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="bg-[#031009] p-5">
      <p className="text-[9px] uppercase tracking-[0.18em] text-white/25">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium text-white/75">
        {value}
      </p>
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
      width="34"
      height="40"
      viewBox="0 0 42 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M21 2L38 8V20.5C38 31.2 31.1 40.3 21 46C10.9 40.3 4 31.2 4 20.5V8L21 2Z"
        fill="#D6AA43"
        fillOpacity="0.12"
        stroke="#C99B31"
        strokeWidth="2"
      />

      <path
        d="M21 8L32 12V20C32 27.4 27.8 34.1 21 38.2C14.2 34.1 10 27.4 10 20V12L21 8Z"
        fill="#101B32"
      />

      <text
        x="21"
        y="27"
        textAnchor="middle"
        fill="#E1B84F"
        fontSize="12"
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
 * CHECK ICON
 * ============================================================
 */

function CheckIcon({
  size = 28,
}: {
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 12.5L9.2 16.5L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/*
 * ============================================================
 * WARNING ICON
 * ============================================================
 */

function WarningIcon({
  size = 28,
}: {
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10.3 4.7L2.9 17.5C2.1 18.9 3.1 20.6 4.7 20.6H19.3C20.9 20.6 21.9 18.9 21.1 17.5L13.7 4.7C12.9 3.3 11.1 3.3 10.3 4.7Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <path
        d="M12 9V13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M12 17H12.01"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/*
 * ============================================================
 * REGISTRY MARK
 * ============================================================
 */

function RegistryMark() {
  return (
    <svg
      width="68"
      height="68"
      viewBox="0 0 68 68"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="64"
        height="64"
        rx="5"
        stroke="#101B32"
        strokeWidth="2"
      />

      <rect
        x="8"
        y="8"
        width="12"
        height="12"
        fill="#101B32"
      />

      <rect
        x="48"
        y="8"
        width="12"
        height="12"
        fill="#101B32"
      />

      <rect
        x="8"
        y="48"
        width="12"
        height="12"
        fill="#101B32"
      />

      <rect
        x="29"
        y="10"
        width="6"
        height="6"
        fill="#C9A227"
      />

      <rect
        x="28"
        y="26"
        width="12"
        height="6"
        fill="#101B32"
      />

      <rect
        x="42"
        y="29"
        width="6"
        height="12"
        fill="#101B32"
      />

      <rect
        x="25"
        y="40"
        width="7"
        height="7"
        fill="#C9A227"
      />

      <rect
        x="35"
        y="50"
        width="6"
        height="8"
        fill="#101B32"
      />

      <rect
        x="47"
        y="47"
        width="13"
        height="6"
        fill="#101B32"
      />
    </svg>
  )
}