"use client"

import type { LucideIcon } from "lucide-react"

import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileCheck2,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"

import {
  useCallback,
  useState,
} from "react"

import TrainingServiceStep from "./cybersecurity-training/steps/TrainingServiceStep"
import TrainingDetailStep from "./cybersecurity-training/steps/TrainingDetailStep"
import CommunicationStep from "./cybersecurity-training/steps/CommunicationStep"
import ReviewAuthorizationStep from "./cybersecurity-training/steps/ReviewAuthorizationStep"

/* ============================================================
   TYPES
============================================================ */

export type CybersecurityTrainingFormData = {
  category: string
  service_type: string

  training_organization_name: string
  training_client_type: string
  training_participant_count: string
  training_skill_level: string

  training_audience: string
  training_industry: string
  custom_industry: string

  training_goal: string
  training_objective: string

  training_topics_selected: string[]
  training_objectives: string[]

  training_custom_topic: string

  training_format: string
  training_duration: string

  custom_sessions_per_week: string
  custom_hours_per_session: string
  custom_training_days: string[]
  custom_session_time: string
  custom_training_period: string

  training_materials: string[]
  training_compliance: string[]

  training_certificate: string

  training_expected_outcome: string[]

  training_assessment_required: boolean
  training_labs_required: boolean

  training_preferred_start_date: string
  training_preferred_completion_date: string

  training_timeline_flexible: boolean

  training_additional_requirements: string

  client_country: string
  preferred_currency: string
  custom_country: string

  communication_method: string

  communication_email: string
  communication_phone: string
  communication_whatsapp: string
  communication_signal: string

  authorization_confirmed: boolean

  custom_description: string
  custom_training_objective: string
  custom_training_audience: string
  custom_expected_outcome: string
}

/* ============================================================
   COUNTRY / CURRENCY
============================================================ */

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  Nigeria: "NGN",
  "United States": "USD",
  Canada: "CAD",
  India: "INR",
  Ghana: "GHS",
  Kenya: "KES",
  Germany: "EUR",
  France: "EUR",
  Italy: "EUR",
  Spain: "EUR",
  Australia: "AUD",
  Japan: "JPY",
  China: "CNY",
  Singapore: "SGD",
  "United Kingdom": "GBP",
}

function getCurrency(country: string) {
  return COUNTRY_CURRENCY_MAP[country] || "USD"
}

/* ============================================================
   DATE HELPERS
============================================================ */

function parseDateOnly(
  value: string,
): Date | null {
  if (!value) {
    return null
  }

  const parts = value.split("-").map(Number)

  if (
    parts.length !== 3 ||
    parts.some(
      (part) =>
        !Number.isFinite(part),
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

/* ============================================================
   INITIAL FORM
============================================================ */

const EMPTY_FORM: CybersecurityTrainingFormData = {
  category: "cybersecurity",

  service_type: "",

  training_organization_name: "",
  training_client_type: "organization",
  training_participant_count: "",
  training_skill_level: "beginner",

  training_audience: "",
  training_industry: "",
  custom_industry: "",

  training_goal: "",
  training_objective: "",

  training_topics_selected: [],
  training_objectives: [],

  training_custom_topic: "",

  training_format: "",
  training_duration: "custom",

  custom_sessions_per_week: "",
  custom_hours_per_session: "",
  custom_training_days: [],
  custom_session_time: "",
  custom_training_period: "",

  training_materials: [],
  training_compliance: [],

  training_certificate: "",

  training_expected_outcome: [],

  training_assessment_required: false,
  training_labs_required: false,

  training_preferred_start_date: "",
  training_preferred_completion_date: "",

  training_timeline_flexible: false,

  training_additional_requirements: "",

  client_country: "United Kingdom",
  preferred_currency: "GBP",
  custom_country: "",

  communication_method: "portal",

  communication_email: "",
  communication_phone: "",
  communication_whatsapp: "",
  communication_signal: "",

  authorization_confirmed: false,

  custom_description: "",
  custom_training_objective: "",
  custom_training_audience: "",
  custom_expected_outcome: "",
}

/* ============================================================
   STEP DEFINITIONS
============================================================ */

type StepDefinition = {
  id: number
  label: string
  shortLabel: string
  description: string
  icon: LucideIcon
}

const STEPS: StepDefinition[] = [
  {
    id: 1,
    label: "Training Service",
    shortLabel: "Service",
    description:
      "Choose the cybersecurity training service that best fits your needs.",
    icon: Sparkles,
  },
  {
    id: 2,
    label: "Training Details",
    shortLabel: "Details",
    description:
      "Tell us about your participants, objectives, topics, format, and timeline.",
    icon: Users,
  },
  {
    id: 3,
    label: "Communication",
    shortLabel: "Contact",
    description:
      "Choose how ShadowNode should communicate with you about this request.",
    icon: MessageCircle,
  },
  {
    id: 4,
    label: "Review & Authorization",
    shortLabel: "Review",
    description:
      "Review your request and confirm your legal authorization before submission.",
    icon: FileCheck2,
  },
]

/* ============================================================
   PROPS
============================================================ */

type Props = {
  submitting: boolean

  onSubmit: (
    data: CybersecurityTrainingFormData,
  ) => Promise<void>
}

/* ============================================================
   COMPONENT
============================================================ */

export default function CybersecurityTrainingForm({
  submitting,
  onSubmit,
}: Props) {
  const [form, setForm] =
    useState<CybersecurityTrainingFormData>(
      {
        ...EMPTY_FORM,
        communication_method: "portal",
      },
    )

  const [step, setStep] = useState(1)

  /* ==========================================================
     UPDATE FORM
  ========================================================== */

  const updateForm = useCallback(
    (
      patch: Partial<CybersecurityTrainingFormData>,
    ) => {
      setForm((previous) => {
        const next = {
          ...previous,
          ...patch,
        }

        /*
         * Training duration remains compatible
         * with the existing backend structure.
         */
        next.training_duration = "custom"

        /*
         * Keep currency synchronized with country.
         */
        if (
          patch.client_country &&
          patch.client_country !== "custom"
        ) {
          next.preferred_currency =
            getCurrency(
              patch.client_country,
            )
        }

        return next
      })
    },
    [],
  )

  /* ==========================================================
     TIMELINE VALIDATION
  ========================================================== */

  function isTimelineValid() {
    const start =
      parseDateOnly(
        form.training_preferred_start_date,
      )

    const completion =
      parseDateOnly(
        form.training_preferred_completion_date,
      )

    if (!start || !completion) {
      return false
    }

    return (
      completion.getTime() >=
      start.getTime()
    )
  }

  /* ==========================================================
     VALIDATION
  ========================================================== */

  function canProceed() {
    switch (step) {
      case 1:
        return Boolean(
          form.service_type,
        )

      case 2:
        return (
          Boolean(
            form.training_audience ||
              form.custom_training_audience,
          ) &&
          form.training_objectives.length > 0 &&
          form.training_expected_outcome.length > 0 &&
          Boolean(
            form.training_preferred_start_date,
          ) &&
          Boolean(
            form.training_preferred_completion_date,
          ) &&
          isTimelineValid()
        )

      case 3:
        if (
          !form.client_country ||
          (
            form.client_country === "custom" &&
            !form.custom_country
          )
        ) {
          return false
        }

        if (!form.communication_method) {
          return false
        }

        if (
          form.communication_method ===
          "email"
        ) {
          return Boolean(
            form.communication_email,
          )
        }

        if (
          form.communication_method ===
          "whatsapp"
        ) {
          return Boolean(
            form.communication_whatsapp,
          )
        }

        if (
          form.communication_method ===
          "phone"
        ) {
          return Boolean(
            form.communication_phone,
          )
        }

        if (
          form.communication_method === "portal" ||
          form.communication_method ===
            "portal_notification"
        ) {
          return true
        }

        return false

      case 4:
        return form.authorization_confirmed

      default:
        return false
    }
  }

  /* ==========================================================
     NAVIGATION
  ========================================================== */

  function nextStep() {
    if (!canProceed() || submitting) {
      return
    }

    if (step < STEPS.length) {
      setStep(
        (current) =>
          current + 1,
      )
    }
  }

  function prevStep() {
    if (step > 1 && !submitting) {
      setStep(
        (current) =>
          current - 1,
      )
    }
  }

  function jumpToStep(
    targetStep: number,
  ) {
    if (
      submitting ||
      targetStep < 1 ||
      targetStep > STEPS.length
    ) {
      return
    }

    /*
     * Do not allow users to skip forward
     * over incomplete steps.
     */
    if (targetStep > step) {
      return
    }

    setStep(targetStep)
  }

  /* ==========================================================
     SUBMIT
  ========================================================== */

  async function handleSubmit() {
    if (
      !canProceed() ||
      submitting
    ) {
      return
    }

    const submission: CybersecurityTrainingFormData = {
      ...form,
      training_duration: "custom",
    }

    await onSubmit(
      submission,
    )
  }

  /* ==========================================================
     STEP CONTENT
  ========================================================== */

  function renderStep() {
    switch (step) {
      case 1:
        return (
          <TrainingServiceStep
            service_type={
              form.service_type
            }
            custom_description={
              form.custom_description
            }
            onSelect={(value) =>
              updateForm({
                service_type: value,
              })
            }
            onCustomDescriptionChange={(
              value,
            ) =>
              updateForm({
                custom_description:
                  value,
              })
            }
          />
        )

      case 2:
        return (
          <TrainingDetailStep
            form={form}
            set={updateForm}
          />
        )

      case 3:
        return (
          <CommunicationStep
            form={form}
            set={updateForm}
          />
        )

      case 4:
        return (
          <ReviewAuthorizationStep
            form={form}
            set={updateForm}
          />
        )

      default:
        return null
    }
  }

  const currentStep =
    STEPS.find(
      (item) =>
        item.id === step,
    ) || STEPS[0]

  const CurrentIcon =
    currentStep.icon

  const progress =
    ((step - 1) /
      (STEPS.length - 1)) *
    100

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="w-full">
      {/* ======================================================
          MOBILE PROGRESS
      ====================================================== */}

      <div className="mb-4 rounded-2xl border border-[#143b28] bg-[#06110f] p-4 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#20dc73]/30 bg-[#20dc73]/10">
              <CurrentIcon className="h-5 w-5 text-[#20dc73]" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#20dc73]">
                Step {step} of {STEPS.length}
              </p>

              <p className="mt-1 truncate text-sm font-semibold text-white">
                {currentStep.label}
              </p>
            </div>
          </div>

          <span className="shrink-0 font-mono text-xs text-white/35">
            {Math.round(
              ((step) /
                STEPS.length) *
                100,
            )}
            %
          </span>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-[#20dc73] transition-all duration-300"
            style={{
              width: `${Math.max(
                12.5,
                ((step) /
                  STEPS.length) *
                  100,
              )}%`,
            }}
          />
        </div>

        <p className="mt-3 text-xs leading-5 text-white/40">
          {currentStep.description}
        </p>
      </div>

      {/* ======================================================
          MAIN WIZARD
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-[#143b28] bg-[#06110f] shadow-[0_0_60px_rgba(32,220,115,0.04)]">
        <div className="grid lg:grid-cols-[250px_1fr]">
          {/* ==================================================
              DESKTOP SIDE RAIL
          ================================================== */}

          <aside className="hidden border-r border-[#143b28] bg-black/20 lg:block">
            <div className="sticky top-6 p-5">
              <div className="mb-7">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#20dc73]" />

                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#20dc73]">
                    Secure Request
                  </span>
                </div>

                <h2 className="mt-3 text-lg font-bold text-white">
                  Cybersecurity Training
                </h2>

                <p className="mt-2 text-xs leading-5 text-white/40">
                  Complete each stage to prepare your training request.
                </p>
              </div>

              <div className="relative space-y-2">
                {/* Vertical connector */}
                <div className="absolute left-[20px] top-5 bottom-5 w-px bg-[#143b28]" />

                <div
                  className="absolute left-[20px] top-5 w-px bg-[#20dc73] transition-all duration-300"
                  style={{
                    height: `${progress}%`,
                  }}
                />

                {STEPS.map(
                  (item) => {
                    const Icon = item.icon

                    const completed =
                      item.id < step

                    const active =
                      item.id === step

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          jumpToStep(
                            item.id,
                          )
                        }
                        disabled={
                          submitting ||
                          item.id >
                            step
                        }
                        className={`relative z-10 flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                          active
                            ? "border border-[#20dc73]/20 bg-[#20dc73]/8"
                            : completed
                              ? "hover:bg-white/[0.03]"
                              : "opacity-55"
                        } disabled:cursor-not-allowed`}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                            active
                              ? "border-[#20dc73] bg-[#20dc73] text-black"
                              : completed
                                ? "border-[#20dc73]/50 bg-[#20dc73]/10 text-[#20dc73]"
                                : "border-[#143b28] bg-[#06110f] text-white/35"
                          }`}
                        >
                          {completed ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p
                            className={`text-xs font-semibold ${
                              active ||
                              completed
                                ? "text-white"
                                : "text-white/40"
                            }`}
                          >
                            {item.label}
                          </p>

                          <p className="mt-0.5 text-[10px] text-white/30">
                            {completed
                              ? "Completed"
                              : active
                                ? "Current stage"
                                : "Upcoming"}
                          </p>
                        </div>
                      </button>
                    )
                  },
                )}
              </div>

              {/* Security note */}
              <div className="mt-8 rounded-xl border border-[#143b28] bg-[#06110f] p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#20dc73]" />

                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
                    Protected Submission
                  </span>
                </div>

                <p className="mt-2 text-[11px] leading-5 text-white/30">
                  Your request is submitted through the secure ShadowNode operations portal.
                </p>
              </div>
            </div>
          </aside>

          {/* ==================================================
              CONTENT AREA
          ================================================== */}

          <section className="min-w-0">
            {/* Header */}
            <div className="border-b border-[#143b28] px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex items-start justify-between gap-5">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#20dc73]/25 bg-[#20dc73]/10 sm:flex">
                    <CurrentIcon className="h-5 w-5 text-[#20dc73]" />
                  </div>

                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#20dc73]">
                      Stage {String(step).padStart(2, "0")}
                    </p>

                    <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                      {currentStep.label}
                    </h1>

                    <p className="mt-1 max-w-2xl text-xs leading-5 text-white/40 sm:text-sm">
                      {currentStep.description}
                    </p>
                  </div>
                </div>

                <div className="hidden shrink-0 items-center gap-2 rounded-lg border border-[#143b28] bg-black/20 px-3 py-2 sm:flex">
                  <Clock3 className="h-3.5 w-3.5 text-white/30" />

                  <span className="text-[10px] uppercase tracking-[0.12em] text-white/35">
                    {step === 4
                      ? "Final review"
                      : "In progress"}
                  </span>
                </div>
              </div>

              {/* Desktop mini progress */}
              <div className="mt-5 hidden items-center gap-1.5 sm:flex">
                {STEPS.map(
                  (item) => {
                    const completed =
                      item.id < step
                    const active =
                      item.id === step

                    return (
                      <div
                        key={item.id}
                        className="flex min-w-0 flex-1 items-center gap-2"
                      >
                        <div
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            completed
                              ? "bg-[#20dc73]"
                              : active
                                ? "bg-[#20dc73]/60"
                                : "bg-[#143b28]"
                          }`}
                        />

                        {item.id === step && (
                          <span className="font-mono text-[9px] text-white/30">
                            {item.id}/
                            {STEPS.length}
                          </span>
                        )}
                      </div>
                    )
                  },
                )}
              </div>
            </div>

            {/* ==================================================
                FORM BODY
            ================================================== */}

            <div className="px-5 py-6 sm:px-7 sm:py-7">
              <form
                onSubmit={(event) => {
                  event.preventDefault()

                  if (
                    step <
                    STEPS.length
                  ) {
                    nextStep()
                    return
                  }

                  handleSubmit()
                }}
              >
                <div
                  key={step}
                  className="min-h-[360px] animate-[fadeIn_.2s_ease-out]"
                >
                  {renderStep()}
                </div>

                {/* ==================================================
                    NAVIGATION
                ================================================== */}

                <div className="mt-7 border-t border-[#143b28] pt-5">
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      {step > 1 ? (
                        <button
                          type="button"
                          onClick={
                            prevStep
                          }
                          disabled={
                            submitting
                          }
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#143b28] px-5 text-sm font-medium text-white/65 transition hover:border-white/20 hover:bg-white/[0.03] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Back
                        </button>
                      ) : (
                        <div className="hidden sm:block">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-white/20">
                            Start your request
                          </p>

                          <p className="mt-1 text-xs text-white/35">
                            One step at a time.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      <div className="hidden text-right sm:block">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-white/25">
                          Progress
                        </p>

                        <p className="mt-1 font-mono text-xs text-white/40">
                          {step} /{" "}
                          {STEPS.length}
                        </p>
                      </div>

                      {step <
                      STEPS.length ? (
                        <button
                          type="submit"
                          disabled={
                            submitting ||
                            !canProceed()
                          }
                          className="inline-flex h-11 min-w-[132px] items-center justify-center gap-2 rounded-xl bg-[#20dc73] px-6 text-sm font-bold text-black shadow-[0_8px_30px_rgba(32,220,115,0.08)] transition hover:bg-[#3aee89] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Continue
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={
                            submitting ||
                            !canProceed()
                          }
                          className="inline-flex h-11 min-w-[180px] items-center justify-center gap-2 rounded-xl bg-[#20dc73] px-6 text-sm font-bold text-black shadow-[0_8px_30px_rgba(32,220,115,0.08)] transition hover:bg-[#3aee89] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Submit Request
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>

      {/* ======================================================
          MOBILE STEP STRIP
      ====================================================== */}

      <div className="mt-4 grid grid-cols-4 gap-2 lg:hidden">
        {STEPS.map(
          (item) => {
            const Icon = item.icon
            const completed =
              item.id < step
            const active =
              item.id === step

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-2.5 text-center ${
                  active
                    ? "border-[#20dc73]/30 bg-[#20dc73]/8"
                    : completed
                      ? "border-[#143b28] bg-[#06110f]"
                      : "border-[#143b28]/60 bg-black/10"
                }`}
              >
                <div className="flex justify-center">
                  {completed ? (
                    <Check className="h-3.5 w-3.5 text-[#20dc73]" />
                  ) : (
                    <Icon
                      className={`h-3.5 w-3.5 ${
                        active
                          ? "text-[#20dc73]"
                          : "text-white/30"
                      }`}
                    />
                  )}
                </div>

                <p
                  className={`mt-1.5 text-[9px] font-medium ${
                    active
                      ? "text-[#20dc73]"
                      : completed
                        ? "text-white/50"
                        : "text-white/25"
                  }`}
                >
                  {item.shortLabel}
                </p>
              </div>
            )
          },
        )}
      </div>

      {/* ======================================================
          GLOBAL ANIMATION
      ====================================================== */}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
