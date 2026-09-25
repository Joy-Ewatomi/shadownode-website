export type CybersecurityService = {
  id: string
  title: string
  description: string
}

export type CybersecurityTrainingFormData = {
  category: string

  // Step 1
  service_type: string

  // Step 2
  training_organization_name: string
  training_client_type: string
  training_participant_count: string
  training_skill_level: string

  training_audience: string
  training_industry: string

  training_goal: string

  training_topics_selected: string[]
  training_objectives: string[]

  training_custom_topic: string

  training_format: string
  training_duration: string

  training_materials: string[]
  training_compliance: string[]

  training_certificate: string

  training_expected_outcome: string

  training_assessment_required: boolean
  training_labs_required: boolean

  training_preferred_start_date: string
  training_preferred_completion_date: string

  training_timeline_flexible: boolean

  training_additional_requirements: string

  // Step 3
  client_country: string
  preferred_currency: string

  communication_method: string

  communication_email: string

  communication_country_code: string
  communication_phone: string
  communication_whatsapp: string
  whatsapp_consent: boolean

  communication_signal: string

  // Step 4
  authorization_confirmed: boolean
}