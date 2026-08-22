"use client"

import { CheckCircle2 } from "lucide-react"

import type {
  CybersecurityTrainingFormData,
} from "../../CybersecurityTrainingForm"

import { CYBERSECURITY_SERVICES } from "../constants"

type Props = {
  form: CybersecurityTrainingFormData
  set: (patch: Partial<CybersecurityTrainingFormData>) => void
}

function isCustom(value: string | null | undefined) {
  return value?.trim().toLowerCase() === "custom"
}

function resolveSingleValue(
  selected: string | null | undefined,
  custom?: string | null,
) {
  if (isCustom(selected)) {
    return custom?.trim() || "Custom value not provided"
  }

  return selected?.trim() || "Not selected"
}

function resolveMultiValue(
  values: string[] | null | undefined,
  custom?: string | null,
) {
  if (!values?.length) {
    return "Not selected"
  }

  return (
    values
      .map((item) =>
        isCustom(item)
          ? custom?.trim() || null
          : item?.trim(),
      )
      .filter(Boolean)
      .join(", ") || "Not selected"
  )
}

function resolveService(
  form: CybersecurityTrainingFormData,
) {
  if (form.service_type === "custom") {
    return form.custom_description?.trim()
      ? `Custom Cybersecurity Training — ${form.custom_description.trim()}`
      : "Custom Cybersecurity Training"
  }

  return (
    CYBERSECURITY_SERVICES.find(
      (service) => service.id === form.service_type,
    )?.title ||
    form.service_type?.trim() ||
    "Not selected"
  )
}

export default function ReviewAuthorizationStep({
  form,
  set,
}: Props) {
  const service = resolveService(form)

  const audience = resolveSingleValue(
    form.training_audience,
    form.custom_training_audience,
  )

  const industry =
    form.training_industry === "Other"
      ? form.custom_industry?.trim() || "Other"
      : resolveSingleValue(
          form.training_industry,
          form.custom_industry,
        )

  const skillLevel = resolveSingleValue(
    form.training_skill_level,
  )

  const objectives = resolveMultiValue(
    form.training_objectives,
    form.custom_training_objective,
  )

  const topics = resolveMultiValue(
    form.training_topics_selected,
    form.training_custom_topic,
  )

  const outcomes = resolveMultiValue(
    form.training_expected_outcome,
    form.custom_expected_outcome,
  )

  const goal =
    form.training_goal?.trim() || "Not provided"

  const format =
    form.training_format?.trim() || "Not selected"

  const materials =
    form.training_materials?.length
      ? form.training_materials.join(", ")
      : "Not selected"

  const duration = isCustom(form.training_duration)
    ? [
        form.custom_sessions_per_week
          ? `${form.custom_sessions_per_week} sessions/week`
          : null,

        form.custom_hours_per_session
          ? `${form.custom_hours_per_session} hours/session`
          : null,

        form.custom_training_days?.length
          ? `Days: ${form.custom_training_days.join(", ")}`
          : null,

        form.custom_session_time
          ? `Time: ${form.custom_session_time}`
          : null,

        form.custom_training_period
          ? `Period: ${form.custom_training_period}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Custom duration not provided"
    : form.training_duration?.trim() || "Not selected"

  const contact =
    form.communication_email?.trim() ||
    form.communication_whatsapp?.trim() ||
    form.communication_signal?.trim() ||
    form.communication_phone?.trim() ||
    "No contact provided"

  const additionalRequirements =
    form.training_additional_requirements?.trim() ||
    "None provided"

  /*
   * IMPORTANT:
   *
   * break-words + [overflow-wrap:anywhere]
   * prevents long unbroken user input from
   * escaping the summary container.
   */
  const valueClass =
    "min-w-0 break-words [overflow-wrap:anywhere] whitespace-pre-wrap text-white"

  return (
    <div className="space-y-6 min-w-0">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-white">
          Review & Authorization
        </h2>

        <p className="mt-2 text-sm text-white/50">
          Confirm that the training requirements below are correct.
        </p>
      </div>

      {/* =====================================================
          SUMMARY
      ====================================================== */}

      <div className="min-w-0 space-y-5 rounded-md border border-[#143b28] bg-black p-5">
        <div className="flex min-w-0 items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#20dc73]" />

          <h3 className="min-w-0 font-semibold text-white">
            Training Request Summary
          </h3>
        </div>

        <div className="grid min-w-0 gap-5 text-sm">

          {/* SERVICE */}

          <div className="min-w-0">
            <p className="text-white/40">
              Service
            </p>

            <p className={valueClass}>
              {service}
            </p>
          </div>

          {/* ORGANIZATION */}

          <div className="min-w-0">
            <p className="text-white/40">
              Organization
            </p>

            <p className={valueClass}>
              {form.training_organization_name?.trim() ||
                "Not provided"}
            </p>
          </div>

          {/* PARTICIPANTS */}

          <div className="min-w-0">
            <p className="text-white/40">
              Expected Learners
            </p>

            <p className={valueClass}>
              {form.training_participant_count ||
                "Not provided"}
            </p>
          </div>

          {/* SKILL LEVEL */}

          <div className="min-w-0">
            <p className="text-white/40">
              Skill Level
            </p>

            <p className="break-words capitalize text-white">
              {skillLevel}
            </p>
          </div>

          {/* AUDIENCE */}

          <div className="min-w-0">
            <p className="text-white/40">
              Training Audience
            </p>

            <p className={valueClass}>
              {audience}
            </p>
          </div>

          {/* INDUSTRY */}

          <div className="min-w-0">
            <p className="text-white/40">
              Industry
            </p>

            <p className={valueClass}>
              {industry}
            </p>
          </div>

          {/* =================================================
              TRAINING GOAL
              ================================================= */}

          <div className="min-w-0">
            <p className="text-white/40">
              Training Goal
            </p>

            <p className={valueClass}>
              {goal}
            </p>
          </div>

          {/* OBJECTIVES */}

          <div className="min-w-0">
            <p className="text-white/40">
              Training Objectives
            </p>

            <p className={valueClass}>
              {objectives}
            </p>
          </div>

          {/* TOPICS */}

          <div className="min-w-0">
            <p className="text-white/40">
              Training Topics
            </p>

            <p className={valueClass}>
              {topics}
            </p>
          </div>

          {/* FORMAT */}

          <div className="min-w-0">
            <p className="text-white/40">
              Training Format
            </p>

            <p className={valueClass}>
              {format}
            </p>
          </div>

          {/* DURATION */}

          <div className="min-w-0">
            <p className="text-white/40">
              Training Duration
            </p>

            <p className={valueClass}>
              {duration}
            </p>
          </div>

          {/* EXPECTED OUTCOME */}

          <div className="min-w-0">
            <p className="text-white/40">
              Expected Outcome
            </p>

            <p className={valueClass}>
              {outcomes}
            </p>
          </div>

          {/* MATERIALS */}

          <div className="min-w-0">
            <p className="text-white/40">
              Training Materials
            </p>

            <p className={valueClass}>
              {materials}
            </p>
          </div>

          {/* START DATE */}

          <div className="min-w-0">
            <p className="text-white/40">
              Preferred Start Date
            </p>

            <p className="break-words text-white">
              {form.training_preferred_start_date ||
                "Not provided"}
            </p>
          </div>

          {/* COMPLETION DATE */}

          <div className="min-w-0">
            <p className="text-white/40">
              Preferred Completion Date
            </p>

            <p className="break-words text-white">
              {form.training_preferred_completion_date ||
                "Not provided"}
            </p>
          </div>

          {/* TIMELINE */}

          <div className="min-w-0">
            <p className="text-white/40">
              Timeline Flexible
            </p>

            <p className="break-words text-white">
              {form.training_timeline_flexible
                ? "Yes"
                : "No"}
            </p>
          </div>

          {/* ADDITIONAL REQUIREMENTS */}

          <div className="min-w-0">
            <p className="text-white/40">
              Additional Requirements
            </p>

            <p className={valueClass}>
              {additionalRequirements}
            </p>
          </div>

          {/* COUNTRY */}

          <div className="min-w-0">
            <p className="text-white/40">
              Client Country
            </p>

            <p className={valueClass}>
              {isCustom(form.client_country)
                ? form.custom_country?.trim() ||
                  "Custom country not provided"
                : form.client_country?.trim() ||
                  "Not provided"}
            </p>
          </div>

          {/* CURRENCY */}

          <div className="min-w-0">
            <p className="text-white/40">
              Preferred Currency
            </p>

            <p className="break-words text-white">
              {form.preferred_currency?.trim() ||
                "Not selected"}
            </p>
          </div>

          {/* CONTACT */}

          <div className="min-w-0">
            <p className="text-white/40">
              Contact
            </p>

            <p className={valueClass}>
              {contact}
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          AUTHORIZATION
      ====================================================== */}

      <label
        className="
          flex
          min-w-0
          cursor-pointer
          items-start
          gap-3
          rounded-md
          border
          border-[#143b28]
          p-4
        "
      >
        <input
          type="checkbox"
          checked={form.authorization_confirmed}
          onChange={(e) =>
            set({
              authorization_confirmed:
                e.target.checked,
            })
          }
          className="
            mt-1
            h-4
            w-4
            shrink-0
            accent-[#20dc73]
          "
        />

        <span
          className="
            min-w-0
            break-words
            [overflow-wrap:anywhere]
            text-sm
            leading-6
            text-white/70
          "
        >
          I confirm that the information provided is accurate
          and I authorize ShadowNode Intelligence Bureau to
          review this cybersecurity training request.
        </span>
      </label>
    </div>
  )
}