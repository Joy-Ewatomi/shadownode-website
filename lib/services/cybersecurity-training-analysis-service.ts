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

  assignments?: boolean
  chatSupport?: boolean
  careerGuidance?: boolean
  specialization?: string | null

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
  minPrice: number
  maxPrice: number

  currency: string

  confidence: number

  reasoning: string

  factors: {
    participantCount: number
    skillLevel: string
    topicCount: number
    labsRequired: boolean
    assessmentRequired: boolean
    assignments: boolean
    materialsRequired: boolean
    chatSupport: boolean
    certification: boolean
    careerGuidance: boolean
    specialization: boolean
    format: string
    duration: string
    trainingWeeks: number
    sessionsPerWeek: number
    hoursPerSession: number
    trainingHours: number
    urgency: string
    confidentialityLevel: string
  }

  pricing: {
    baseHourlyRate: number
    trainingMultiplier: number
    urgencyMultiplier: number
    estimatedPrice: number
    minPrice: number
    maxPrice: number
    breakdown: {
      baseService: string
      complexity: string
      urgency: string
      depth: string
      confidentiality: string
      subject: string
      training: string
    }
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

// ============================================================

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

// ============================================================

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

// ============================================================

function normalizeService(
  serviceType: string,
): string {
  const normalized =
    clean(serviceType).toLowerCase()

  if (SERVICE_TYPES.has(normalized)) {
    return "cybersecurity-training"
  }

  /**
   * This analysis service is exclusively for
   * cybersecurity training.
   *
   * Unknown service values are therefore still
   * normalized to cybersecurity training rather
   * than allowing another pricing model through.
   */
  return "cybersecurity-training"
}

// ============================================================

function normalizeSkillLevel(
  value: unknown,
): string {
  const normalized =
    clean(value).toLowerCase()

  return SKILL_LEVELS.has(normalized)
    ? normalized
    : "beginner"
}

// ============================================================

function normalizeFormat(
  value: unknown,
): string {
  const normalized =
    clean(value).toLowerCase()

  return TRAINING_FORMATS.has(normalized)
    ? normalized
    : "online"
}

// ============================================================

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

  if (
    normalizedTimeline === "flexible"
  ) {
    return "low"
  }

  return "normal"
}

// ============================================================
// TRAINING DELIVERY NORMALIZATION
// ============================================================
//
// Maps the training form's format values into the
// pricing engine's delivery model.
//
// Pricing engine accepts:
//
//   one_on_one
//   small_group
//   group
//   corporate
//
// The form's "online / onsite / hybrid" describes
// delivery format, not engagement size.
//
// Therefore we infer the engagement model primarily
// from participant count / client type.
//

function normalizeTrainingDelivery(
  participantCount: number,
  clientType?: string | null,
): "one_on_one" | "small_group" | "group" | "corporate" {
  const normalizedClientType =
    clean(clientType).toLowerCase()

  if (
    normalizedClientType.includes(
      "corporate",
    ) ||
    normalizedClientType.includes(
      "company",
    ) ||
    normalizedClientType.includes(
      "organization",
    ) ||
    normalizedClientType.includes(
      "business",
    )
  ) {
    return "corporate"
  }

  if (participantCount <= 1) {
    return "one_on_one"
  }

  if (participantCount <= 8) {
    return "small_group"
  }

  return "group"
}

// ============================================================
// TRAINING WEEKS
// ============================================================
//
// Attempts to extract a numeric week count from
// the structured duration fields.
//
// Examples:
//
//   "13 weeks"      -> 13
//   "12 weeks"      -> 12
//   "long-term"     -> 0
//
// If the form provides customTrainingPeriod,
// the function also attempts to extract a number.
//
// ============================================================

function extractWeeks(
  duration?: string | null,
  trainingPeriod?: string | null,
): number {
  const candidates = [
    clean(duration),
    clean(trainingPeriod),
  ]

  for (const candidate of candidates) {
    if (!candidate) {
      continue
    }

    const weekMatch =
      candidate.match(
        /(\d+(?:\.\d+)?)\s*(?:weeks?|wks?|week)/i,
      )

    if (weekMatch) {
      const weeks = Number(
        weekMatch[1],
      )

      if (
        Number.isFinite(weeks) &&
        weeks > 0
      ) {
        return weeks
      }
    }

    /**
     * If the value is simply numeric,
     * interpret it as weeks.
     */
    const numeric =
      Number(candidate)

    if (
      Number.isFinite(numeric) &&
      numeric > 0
    ) {
      return numeric
    }
  }

  return 0
}

// ============================================================
// TRAINING DAYS
// ============================================================

function countTrainingDays(
  value: string[] | string | null | undefined,
): number {
  return normalizeArray(value).length
}

// ============================================================
// DESCRIPTION BUILDER
// ============================================================

function buildDescription(
  input: CybersecurityTrainingAnalysisInput,
): string {
  const parts: string[] = []

  const description =
    clean(input.description)

  if (description) {
    parts.push(description)
  }

  const organization =
    clean(input.organizationName)

  if (organization) {
    parts.push(
      `Organization: ${organization}`,
    )
  }

  const clientType =
    clean(input.clientType)

  if (clientType) {
    parts.push(
      `Client type: ${clientType}`,
    )
  }

  const goal =
    clean(input.goal)

  if (goal) {
    parts.push(
      `Training goal: ${goal}`,
    )
  }

  const objectives =
    normalizeArray(input.objectives)

  if (objectives.length > 0) {
    parts.push(
      `Training objectives: ${objectives.join(", ")}`,
    )
  }

  const topics =
    normalizeArray(input.topics)

  if (topics.length > 0) {
    parts.push(
      `Training topics: ${topics.join(", ")}`,
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

  const format =
    clean(input.format)

  if (format) {
    parts.push(
      `Training format: ${format}`,
    )
  }

  const duration =
    clean(input.duration)

  if (duration) {
    parts.push(
      `Training duration: ${duration}`,
    )
  }

  const trainingPeriod =
    clean(input.trainingPeriod)

  if (trainingPeriod) {
    parts.push(
      `Training period: ${trainingPeriod}`,
    )
  }

  const materials =
    normalizeArray(input.materials)

  if (materials.length > 0) {
    parts.push(
      `Training materials: ${materials.join(", ")}`,
    )
  }

  const compliance =
    normalizeArray(input.compliance)

  if (compliance.length > 0) {
    parts.push(
      `Compliance requirements: ${compliance.join(", ")}`,
    )
  }

  const expectedOutcomes =
    normalizeArray(
      input.expectedOutcomes,
    )

  if (expectedOutcomes.length > 0) {
    parts.push(
      `Expected outcomes: ${expectedOutcomes.join(", ")}`,
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
  // ==========================================================
  // NORMALIZATION
  // ==========================================================

  const description =
    buildDescription(input)

  const normalizedService =
    normalizeService(
      input.serviceType,
    )

  const participantCount =
    Math.max(
      1,
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
    normalizeFormat(
      input.format,
    )

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

  const objectives =
    normalizeArray(
      input.objectives,
    )

  const trainingDays =
    normalizeArray(
      input.trainingDays,
    )

  const labsRequired =
    input.labsRequired === true

  const assessmentRequired =
    input.assessmentRequired === true

  const assignments =
    input.assignments === true

  const chatSupport =
    input.chatSupport === true

  const careerGuidance =
    input.careerGuidance === true

  const certification =
    clean(input.certificate).length > 0 &&
    clean(
      input.certificate,
    ).toLowerCase() !== "none"

  const specialization =
    clean(
      input.specialization,
    ).length > 0

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
  // STRUCTURED TRAINING HOURS
  // ==========================================================

  const sessionsPerWeek =
    Math.max(
      0,
      numberValue(
        input.sessionsPerWeek,
        0,
      ),
    )

  const hoursPerSession =
    Math.max(
      0,
      numberValue(
        input.hoursPerSession,
        0,
      ),
    )

  const trainingWeeks =
    Math.max(
      0,
      extractWeeks(
        input.duration,
        input.trainingPeriod,
      ),
    )

  /**
   * If the duration field is a known textual
   * duration but doesn't contain an exact week
   * count, we deliberately leave weeks as 0.
   *
   * This prevents us from inventing training hours.
   */

  const trainingHours =
    trainingWeeks > 0 &&
    sessionsPerWeek > 0 &&
    hoursPerSession > 0
      ? Number(
          (
            trainingWeeks *
            sessionsPerWeek *
            hoursPerSession
          ).toFixed(2),
        )
      : 0

  // ==========================================================
  // TRAINING DELIVERY MODEL
  // ==========================================================

  const trainingDelivery =
    normalizeTrainingDelivery(
      participantCount,
      input.clientType,
    )

  // ==========================================================
  // COMPLEXITY SCORE
  // ==========================================================

  let complexityScore = 1

  // ----------------------------------------------------------
  // Participant count
  // ----------------------------------------------------------

  if (participantCount >= 50) {
    complexityScore += 0.45
  } else if (participantCount >= 25) {
    complexityScore += 0.30
  } else if (participantCount >= 10) {
    complexityScore += 0.15
  }

  // ----------------------------------------------------------
  // Skill level
  // ----------------------------------------------------------

  if (skillLevel === "advanced") {
    complexityScore += 0.30
  } else if (skillLevel === "expert") {
    complexityScore += 0.40
  } else if (skillLevel === "mixed") {
    complexityScore += 0.25
  } else if (
    skillLevel === "intermediate"
  ) {
    complexityScore += 0.15
  }

  // ----------------------------------------------------------
  // Number of topics
  // ----------------------------------------------------------

  if (topics.length >= 8) {
    complexityScore += 0.40
  } else if (topics.length >= 5) {
    complexityScore += 0.30
  } else if (topics.length >= 3) {
    complexityScore += 0.15
  }

  // ----------------------------------------------------------
  // Objectives
  // ----------------------------------------------------------

  if (objectives.length >= 5) {
    complexityScore += 0.20
  } else if (
    objectives.length >= 3
  ) {
    complexityScore += 0.10
  }

  // ----------------------------------------------------------
  // Practical labs
  // ----------------------------------------------------------

  if (labsRequired) {
    complexityScore += 0.35
  }

  // ----------------------------------------------------------
  // Assessment
  // ----------------------------------------------------------

  if (assessmentRequired) {
    complexityScore += 0.15
  }

  // ----------------------------------------------------------
  // Assignments
  // ----------------------------------------------------------

  if (assignments) {
    complexityScore += 0.10
  }

  // ----------------------------------------------------------
  // Format
  // ----------------------------------------------------------

  if (
    format === "onsite" ||
    format === "in_person"
  ) {
    complexityScore += 0.15
  }

  if (format === "hybrid") {
    complexityScore += 0.25
  }

  // ----------------------------------------------------------
  // Compliance
  // ----------------------------------------------------------

  if (compliance.length > 0) {
    complexityScore += 0.15
  }

  // ----------------------------------------------------------
  // Materials
  // ----------------------------------------------------------

  if (materials.length >= 4) {
    complexityScore += 0.15
  }

  // ----------------------------------------------------------
  // Expected outcomes
  // ----------------------------------------------------------

  if (expectedOutcomes.length >= 3) {
    complexityScore += 0.10
  }

  // ----------------------------------------------------------
  // Training duration
  // ----------------------------------------------------------

  if (trainingWeeks >= 24) {
    complexityScore += 0.25
  } else if (trainingWeeks >= 13) {
    complexityScore += 0.15
  } else if (trainingWeeks >= 5) {
    complexityScore += 0.05
  }

  // ----------------------------------------------------------
  // Confidentiality
  // ----------------------------------------------------------

  if (
    confidentialityLevel ===
    "confidential"
  ) {
    complexityScore += 0.15
  }

  if (
    confidentialityLevel ===
    "high" ||
    confidentialityLevel ===
    "highly_confidential"
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
  // ESTIMATED WORKING HOURS
  // ==========================================================
  //
  // IMPORTANT:
  //
  // These are internal workload estimates.
  //
  // For structured training schedules, live training
  // hours are used as the primary workload.
  //
  // Additional preparation/support time is then added
  // for labs, assessments, materials, etc.
  //
  // ==========================================================

  let estimatedHours =
    trainingHours > 0
      ? trainingHours
      : complexity === "high"
        ? 24
        : complexity === "medium"
          ? 12
          : 6

  // ----------------------------------------------------------
  // Additional participant handling
  // ----------------------------------------------------------

  if (
    trainingHours <= 0
  ) {
    if (participantCount >= 50) {
      estimatedHours += 8
    } else if (
      participantCount >= 25
    ) {
      estimatedHours += 4
    } else if (
      participantCount >= 10
    ) {
      estimatedHours += 2
    }
  }

  // ----------------------------------------------------------
  // Labs
  // ----------------------------------------------------------

  if (labsRequired) {
    estimatedHours +=
      trainingHours > 0
        ? Math.max(
            2,
            trainingHours * 0.15,
          )
        : 6
  }

  // ----------------------------------------------------------
  // Assessment
  // ----------------------------------------------------------

  if (assessmentRequired) {
    estimatedHours += 3
  }

  // ----------------------------------------------------------
  // Assignments
  // ----------------------------------------------------------

  if (assignments) {
    estimatedHours +=
      trainingHours > 0
        ? Math.max(
            2,
            trainingHours * 0.08,
          )
        : 2
  }

  // ----------------------------------------------------------
  // Materials
  // ----------------------------------------------------------

  if (materials.length >= 4) {
    estimatedHours += 3
  } else if (
    materials.length > 0
  ) {
    estimatedHours += 1
  }

  // ----------------------------------------------------------
  // Hybrid delivery
  // ----------------------------------------------------------

  if (format === "hybrid") {
    estimatedHours += 2
  }

  // ----------------------------------------------------------
  // Career guidance
  // ----------------------------------------------------------

  if (careerGuidance) {
    estimatedHours += 2
  }

  estimatedHours = Math.max(
    4,
    Math.round(
      estimatedHours,
    ),
  )

  // ==========================================================
  // PRIORITY
  // ==========================================================

  let suggestedPriority =
    "normal"

  if (
    urgency === "critical"
  ) {
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
  //
  // This is the important part.
  //
  // The pricing engine receives the actual structured
  // training engagement instead of receiving only the
  // description.
  //
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
          : urgency === "low"
            ? "flexible"
            : "standard",

      trainingDurationWeeks:
        trainingWeeks > 0
          ? trainingWeeks
          : null,

      sessionsPerWeek:
        sessionsPerWeek > 0
          ? sessionsPerWeek
          : null,

      sessionDurationHours:
        hoursPerSession > 0
          ? hoursPerSession
          : null,

      trainingDelivery,

      specialization:
        specialization
          ? clean(
              input.specialization,
            )
          : null,

      practicalLabs:
        labsRequired,

      assignments,

      materials:
        materials.length > 0,

      chatSupport,

      assessment:
        assessmentRequired,

      certification,

      careerGuidance,

      /**
       * Investigation-only fields are intentionally
       * neutralized for training.
       */
      investigationDepth:
        null,

      confidentialityLevel,

      subjectType:
        null,
    })

  // ==========================================================
  // PRICE SAFETY
  // ==========================================================

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

  const minPrice =
    Number.isFinite(
      estimate.minPrice,
    )
      ? estimate.minPrice
      : suggestedPrice

  const maxPrice =
    Number.isFinite(
      estimate.maxPrice,
    )
      ? estimate.maxPrice
      : suggestedPrice

  // ==========================================================
  // CONFIDENCE
  // ==========================================================

  let confidence = 0.50

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
    trainingWeeks > 0
  ) {
    confidence += 0.05
  }

  if (
    sessionsPerWeek > 0
  ) {
    confidence += 0.05
  }

  if (
    hoursPerSession > 0
  ) {
    confidence += 0.05
  }

  confidence = Math.min(
    0.95,
    Number(
      confidence.toFixed(2),
    ),
  )

  // ==========================================================
  // REASONING
  // ==========================================================

  const scheduleDescription =
    trainingHours > 0
      ? `${trainingWeeks} week(s) × ${sessionsPerWeek} session(s)/week × ${hoursPerSession} hour(s)/session = ${trainingHours} live training hours.`
      : "A complete structured training schedule was not provided, so the pricing estimate requires additional admin review."

  const reasoningParts = [
    `Cybersecurity training estimate based on ${participantCount} participant(s).`,

    `Skill level: ${skillLevel}.`,

    `Training format: ${format}.`,

    `Training delivery model: ${trainingDelivery}.`,

    `Training duration: ${duration}.`,

    scheduleDescription,

    `The request contains ${topics.length} selected topic(s).`,

    labsRequired
      ? "Practical cybersecurity labs are required."
      : "Practical cybersecurity labs are not required.",

    assessmentRequired
      ? "Assessment is required."
      : "Assessment is not required.",

    assignments
      ? "Assignments are included."
      : "Assignments are not included.",

    materials.length > 0
      ? `${materials.length} training material/resource item(s) were requested.`
      : "No specific training materials were requested.",

    compliance.length > 0
      ? `Compliance requirements include ${compliance.join(", ")}.`
      : "No specific compliance requirements were provided.",

    certification
      ? "Certification is included."
      : "Certification is not explicitly included.",

    careerGuidance
      ? "Career guidance is included."
      : "Career guidance is not included.",

    specialization
      ? `Specialization requested: ${clean(input.specialization)}.`
      : "No specific specialization was provided.",

    `Internal complexity score: ${complexityScore.toFixed(2)}.`,

    `Classified complexity: ${complexity}.`,

    `Estimated internal workload: ${estimatedHours} hours.`,

    `Recommended priority: ${suggestedPriority}.`,

    `Pricing model: training engagement rather than investigation pricing.`,

    `Recommended internal estimate: ${currency} ${suggestedPrice.toLocaleString()}.`,

    `Recommended internal range: ${currency} ${minPrice.toLocaleString()}–${maxPrice.toLocaleString()}.`,

    `Pricing confidence: ${Math.round(confidence * 100)}%.`,

    "This is an internal AI-generated recommendation and is not the final client quote. Final pricing requires ShadowNode admin review and approval.",
  ]

  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    complexity,

    estimatedHours,

    suggestedService:
      normalizedService,

    suggestedPriority,

    suggestedPrice,

    minPrice,

    maxPrice,

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

      assignments,

      materialsRequired:
        materials.length > 0,

      chatSupport,

      certification,

      careerGuidance,

      specialization,

      format,

      duration,

      trainingWeeks,

      sessionsPerWeek,

      hoursPerSession,

      trainingHours,

      urgency,

      confidentialityLevel,
    },

    pricing: {
      baseHourlyRate:
        estimate.basePrice,

      trainingMultiplier:
        estimate.trainingMultiplier,

      urgencyMultiplier:
        estimate.urgencyMultiplier,

      estimatedPrice:
        estimate.estimatedPrice,

      minPrice:
        estimate.minPrice,

      maxPrice:
        estimate.maxPrice,

      breakdown:
        estimate.breakdown,
    },
  }
}

// ============================================================
// ALIAS
// ============================================================
//
// Allows the route to use either naming convention.
// ============================================================

export const analyzeTrainingRequest =
  analyzeCybersecurityTrainingRequest

export default analyzeCybersecurityTrainingRequest