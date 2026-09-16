const TRAINING_SERVICE_TYPES = new Set([
  "custom_training",
  "cybersecurity_training",
  "digital_safety",
])

export type RequestEngagementType = "investigation" | "training"

function normalize(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase()
}

export function classifyRequestEngagement(input: {
  service_type?: string | null
  training_details?: unknown
  training_goal?: string | null
  training_topics?: string | null
  training_participant_count?: number | string | null
}): RequestEngagementType {
  if (
    input.training_details ||
    input.training_goal ||
    input.training_topics ||
    input.training_participant_count
  ) {
    return "training"
  }

  // Legacy fallback until request category/type is normalized in the schema.
  return TRAINING_SERVICE_TYPES.has(normalize(input.service_type))
    ? "training"
    : "investigation"
}

export function isTrainingRequest(input: {
  service_type?: string | null
  training_details?: unknown
  training_goal?: string | null
  training_topics?: string | null
  training_participant_count?: number | string | null
}) {
  return classifyRequestEngagement(input) === "training"
}
