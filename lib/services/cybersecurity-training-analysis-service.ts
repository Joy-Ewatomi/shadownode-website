// lib/services/cybersecurity-training-analysis-service.ts

import { estimatePrice } from "@/lib/pricing"

// ============================================================
// TYPES
// ============================================================

export type CybersecurityTrainingAnalysisInput = {
  serviceType: string
  description: string

  organizationName?: string | null
  clientType?: string | null

  participantCount?: number | null
  skillLevel?: string | null

  audience?: string | null
  industry?: string | null

  goal?: string | null
  objective?: string | null
  objectives?: string[] | string | null

  topics?: string[] | string | null
  customTopic?: string | null

  format?: string | null
  duration?: string | null

  sessionsPerWeek?: string | number | null
  hoursPerSession?: string | number | null
  trainingDays?: string[] | string | null
  sessionTime?: string | null
  trainingPeriod?: string | null

  materials?: string[] | string | null
  compliance?: string[] | string | null

  certificate?: string | null
  expectedOutcomes?: string[] | string | null
  customExpectedOutcome?: string | null

  assessmentRequired?: boolean
  labsRequired?: boolean

  startDate?: string | null
  completionDate?: string | null
  timelineFlexible?: boolean
   
  timeline?: string | null
  urgency?: string | null

  confidentialityLevel?: string | null
  country?: string | null
  currency?: string | null
}

// ============================================================
// OUTPUT
// ============================================================

export type CybersecurityTrainingAnalysis = {
  complexity: string
  estimatedHours: number

  suggestedService: string
  suggestedPriority: string

  suggestedPrice: number
  currency: string

  confidence: number

  reasoning: string

  factors: {
    participantCount: number
    skillLevel: string
    topicCount: number
    labsRequired: boolean
    assessmentRequired: boolean
    format: string
    duration: string
    urgency: string
    confidentialityLevel: string
  }
}

// ============================================================
// CONSTANTS
// ============================================================

const SERVICE_TYPES = new Set([
  "cybersecurity",
  "cybersecurity-training",
  "training",
  "cybersecurity_training",
])

const SKILL_LEVELS = new Set([
  "beginner",
  "intermediate",
  "advanced",
  "mixed",
  "expert",
])

const TRAINING_FORMATS = new Set([
  "online",
  "onsite",
  "hybrid",
  "in_person",
  "virtual",
])

const URGENCY_LEVELS = new Set([
  "critical",
  "high",
  "normal",
  "low",
])

// ============================================================
// HELPERS
// ============================================================

function clean(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : ""
}

function numberValue(
  value: unknown,
  fallback = 0,
): number {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback
  }

  const parsed = Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : fallback
}

function normalizeArray(
  value: unknown,
): string[] {
  if (Array.isArray(value)) {
    return value
      .filter(
        (item): item is string =>
          typeof item === "string",
      )
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function normalizeService(
  serviceType: string,
): string {
  const normalized =
    clean(serviceType).toLowerCase()

  if (SERVICE_TYPES.has(normalized)) {
    return "cybersecurity-training"
  }

  return "cybersecurity-training"
}


function normalizeList(
  value: string[] | string | null | undefined,
): string[] {
  if (Array.isArray(value)) {
    return value
      .filter(
        (item): item is string =>
          typeof item === "string" &&
          item.trim().length > 0,
      )
      .map((item) => item.trim())
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function normalizeSkillLevel(
  value: unknown,
): string {
  const normalized =
    clean(value).toLowerCase()

  return SKILL_LEVELS.has(normalized)
    ? normalized
    : "beginner"
}

function normalizeFormat(
  value: unknown,
): string {
  const normalized =
    clean(value).toLowerCase()

  return TRAINING_FORMATS.has(normalized)
    ? normalized
    : "online"
}

function normalizeUrgency(
  urgency: unknown,
  timeline: unknown,
): string {
  const normalizedUrgency =
    clean(urgency).toLowerCase()

  if (
    URGENCY_LEVELS.has(
      normalizedUrgency,
    )
  ) {
    return normalizedUrgency
  }

  const normalizedTimeline =
    clean(timeline).toLowerCase()

  if (normalizedTimeline === "urgent") {
    return "high"
  }

  return "normal"
}

function buildDescription(
  input: CybersecurityTrainingAnalysisInput,
): string {
  const parts: string[] = []

  const description =
    clean(input.description)

  if (description) {
    parts.push(description)
  }

  const goal =
    clean(input.goal)

  if (goal) {
    parts.push(
      `Training goal: ${goal}`,
    )
  }

 const objectives = normalizeList(
  input.objectives,
)

  if (objectives) {
    parts.push(
      `Training objective: ${objectives}`,
    )
  }
const topics = normalizeList(
  input.topics,
)

  if (topics.length > 0) {
    parts.push(
      `Topics: ${topics.join(", ")}`,
    )
  }

  const audience =
    clean(input.audience)

  if (audience) {
    parts.push(
      `Audience: ${audience}`,
    )
  }

  const industry =
    clean(input.industry)

  if (industry) {
    parts.push(
      `Industry: ${industry}`,
    )
  }

  return parts.join("\n")
}

// ============================================================
// MAIN ANALYSIS
// ============================================================

export function analyzeCybersecurityTrainingRequest(
  input: CybersecurityTrainingAnalysisInput,
): CybersecurityTrainingAnalysis {
  const description =
    buildDescription(input)

  const normalizedService =
    normalizeService(
      input.serviceType,
    )

  const participantCount = Math.max(
    0,
    Math.round(
      numberValue(
        input.participantCount,
        1,
      ),
    ),
  )

  const skillLevel =
    normalizeSkillLevel(
      input.skillLevel,
    )

  const format =
    normalizeFormat(input.format)

  const urgency =
    normalizeUrgency(
      input.urgency,
      input.timeline,
    )

  const topics =
    normalizeArray(input.topics)

  const materials =
    normalizeArray(input.materials)

  const compliance =
    normalizeArray(input.compliance)

  const expectedOutcomes =
    normalizeArray(
      input.expectedOutcomes,
    )

  const labsRequired =
    input.labsRequired === true

  const assessmentRequired =
    input.assessmentRequired === true

  const duration =
    clean(input.duration) ||
    "standard"

  const confidentialityLevel =
    clean(
      input.confidentialityLevel,
    ) || "standard"

  const currency =
    clean(input.currency) || "USD"

  // ==========================================================
  // COMPLEXITY FACTORS
  // ==========================================================

  let complexityScore = 1

  // Participant count
  if (participantCount >= 50) {
    complexityScore += 0.45
  } else if (participantCount >= 25) {
    complexityScore += 0.30
  } else if (participantCount >= 10) {
    complexityScore += 0.15
  }

  // Skill level
  if (skillLevel === "advanced") {
    complexityScore += 0.30
  } else if (skillLevel === "expert") {
    complexityScore += 0.40
  } else if (skillLevel === "mixed") {
    complexityScore += 0.25
  } else if (skillLevel === "intermediate") {
    complexityScore += 0.15
  }

  // Number of topics
  if (topics.length >= 8) {
    complexityScore += 0.40
  } else if (topics.length >= 5) {
    complexityScore += 0.30
  } else if (topics.length >= 3) {
    complexityScore += 0.15
  }

  // Practical labs
  if (labsRequired) {
    complexityScore += 0.35
  }

  // Assessment
  if (assessmentRequired) {
    complexityScore += 0.15
  }

  // Format
  if (format === "onsite" ||
      format === "in_person") {
    complexityScore += 0.15
  }

  if (format === "hybrid") {
    complexityScore += 0.25
  }

  // Compliance
  if (compliance.length > 0) {
    complexityScore += 0.15
  }

  // Materials
  if (materials.length >= 4) {
    complexityScore += 0.15
  }

  // Expected outcomes
  if (expectedOutcomes.length >= 3) {
    complexityScore += 0.10
  }

  // Confidentiality
  if (
    confidentialityLevel ===
    "confidential"
  ) {
    complexityScore += 0.15
  }

  if (
    confidentialityLevel ===
    "high"
  ) {
    complexityScore += 0.25
  }

  // ==========================================================
  // COMPLEXITY CLASSIFICATION
  // ==========================================================

  const complexity =
    complexityScore >= 2.5
      ? "high"
      : complexityScore >= 1.6
        ? "medium"
        : "low"

  // ==========================================================
  // HOURS
  // ==========================================================

  let estimatedHours =
    complexity === "high"
      ? 24
      : complexity === "medium"
        ? 12
        : 6

  // Participant scaling
  if (participantCount >= 50) {
    estimatedHours += 8
  } else if (participantCount >= 25) {
    estimatedHours += 4
  } else if (participantCount >= 10) {
    estimatedHours += 2
  }

  // Labs require preparation and
  // technical environment setup.
  if (labsRequired) {
    estimatedHours += 6
  }

  if (assessmentRequired) {
    estimatedHours += 3
  }

  if (materials.length >= 4) {
    estimatedHours += 3
  }

  if (format === "hybrid") {
    estimatedHours += 2
  }

  if (
    duration === "long-term" ||
    duration === "extended"
  ) {
    estimatedHours += 8
  }

  estimatedHours = Math.max(
    4,
    Math.round(estimatedHours),
  )

  // ==========================================================
  // PRIORITY
  // ==========================================================

  let suggestedPriority =
    "normal"

  if (urgency === "critical") {
    suggestedPriority =
      "critical"
  } else if (
    urgency === "high"
  ) {
    suggestedPriority =
      "high"
  } else if (
    complexity === "high"
  ) {
    suggestedPriority =
      "high"
  }

  // ==========================================================
  // PRICING
  // ==========================================================

  const estimate =
    estimatePrice({
     serviceType:
  "cybersecurity-training",

      description,

      timeline:
        urgency === "critical" ||
        urgency === "high"
          ? "urgent"
          : "standard",

      investigationDepth:
        complexity === "high"
          ? "deep"
          : complexity === "medium"
            ? "standard"
            : "light",

      confidentialityLevel,

      subjectType:
        "organization",
    })

  let suggestedPrice =
    Number(
      estimate.estimatedPrice,
    )

  if (
    !Number.isFinite(
      suggestedPrice,
    )
  ) {
    suggestedPrice = 0
  }

  // Training-specific scaling.
  //
  // estimatePrice() gives the base service estimate.
  // The following adjustments account for the
  // actual training delivery requirements.

  if (participantCount >= 50) {
    suggestedPrice *= 1.35
  } else if (participantCount >= 25) {
    suggestedPrice *= 1.20
  } else if (participantCount >= 10) {
    suggestedPrice *= 1.10
  }

  if (labsRequired) {
    suggestedPrice *= 1.20
  }

  if (assessmentRequired) {
    suggestedPrice *= 1.10
  }

  if (format === "onsite" ||
      format === "in_person") {
    suggestedPrice *= 1.15
  }

  if (format === "hybrid") {
    suggestedPrice *= 1.20
  }

  if (skillLevel === "advanced") {
    suggestedPrice *= 1.15
  }

  if (skillLevel === "expert") {
    suggestedPrice *= 1.25
  }

  if (compliance.length > 0) {
    suggestedPrice *= 1.10
  }

  if (
    urgency === "critical"
  ) {
    suggestedPrice *= 1.35
  } else if (
    urgency === "high"
  ) {
    suggestedPrice *= 1.20
  }

  suggestedPrice =
    Math.round(
      suggestedPrice,
    )

  // ==========================================================
  // CONFIDENCE
  // ==========================================================

  let confidence = 0.55

  if (
    description.length >= 100
  ) {
    confidence += 0.05
  }

  if (
    participantCount > 0
  ) {
    confidence += 0.05
  }

  if (skillLevel) {
    confidence += 0.05
  }

  if (topics.length > 0) {
    confidence += 0.05
  }

  if (format) {
    confidence += 0.05
  }

  if (duration) {
    confidence += 0.05
  }

  if (
    input.goal ||
    input.objective
  ) {
    confidence += 0.05
  }

  confidence = Math.min(
    0.90,
    Number(
      confidence.toFixed(2),
    ),
  )

  // ==========================================================
  // REASONING
  // ==========================================================

  const reasoningParts = [
    `Cybersecurity training estimate based on ${participantCount || "unspecified"} participant(s).`,

    `Skill level: ${skillLevel}.`,

    `Training format: ${format}.`,

    `Training duration: ${duration}.`,

    `The request contains ${topics.length} selected topic(s).`,

    labsRequired
      ? "Practical cybersecurity labs are required."
      : "Practical cybersecurity labs are not required.",

    assessmentRequired
      ? "Assessment is required."
      : "Assessment is not required.",

    compliance.length > 0
      ? `Compliance requirements include ${compliance.join(", ")}.`
      : "No specific compliance requirements were provided.",

    `Internal complexity score: ${complexityScore.toFixed(2)}.`,

    `Classified complexity: ${complexity}.`,

    `Estimated working time: ${estimatedHours} hours.`,

    `Recommended priority: ${suggestedPriority}.`,

    `Recommended internal estimate: ${currency} ${suggestedPrice.toLocaleString()}.`,
  ]

  return {
    complexity,

    estimatedHours,

    suggestedService:
      normalizedService,

    suggestedPriority,

    suggestedPrice,

    currency,

    confidence,

    reasoning:
      reasoningParts.join(" "),

    factors: {
      participantCount,

      skillLevel,

      topicCount:
        topics.length,

      labsRequired,

      assessmentRequired,

      format,

      duration,

      urgency,

      confidentialityLevel,
    },
  }
}

// ============================================================
// ALIAS
//
// Allows the route to use either naming convention.
// ============================================================

export const analyzeTrainingRequest =
  analyzeCybersecurityTrainingRequest

export default analyzeCybersecurityTrainingRequest