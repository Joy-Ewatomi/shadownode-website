"use client"

import {
  useState,
} from "react"

import {
  ChevronDown,
  ChevronUp,
  FileText,
  Layers3,
  Target,
  Users,
  CalendarDays,
  Monitor,
  BookOpen,
  MessageSquareText,
} from "lucide-react"

import OrganizationSection from "../sections/OrganizationSection"
import AudienceSection from "../sections/AudienceSection"
import ObjectivesSection from "../sections/ObjectiveSection"
import TopicsSection from "../sections/TopicsSection"
import TimelineSection from "../sections/TimelineSection"
import AdditionalRequirementsSection from "../sections/AdditionalRequirementSection"

import {
  TRAINING_FORMATS,
  TRAINING_MATERIALS,
} from "../constants"

import { toggleArray } from "../helpers"
import OptionButton from "../OptionButton"

import type {
  CybersecurityTrainingFormData,
} from "../../CybersecurityTrainingForm"

/* ============================================================
   TYPES
============================================================ */

type Props = {
  form: CybersecurityTrainingFormData

  set: (
    patch: Partial<CybersecurityTrainingFormData>,
  ) => void
}

/* ============================================================
   SECTION TYPES
============================================================ */

type SectionId =
  | "organization"
  | "audience"
  | "objectives"
  | "topics"
  | "schedule"
  | "format"
  | "materials"
  | "requirements"

type SectionConfig = {
  id: SectionId
  number: string
  title: string
  description: string
  icon: typeof Users
}

/* ============================================================
   SECTIONS
============================================================ */

const SECTIONS: SectionConfig[] = [
  {
    id: "organization",
    number: "01",
    title: "Organization & Participants",
    description:
      "Who is receiving the training and their current skill level.",
    icon: Users,
  },
  {
    id: "audience",
    number: "02",
    title: "Audience & Industry",
    description:
      "Define the intended audience and professional environment.",
    icon: Target,
  },
  {
    id: "objectives",
    number: "03",
    title: "Training Objectives",
    description:
      "Choose what participants should learn and achieve.",
    icon: Layers3,
  },
  {
    id: "topics",
    number: "04",
    title: "Training Topics",
    description:
      "Select the cybersecurity subjects that should be covered.",
    icon: BookOpen,
  },
  {
    id: "schedule",
    number: "05",
    title: "Schedule & Expected Outcome",
    description:
      "Define the preferred training period and expected results.",
    icon: CalendarDays,
  },
  {
    id: "format",
    number: "06",
    title: "Training Format",
    description:
      "Choose how the training should be delivered.",
    icon: Monitor,
  },
  {
    id: "materials",
    number: "07",
    title: "Training Materials",
    description:
      "Select resources you would like included.",
    icon: FileText,
  },
  {
    id: "requirements",
    number: "08",
    title: "Additional Requirements",
    description:
      "Add anything else the training team should know.",
    icon: MessageSquareText,
  },
]

/* ============================================================
   COMPONENT
============================================================ */

export default function TrainingDetailStep({
  form,
  set,
}: Props) {
  const [openSection, setOpenSection] =
    useState<SectionId>("organization")

  function toggleSection(
    section: SectionId,
  ) {
    setOpenSection((current) =>
      current === section
        ? section
        : section,
    )
  }

  /* ==========================================================
     COMPLETION HELPERS
  ========================================================== */

  function isSectionComplete(
    section: SectionId,
  ) {
    switch (section) {
      case "organization":
        return Boolean(
          form.training_organization_name ||
            form.training_participant_count,
        )

      case "audience":
        return Boolean(
          form.training_audience ||
            form.custom_training_audience,
        )

      case "objectives":
        return (
          form.training_objectives.length >
          0
        )

      case "topics":
        return (
          form.training_topics_selected.length >
          0
        )

      case "schedule":
        return Boolean(
          form.training_preferred_start_date &&
            form.training_preferred_completion_date &&
            form.training_expected_outcome
              .length > 0,
        )

      case "format":
        return Boolean(
          form.training_format,
        )

      case "materials":
        return (
          form.training_materials.length >
          0
        )

      case "requirements":
        return Boolean(
          form.training_additional_requirements.trim(),
        )

      default:
        return false
    }
  }

  function getSectionSummary(
    section: SectionId,
  ) {
    switch (section) {
      case "organization":
        if (
          form.training_organization_name
        ) {
          return form.training_organization_name
        }

        if (
          form.training_participant_count
        ) {
          return `${form.training_participant_count} participant(s)`
        }

        return "Not yet provided"

      case "audience":
        return (
          form.training_audience ||
          form.custom_training_audience ||
          "Not yet provided"
        )

      case "objectives":
        return form.training_objectives
          .length > 0
          ? `${form.training_objectives.length} objective(s) selected`
          : "Select at least one objective"

      case "topics":
        return form.training_topics_selected
          .length > 0
          ? `${form.training_topics_selected.length} topic(s) selected`
          : "Select training topics"

      case "schedule":
        if (
          form.training_preferred_start_date &&
          form.training_preferred_completion_date
        ) {
          return `${form.training_preferred_start_date} → ${form.training_preferred_completion_date}`
        }

        return "Set training dates"

      case "format":
        return (
          form.training_format ||
          "Choose a delivery format"
        )

      case "materials":
        return form.training_materials
          .length > 0
          ? `${form.training_materials.length} material type(s) selected`
          : "No materials selected"

      case "requirements":
        return form.training_additional_requirements.trim()
          ? "Additional requirements added"
          : "Optional"

      default:
        return ""
    }
  }

  /* ============================================================
     RENDER SECTION HEADER
  ============================================================ */

  function SectionHeader({
    section,
  }: {
    section: SectionConfig
  }) {
    const Icon = section.icon
    const isOpen =
      openSection === section.id
    const complete =
      isSectionComplete(section.id)

    return (
      <button
        type="button"
        onClick={() =>
          toggleSection(section.id)
        }
        className={`flex w-full items-center gap-4 px-4 py-4 text-left transition sm:px-5 ${
          isOpen
            ? "bg-[#20dc73]/[0.035]"
            : "hover:bg-white/[0.02]"
        }`}
      >
        {/* Number */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border font-mono text-[10px] font-semibold ${
            isOpen
              ? "border-[#20dc73]/40 bg-[#20dc73]/10 text-[#20dc73]"
              : complete
                ? "border-[#20dc73]/25 bg-[#20dc73]/5 text-[#20dc73]"
                : "border-[#143b28] bg-black/20 text-white/30"
          }`}
        >
          {section.number}
        </div>

        {/* Icon */}
        <div
          className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:flex ${
            isOpen
              ? "text-[#20dc73]"
              : complete
                ? "text-[#20dc73]/70"
                : "text-white/30"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`text-sm font-semibold ${
                isOpen
                  ? "text-white"
                  : "text-white/75"
              }`}
            >
              {section.title}
            </p>

            {complete ? (
              <span className="rounded-full border border-[#20dc73]/20 bg-[#20dc73]/5 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-[#20dc73]">
                Provided
              </span>
            ) : null}
          </div>

          <p className="mt-0.5 truncate text-[11px] text-white/30">
            {getSectionSummary(
              section.id,
            )}
          </p>
        </div>

        {/* Arrow */}
        <div className="shrink-0 text-white/25">
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>
    )
  }

  /* ============================================================
     SECTION CONTENT
  ============================================================ */

  function renderSectionContent(
    section: SectionId,
  ) {
    switch (section) {
      /* --------------------------------------------------------
         ORGANIZATION
      -------------------------------------------------------- */

      case "organization":
        return (
          <div className="space-y-6">
            <OrganizationSection
              organizationName={
                form.training_organization_name
              }
              participantCount={
                form.training_participant_count
              }
              clientType={
                form.training_client_type
              }
              skillLevel={
                form.training_skill_level
              }
              onOrganizationNameChange={(
                value,
              ) =>
                set({
                  training_organization_name:
                    value,
                })
              }
              onParticipantCountChange={(
                value,
              ) =>
                set({
                  training_participant_count:
                    value,
                })
              }
              onClientTypeChange={(value) =>
                set({
                  training_client_type:
                    value,
                })
              }
              onSkillLevelChange={(value) =>
                set({
                  training_skill_level:
                    value,
                })
              }
            />
          </div>
        )

      /* --------------------------------------------------------
         AUDIENCE
      -------------------------------------------------------- */

      case "audience":
        return (
          <div className="space-y-6">
            <AudienceSection
              audience={
                form.training_audience
              }
              customAudience={
                form.custom_training_audience
              }
              industry={
                form.training_industry
              }
              customIndustry={
                form.custom_industry
              }
              onAudienceChange={(value) =>
                set({
                  training_audience:
                    value,
                })
              }
              onCustomAudienceChange={(
                value,
              ) =>
                set({
                  custom_training_audience:
                    value,
                })
              }
              onIndustryChange={(value) =>
                set({
                  training_industry:
                    value,
                })
              }
              onCustomIndustryChange={(
                value,
              ) =>
                set({
                  custom_industry:
                    value,
                })
              }
            />

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
                Training Goal
              </label>

              <p className="mb-3 text-sm text-white/45">
                Describe the main goal you want this cybersecurity training to achieve.
              </p>

              <textarea
                value={
                  form.training_goal
                }
                onChange={(event) =>
                  set({
                    training_goal:
                      event.target.value,
                  })
                }
                rows={4}
                placeholder="Example: Improve phishing awareness, strengthen incident response readiness, and help staff apply secure day-to-day practices."
                className="w-full rounded-xl border border-[#143b28] bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition focus:border-[#20dc73]/50"
              />
            </div>
          </div>
        )

      /* --------------------------------------------------------
         OBJECTIVES
      -------------------------------------------------------- */

      case "objectives":
        return (
          <ObjectivesSection
            objectives={
              form.training_objectives
            }
            customObjective={
              form.custom_training_objective
            }
            onChange={(value) =>
              set({
                training_objectives:
                  value,
              })
            }
            onCustomChange={(value) =>
              set({
                custom_training_objective:
                  value,
              })
            }
          />
        )

      /* --------------------------------------------------------
         TOPICS
      -------------------------------------------------------- */

      case "topics":
        return (
          <TopicsSection
            topics={
              form.training_topics_selected
            }
            customTopic={
              form.training_custom_topic
            }
            onTopicsChange={(value) =>
              set({
                training_topics_selected:
                  value,
              })
            }
            onCustomTopicChange={(value) =>
              set({
                training_custom_topic:
                  value,
              })
            }
          />
        )

      /* --------------------------------------------------------
         SCHEDULE
      -------------------------------------------------------- */

      case "schedule":
        return (
          <TimelineSection
            duration={
              form.training_duration
            }
            expectedOutcome={
              form.training_expected_outcome
            }
            customExpectedOutcome={
              form.custom_expected_outcome
            }
            startDate={
              form.training_preferred_start_date
            }
            completionDate={
              form.training_preferred_completion_date
            }
            timelineFlexible={
              form.training_timeline_flexible
            }
            customSessionsPerWeek={
              form.custom_sessions_per_week
            }
            customHoursPerSession={
              form.custom_hours_per_session
            }
            customTrainingDays={
              form.custom_training_days
            }
            customSessionTime={
              form.custom_session_time
            }
            customTrainingPeriod={
              form.custom_training_period
            }
            onDurationChange={(value) =>
              set({
                training_duration:
                  value,
              })
            }
            onOutcomeChange={(value) =>
              set({
                training_expected_outcome:
                  value,
              })
            }
            onCustomExpectedOutcomeChange={(
              value,
            ) =>
              set({
                custom_expected_outcome:
                  value,
              })
            }
            onCustomSessionsPerWeekChange={(
              value,
            ) =>
              set({
                custom_sessions_per_week:
                  value,
              })
            }
            onCustomHoursPerSessionChange={(
              value,
            ) =>
              set({
                custom_hours_per_session:
                  value,
              })
            }
            onCustomTrainingDaysChange={(
              value,
            ) =>
              set({
                custom_training_days:
                  value,
              })
            }
            onCustomSessionTimeChange={(
              value,
            ) =>
              set({
                custom_session_time:
                  value,
              })
            }
            onCustomTrainingPeriodChange={(
              value,
            ) =>
              set({
                custom_training_period:
                  value,
              })
            }
            onStartDateChange={(value) =>
              set({
                training_preferred_start_date:
                  value,
              })
            }
            onCompletionDateChange={(value) =>
              set({
                training_preferred_completion_date:
                  value,
              })
            }
            onFlexibleChange={(value) =>
              set({
                training_timeline_flexible:
                  value,
              })
            }
          />
        )

      /* --------------------------------------------------------
         FORMAT
      -------------------------------------------------------- */

      case "format":
        return (
          <div>
            <p className="mb-4 text-sm text-white/45">
              Choose the delivery format that best fits your participants and operational environment.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {TRAINING_FORMATS.map(
                (format) => (
                  <OptionButton
                    key={format}
                    label={format}
                    active={
                      form.training_format ===
                      format
                    }
                    onClick={() =>
                      set({
                        training_format:
                          format,
                      })
                    }
                  />
                ),
              )}
            </div>
          </div>
        )

      /* --------------------------------------------------------
         MATERIALS
      -------------------------------------------------------- */

      case "materials":
        return (
          <div>
            <p className="mb-4 text-sm text-white/45">
              Select the resources you would like included with the training.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TRAINING_MATERIALS.map(
                (material) => (
                  <OptionButton
                    key={material}
                    label={material}
                    active={form.training_materials.includes(
                      material,
                    )}
                    onClick={() =>
                      set({
                        training_materials:
                          toggleArray(
                            form.training_materials,
                            material,
                          ),
                      })
                    }
                  />
                ),
              )}
            </div>
          </div>
        )

      /* --------------------------------------------------------
         REQUIREMENTS
      -------------------------------------------------------- */

      case "requirements":
        return (
          <AdditionalRequirementsSection
            value={
              form.training_additional_requirements
            }
            onChange={(value) =>
              set({
                training_additional_requirements:
                  value,
              })
            }
          />
        )

      default:
        return null
    }
  }

  /* ============================================================
     COMPLETION COUNT
  ============================================================ */

  const completedCount =
    SECTIONS.filter((section) =>
      isSectionComplete(section.id),
    ).length

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="space-y-5">
      {/* ======================================================
          INTRO
      ====================================================== */}

      <div className="rounded-2xl border border-[#143b28] bg-black/20 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/65">
              Training Configuration
            </p>

            <p className="mt-1 text-sm leading-6 text-white/35">
              Complete the sections below. Open only the section you are working on.
            </p>
          </div>

          <div className="shrink-0 rounded-xl border border-[#143b28] bg-[#06110f] px-4 py-3">
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/25">
              Details Completed
            </p>

            <p className="mt-1 font-mono text-sm text-[#20dc73]">
              {completedCount} /{" "}
              {SECTIONS.length}
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================
          QUICK SECTION GRID
      ====================================================== */}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {SECTIONS.map(
          (section) => {
            const Icon = section.icon
            const complete =
              isSectionComplete(
                section.id,
              )
            const active =
              openSection ===
              section.id

            return (
              <button
                key={section.id}
                type="button"
                onClick={() =>
                  setOpenSection(
                    section.id,
                  )
                }
                className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  active
                    ? "border-[#20dc73]/35 bg-[#20dc73]/8"
                    : "border-[#143b28] bg-[#06110f] hover:border-white/15"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    complete
                      ? "bg-[#20dc73]/10 text-[#20dc73]"
                      : active
                        ? "bg-[#20dc73]/10 text-[#20dc73]"
                        : "bg-black/30 text-white/25"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-[11px] font-semibold ${
                      active
                        ? "text-white"
                        : "text-white/60"
                    }`}
                  >
                    {section.title}
                  </p>

                  <p className="mt-0.5 text-[9px] text-white/25">
                    {complete
                      ? "Complete"
                      : "Open section"}
                  </p>
                </div>
              </button>
            )
          },
        )}
      </div>

      {/* ======================================================
          ACCORDION
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-[#143b28] bg-[#06110f]">
        {SECTIONS.map(
          (section, index) => {
            const isOpen =
              openSection ===
              section.id

            return (
              <div
                key={section.id}
                className={
                  index !==
                  SECTIONS.length - 1
                    ? "border-b border-[#143b28]"
                    : ""
                }
              >
                <SectionHeader
                  section={
                    section
                  }
                />

                {isOpen ? (
                  <div className="border-t border-[#143b28]/70 bg-black/10 px-4 py-5 sm:px-5 sm:py-6">
                    {renderSectionContent(
                      section.id,
                    )}
                  </div>
                ) : null}
              </div>
            )
          },
        )}
      </div>
    </div>
  )
}