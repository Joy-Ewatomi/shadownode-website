"use client"

import OrganizationSection from "../sections/OrganizationSection"
import AudienceSection from "../sections/AudienceSection"
import ObjectivesSection from "../sections/ObjectiveSection"
import TimelineSection from "../sections/TimelineSection"
import AdditionalRequirementsSection from "../sections/AdditionalRequirementSection"

import type { CybersecurityTrainingFormData } from "../../CybersecurityTrainingForm"



type Props = {
  form: CybersecurityTrainingFormData

  set: (
    patch: Partial<CybersecurityTrainingFormData>
  ) => void
}



export default function TrainingDetailStep({
  form,
  set,
}: Props) {


  return (

    <div className="space-y-6">


      <p className="text-sm text-white/60">
        Tell us about your cybersecurity training requirements.
      </p>





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


        onOrganizationNameChange={(value)=>
          set({
            training_organization_name:value,
          })
        }


        onParticipantCountChange={(value)=>
          set({
            training_participant_count:value,
          })
        }


        onClientTypeChange={(value)=>
          set({
            training_client_type:value,
          })
        }


        onSkillLevelChange={(value)=>
          set({
            training_skill_level:value,
          })
        }

      />






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


        onAudienceChange={(value)=>
          set({
            training_audience:value,
          })
        }


        onCustomAudienceChange={(value)=>
          set({
            custom_training_audience:value,
          })
        }


        onIndustryChange={(value)=>
          set({
            training_industry:value,
          })
        }

      />







      <ObjectivesSection

        objectives={
          form.training_objectives
        }


        customObjective={
          form.custom_training_objective
        }


        onChange={(value)=>
          set({
            training_objectives:value,
          })
        }


        onCustomChange={(value)=>
          set({
            custom_training_objective:value,
          })
        }

      />








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



        onDurationChange={(value)=>
          set({
            training_duration:value,
          })
        }



        onOutcomeChange={(value)=>
          set({
            training_expected_outcome:value,
          })
        }



        onCustomExpectedOutcomeChange={(value)=>
          set({
            custom_expected_outcome:value,
          })
        }



        onStartDateChange={(value)=>
          set({
            training_preferred_start_date:value,
          })
        }



        onCompletionDateChange={(value)=>
          set({
            training_preferred_completion_date:value,
          })
        }



        onFlexibleChange={(value)=>
          set({
            training_timeline_flexible:value,
          })
        }

      />






      <AdditionalRequirementsSection

        value={
          form.training_additional_requirements
        }


        onChange={(value)=>
          set({
            training_additional_requirements:value,
          })
        }

      />



    </div>

  )
}