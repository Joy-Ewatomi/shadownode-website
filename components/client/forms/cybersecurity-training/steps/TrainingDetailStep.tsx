"use client"

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
   COMPONENT
============================================================ */

export default function TrainingDetailStep({
  form,
  set,
}: Props) {
  return (
    <div className="space-y-10">

      {/* =====================================================
          INTRODUCTION
      ===================================================== */}

      <p className="text-sm text-white/60">
        Tell us about your cybersecurity training
        requirements.
      </p>

      {/* =====================================================
          ORGANIZATION
      ===================================================== */}

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

        onOrganizationNameChange={(value) =>
          set({
            training_organization_name: value,
          })
        }

        onParticipantCountChange={(value) =>
          set({
            training_participant_count: value,
          })
        }

        onClientTypeChange={(value) =>
          set({
            training_client_type: value,
          })
        }

        onSkillLevelChange={(value) =>
          set({
            training_skill_level: value,
          })
        }
      />

      {/* =====================================================
          AUDIENCE
      ===================================================== */}

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
            training_audience: value,
          })
        }

        onCustomAudienceChange={(value) =>
          set({
            custom_training_audience:
              value,
          })
        }

        onIndustryChange={(value) =>
          set({
            training_industry: value,
          })
        }

        onCustomIndustryChange={(value) =>
          set({
            custom_industry: value,
          })
        }
      />

      {/* =====================================================
          TRAINING GOAL
      ===================================================== */}

      <div>
        <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-white/50">
          Training Goal
        </label>

        <p className="mb-3 text-sm text-white/50">
          Describe the main goal you want this
          cybersecurity training to achieve.
        </p>

        <textarea
          value={form.training_goal}
          onChange={(e) =>
            set({
              training_goal:
                e.target.value,
            })
          }
          rows={5}
          placeholder="Example: Train our staff to identify phishing attacks, improve incident response awareness, and strengthen day-to-day cybersecurity practices."
          className="
            w-full rounded-md
            border border-[#143b28]
            bg-black
            p-4
            text-white
            placeholder:text-white/30
            focus:border-[#20dc73]
            focus:outline-none
          "
        />
      </div>

      {/* =====================================================
          OBJECTIVES
      ===================================================== */}

      <ObjectivesSection
        objectives={
          form.training_objectives
        }

        customObjective={
          form.custom_training_objective
        }

        onChange={(value) =>
          set({
            training_objectives: value,
          })
        }

        onCustomChange={(value) =>
          set({
            custom_training_objective:
              value,
          })
        }
      />

      {/* =====================================================
          TRAINING TOPICS
      ===================================================== */}

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

      {/* =====================================================
          TIMELINE / DURATION
      ===================================================== */}

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

        /* =================================================
           CUSTOM DURATION VALUES
        ================================================= */

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

        /* =================================================
           DURATION
        ================================================= */

        onDurationChange={(value) =>
          set({
            training_duration: value,
          })
        }

        /* =================================================
           EXPECTED OUTCOME
        ================================================= */

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

        /* =================================================
           CUSTOM SCHEDULE
        ================================================= */

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

        /* =================================================
           DATES
        ================================================= */

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

        /* =================================================
           FLEXIBLE TIMELINE
        ================================================= */

        onFlexibleChange={(value) =>
          set({
            training_timeline_flexible:
              value,
          })
        }
      />

      {/* =====================================================
          TRAINING FORMAT
      ===================================================== */}

      <div>
        <label className="mb-3 block text-xs uppercase tracking-[0.12em] text-white/50">
          Training Format
        </label>

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

      {/* =====================================================
          TRAINING MATERIALS
      ===================================================== */}

      <div>
        <label className="mb-3 block text-xs uppercase tracking-[0.12em] text-white/50">
          Training Materials
        </label>

        <p className="mb-3 text-sm text-white/50">
          Select the materials or resources
          you would like included.
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

      {/* =====================================================
          ADDITIONAL REQUIREMENTS
      ===================================================== */}

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

    </div>
  )
}