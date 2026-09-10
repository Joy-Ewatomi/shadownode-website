"use client"

import {
  Loader2,
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
  return (
    COUNTRY_CURRENCY_MAP[country] ||
    "USD"
  )
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

  const parts =
    value.split("-").map(Number)

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
    date.getMonth() !==
      month - 1 ||
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
  training_client_type:
    "organization",
  training_participant_count: "",
  training_skill_level:
    "beginner",

  training_audience: "",
  training_industry: "",
  custom_industry: "",

  training_goal: "",
  training_objective: "",

  training_topics_selected: [],
  training_objectives: [],

  training_custom_topic: "",

  training_format: "",

  /*
   * The timeline is now date-driven.
   * "custom" remains the compatibility value
   * for the existing backend payload.
   */
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

  training_assessment_required:
    false,

  training_labs_required: false,

  training_preferred_start_date:
    "",

  training_preferred_completion_date:
    "",

  training_timeline_flexible:
    false,

  training_additional_requirements:
    "",

  client_country:
    "United Kingdom",

  preferred_currency:
    "GBP",

  custom_country: "",

  communication_method:
    "portal_notification",

  communication_email: "",
  communication_phone: "",
  communication_whatsapp: "",
  communication_signal: "",

  authorization_confirmed:
    false,

  custom_description: "",
  custom_training_objective: "",
  custom_training_audience: "",
  custom_expected_outcome: "",
}

/* ============================================================
   STEPS
============================================================ */

const STEPS = [
  {
    id: 1,
    label: "Training Service",
  },
  {
    id: 2,
    label: "Training Details",
  },
  {
    id: 3,
    label: "Communication",
  },
  {
    id: 4,
    label: "Review & Authorization",
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
      EMPTY_FORM,
    )

  const [step, setStep] =
    useState(1)

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
         * The training experience is now based on a
         * custom date window rather than preset duration
         * choices.
         */
        next.training_duration =
          "custom"

        /*
         * Automatically keep currency synchronized
         * with country.
         */
        if (
          patch.client_country &&
          patch.client_country !==
            "custom"
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
     NEXT
  ========================================================== */

  function nextStep() {
    if (!canProceed()) {
      return
    }

    if (step < STEPS.length) {
      setStep(
        (current) =>
          current + 1,
      )
    }
  }

  /* ==========================================================
     PREVIOUS
  ========================================================== */

  function prevStep() {
    if (step > 1) {
      setStep(
        (current) =>
          current - 1,
      )
    }
  }

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
      /* ------------------------------------------------------
         STEP 1
      ------------------------------------------------------ */

      case 1:
        return Boolean(
          form.service_type,
        )

      /* ------------------------------------------------------
         STEP 2
      ------------------------------------------------------ */

      case 2:
        return (
          Boolean(
            form.training_audience ||
              form.custom_training_audience,
          ) &&

          form.training_objectives
            .length > 0 &&

          form.training_expected_outcome
            .length > 0 &&

          Boolean(
            form.training_preferred_start_date,
          ) &&

          Boolean(
            form.training_preferred_completion_date,
          ) &&

          isTimelineValid()
        )

      /* ------------------------------------------------------
         STEP 3
      ------------------------------------------------------ */

      case 3:
        if (
          !form.client_country ||
          (
            form.client_country ===
              "custom" &&
            !form.custom_country
          )
        ) {
          return false
        }

        if (
          !form.communication_method
        ) {
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
          "signal"
        ) {
          return Boolean(
            form.communication_signal,
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
          form.communication_method ===
          "portal_notification"
        ) {
          return true
        }

        return false

      /* ------------------------------------------------------
         STEP 4
      ------------------------------------------------------ */

      case 4:
        return (
          form.authorization_confirmed
        )

      default:
        return false
    }
  }

  /* ==========================================================
     SUBMIT
  ========================================================== */

  async function handleSubmit() {
    if (!canProceed()) {
      return
    }

    /*
     * Ensure the compatibility duration value
     * is always present in the submitted payload.
     */
    const submission: CybersecurityTrainingFormData = {
      ...form,
      training_duration:
        "custom",
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
      /* ------------------------------------------------------
         STEP 1
      ------------------------------------------------------ */

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

      /* ------------------------------------------------------
         STEP 2
      ------------------------------------------------------ */

      case 2:
        return (
          <TrainingDetailStep
            form={form}
            set={updateForm}
          />
        )

      /* ------------------------------------------------------
         STEP 3
      ------------------------------------------------------ */

      case 3:
        return (
          <CommunicationStep
            form={form}
            set={updateForm}
          />
        )

      /* ------------------------------------------------------
         STEP 4
      ------------------------------------------------------ */

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

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="space-y-8">

      {/* ======================================================
          STEP INDICATOR
      ====================================================== */}

      <div className="flex items-center justify-between">
        {STEPS.map(
          (item, index) => (
            <div
              key={item.id}
              className="flex items-center"
            >
              <div className="flex items-center">
                <div
                  className={`
                    flex h-8 w-8
                    items-center
                    justify-center
                    rounded-full
                    border
                    text-xs

                    ${
                      step >= item.id
                        ? "border-[#20dc73] bg-[#20dc73]/10 text-[#20dc73]"
                        : "border-[#143b28] text-white/40"
                    }
                  `}
                >
                  {item.id}
                </div>

                <span
                  className={`
                    ml-2 hidden
                    text-xs
                    sm:block

                    ${
                      step >= item.id
                        ? "text-white"
                        : "text-white/40"
                    }
                  `}
                >
                  {item.label}
                </span>
              </div>

              {index <
                STEPS.length -
                  1 && (
                <div
                  className={`
                    mx-3 hidden
                    h-px w-8
                    sm:block md:w-12

                    ${
                      step >
                      item.id
                        ? "bg-[#20dc73]"
                        : "bg-[#143b28]"
                    }
                  `}
                />
              )}
            </div>
          ),
        )}
      </div>

      {/* ======================================================
          STEP CONTENT
      ====================================================== */}

      <div>
        {renderStep()}
      </div>

      {/* ======================================================
          BUTTONS
      ====================================================== */}

      <div className="flex items-center justify-between border-t border-[#143b28] pt-6">

        <button
          type="button"
          onClick={prevStep}
          disabled={
            step === 1 ||
            submitting
          }
          className="rounded-xl border border-[#143b28] px-5 py-2.5 text-sm text-white/70 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        {step <
        STEPS.length ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={
              !canProceed() ||
              submitting
            }
            className="rounded-xl bg-[#20dc73] px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-[#20dc73]/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={
              handleSubmit
            }
            disabled={
              submitting ||
              !canProceed()
            }
            className="flex items-center gap-2 rounded-xl bg-[#20dc73] px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-[#20dc73]/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting && (
              <Loader2
                className="h-4 w-4 animate-spin"
              />
            )}

            {submitting
              ? "Submitting..."
              : "Submit Request"}
          </button>
        )}
      </div>
    </div>
  )
}