/**
 * ShadowNode Pricing Estimation Engine
 *
 * IMPORTANT:
 * - Internal pricing is calculated in USD.
 * - Client-facing currency conversion happens separately.
 * - The estimate is a recommendation, NOT the final quote.
 * - Final pricing must be reviewed and approved by ShadowNode.
 *
 * PRICING MODEL
 * -------------
 * Investigation services and cybersecurity training are priced
 * differently.
 *
 * INVESTIGATIONS:
 *   OSINT
 *   Digital Forensics
 *   Ethical Hacking
 *   Mixed / Multi-Service
 *
 * TRAINING:
 *   Cybersecurity Training
 *
 * Training pricing is based primarily on the training engagement:
 *   duration × sessions × session length
 *   + delivery model
 *   + practical work
 *   + materials/support
 *   + specialization
 *   + assessment/certification
 *
 * It must NOT be priced like an investigation.
 */

// ============================================================
// TYPES
// ============================================================

export type ServiceType =
  | "osint"
  | "forensics"
  | "ethical-hacking"
  | "cybersecurity-training"
  | "mixed"

export type Timeline =
  | "urgent"
  | "standard"
  | "flexible"

export type TrainingDelivery =
  | "one_on_one"
  | "small_group"
  | "group"
  | "corporate"

export interface PricingFactors {
  serviceType: ServiceType
  description: string
  timeline: Timeline

  investigationDepth?: string | null
  confidentialityLevel?: string | null
  subjectType?: string | null

  // ==========================================================
  // TRAINING-ONLY FACTORS
  // ==========================================================

  trainingDurationWeeks?: number | null
  sessionsPerWeek?: number | null
  sessionDurationHours?: number | null
  trainingDelivery?: TrainingDelivery | string | null

  specialization?: string | null
  practicalLabs?: boolean | null
  assignments?: boolean | null
  materials?: boolean | null
  chatSupport?: boolean | null
  assessment?: boolean | null
  certification?: boolean | null
  careerGuidance?: boolean | null
}

export interface PriceEstimate {
  basePrice: number

  complexityMultiplier: number
  urgencyMultiplier: number
  depthMultiplier: number
  confidentialityMultiplier: number
  subjectMultiplier: number

  /**
   * Training-specific multiplier.
   *
   * For investigations this remains 1.
   */
  trainingMultiplier: number

  /**
   * Estimated internal price in USD.
   */
  estimatedPrice: number

  /**
   * Recommended lower boundary in USD.
   */
  minPrice: number

  /**
   * Recommended upper boundary in USD.
   */
  maxPrice: number

  /**
   * Useful for training requests.
   */
  trainingHours: number

  /**
   * Useful for admin review / explanation.
   */
  pricingModel: "investigation" | "training"

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

// ============================================================
// BASE INVESTIGATION PRICES
// ============================================================
//
// These are internal USD recommendations.
//
// They are NOT client-facing fixed prices.
//
// Final pricing is subject to:
// - scope review
// - evidence volume
// - legal/authorization requirements
// - turnaround requirements
// - analyst workload
// - negotiation
//
// ============================================================

const INVESTIGATION_BASE_PRICES: Record<
  Exclude<ServiceType, "cybersecurity-training">,
  {
    min: number
    max: number
    avg: number
  }
> = {
  osint: {
    min: 150,
    max: 1500,
    avg: 500,
  },

  forensics: {
    min: 300,
    max: 2500,
    avg: 900,
  },

  "ethical-hacking": {
    min: 500,
    max: 5000,
    avg: 1500,
  },

  mixed: {
    min: 500,
    max: 6000,
    avg: 2000,
  },
}

// ============================================================
// TRAINING PRICING
// ============================================================
//
// Training is deliberately separated from investigations.
//
// We price training primarily by:
//
//   TOTAL LIVE HOURS
//
// Then apply engagement/delivery adjustments and optional
// service components.
//
// Example:
//
//   13 weeks
//   × 4 sessions/week
//   × 3 hours/session
//   = 156 live hours
//
// The engine then estimates the engagement rather than treating
// the request as a $1,000 investigation.
//
// ============================================================

const TRAINING_PRICING = {
  /**
   * Internal base rate per live training hour.
   *
   * This is the engine's starting point, not a public rate card.
   */
  baseHourlyRate: 45,

  /**
   * Minimum and maximum engagement boundaries.
   */
  minEngagement: 200,
  maxEngagement: 15000,

  /**
   * Delivery multipliers.
   */
  deliveryMultipliers: {
    one_on_one: 1.35,
    small_group: 1.1,
    group: 0.85,
    corporate: 1.2,
  } as Record<string, number>,

  /**
   * Optional training components.
   */
  componentMultipliers: {
    practicalLabs: 1.1,
    assignments: 1.05,
    materials: 1.03,
    chatSupport: 1.08,
    assessment: 1.05,
    certification: 1.05,
    careerGuidance: 1.08,
    specialization: 1.12,
  },

  /**
   * Duration adjustments.
   *
   * Longer engagements receive a modest efficiency discount
   * because the base hourly rate already captures the amount
   * of live instruction.
   */
  durationMultipliers: {
    short: 1.05, // <= 4 weeks
    standard: 1, // 5–12 weeks
    extended: 0.95, // 13–24 weeks
    long: 0.9, // > 24 weeks
  },
}

// ============================================================
// INVESTIGATION DEPTH
// ============================================================

const DEPTH_MULTIPLIERS: Record<string, number> = {
  basic: 0.7,
  standard: 1,
  deep: 1.35,
  comprehensive: 1.7,
}

// ============================================================
// CONFIDENTIALITY
// ============================================================

const CONFIDENTIALITY_MULTIPLIERS: Record<string, number> = {
  standard: 1,
  confidential: 1.1,
  highly_confidential: 1.2,
}

// ============================================================
// SUBJECT
// ============================================================

const SUBJECT_MULTIPLIERS: Record<string, number> = {
  person: 1,
  company: 1.15,
  digital_asset: 1.25,
}

// ============================================================
// COMPLEXITY
// ============================================================

function calculateComplexityMultiplier(
  description: string,
): number {
  const normalized = description.toLowerCase()

  const words = normalized
    .split(/\s+/)
    .filter(Boolean).length

  let multiplier = 1

  /**
   * Word count contributes modestly.
   *
   * A long description should not automatically become
   * an extremely expensive investigation.
   */
  if (words > 250) {
    multiplier += 0.25
  } else if (words > 150) {
    multiplier += 0.15
  } else if (words > 80) {
    multiplier += 0.1
  }

  const complexityKeywords = [
    "multiple identities",
    "multiple accounts",
    "international",
    "cross-border",
    "company network",
    "financial network",
    "crypto",
    "cryptocurrency",
    "dark web",
    "infrastructure",
    "multiple countries",
    "large dataset",
    "extensive evidence",
    "multiple subjects",
    "multiple targets",
    "complex network",
    "large number of accounts",
    "large volume of evidence",
  ]

  let keywordCount = 0

  for (const keyword of complexityKeywords) {
    if (normalized.includes(keyword)) {
      keywordCount++
    }
  }

  /**
   * Maximum keyword contribution = 0.4
   */
  multiplier += Math.min(
    0.4,
    keywordCount * 0.1,
  )

  return Number(
    Math.min(1.75, multiplier).toFixed(2),
  )
}

// ============================================================
// URGENCY
// ============================================================

function calculateUrgencyMultiplier(
  timeline: Timeline,
): number {
  switch (timeline) {
    case "urgent":
      return 1.35

    case "standard":
      return 1

    case "flexible":
      return 0.9

    default:
      return 1
  }
}

// ============================================================
// TRAINING HOURS
// ============================================================

function calculateTrainingHours(
  factors: PricingFactors,
): number {
  const weeks = Math.max(
    0,
    Number(factors.trainingDurationWeeks || 0),
  )

  const sessionsPerWeek = Math.max(
    0,
    Number(factors.sessionsPerWeek || 0),
  )

  const sessionDurationHours = Math.max(
    0,
    Number(factors.sessionDurationHours || 0),
  )

  return Number(
    (
      weeks *
      sessionsPerWeek *
      sessionDurationHours
    ).toFixed(2),
  )
}

// ============================================================
// TRAINING DURATION MULTIPLIER
// ============================================================

function calculateTrainingDurationMultiplier(
  weeks: number,
): number {
  if (weeks <= 4) {
    return TRAINING_PRICING.durationMultipliers.short
  }

  if (weeks <= 12) {
    return TRAINING_PRICING.durationMultipliers.standard
  }

  if (weeks <= 24) {
    return TRAINING_PRICING.durationMultipliers.extended
  }

  return TRAINING_PRICING.durationMultipliers.long
}

// ============================================================
// TRAINING COMPONENT MULTIPLIER
// ============================================================

function calculateTrainingComponentMultiplier(
  factors: PricingFactors,
): number {
  let multiplier = 1

  if (factors.practicalLabs) {
    multiplier *=
      TRAINING_PRICING.componentMultipliers.practicalLabs
  }

  if (factors.assignments) {
    multiplier *=
      TRAINING_PRICING.componentMultipliers.assignments
  }

  if (factors.materials) {
    multiplier *=
      TRAINING_PRICING.componentMultipliers.materials
  }

  if (factors.chatSupport) {
    multiplier *=
      TRAINING_PRICING.componentMultipliers.chatSupport
  }

  if (factors.assessment) {
    multiplier *=
      TRAINING_PRICING.componentMultipliers.assessment
  }

  if (factors.certification) {
    multiplier *=
      TRAINING_PRICING.componentMultipliers.certification
  }

  if (factors.careerGuidance) {
    multiplier *=
      TRAINING_PRICING.componentMultipliers.careerGuidance
  }

  if (factors.specialization) {
    multiplier *=
      TRAINING_PRICING.componentMultipliers.specialization
  }

  return Number(
    multiplier.toFixed(2),
  )
}

// ============================================================
// TRAINING DELIVERY MULTIPLIER
// ============================================================

function calculateTrainingDeliveryMultiplier(
  delivery?: string | null,
): number {
  if (!delivery) {
    return 1
  }

  return (
    TRAINING_PRICING.deliveryMultipliers[
      delivery
    ] || 1
  )
}

// ============================================================
// TRAINING ESTIMATE
// ============================================================

function estimateTrainingPrice(
  factors: PricingFactors,
): PriceEstimate {
  const trainingHours =
    calculateTrainingHours(factors)

  const weeks = Math.max(
    0,
    Number(factors.trainingDurationWeeks || 0),
  )

  const deliveryMultiplier =
    calculateTrainingDeliveryMultiplier(
      factors.trainingDelivery,
    )

  const durationMultiplier =
    calculateTrainingDurationMultiplier(
      weeks,
    )

  const componentMultiplier =
    calculateTrainingComponentMultiplier(
      factors,
    )

  const urgencyMultiplier =
    calculateUrgencyMultiplier(
      factors.timeline,
    )

  /**
   * If the request does not yet contain enough structured
   * training information, fall back to the minimum engagement.
   *
   * This prevents incomplete training requests from producing
   * a misleadingly precise price.
   */
  if (trainingHours <= 0) {
    const estimatedPrice =
      TRAINING_PRICING.minEngagement

    return {
      basePrice:
        TRAINING_PRICING.baseHourlyRate,

      complexityMultiplier: 1,
      urgencyMultiplier,
      depthMultiplier: 1,
      confidentialityMultiplier: 1,
      subjectMultiplier: 1,
      trainingMultiplier: 1,

      estimatedPrice,

      minPrice:
        TRAINING_PRICING.minEngagement,

      maxPrice:
        TRAINING_PRICING.maxEngagement,

      trainingHours: 0,

      pricingModel: "training",

      breakdown: {
        baseService:
          `Cybersecurity Training: $${TRAINING_PRICING.baseHourlyRate}/live hour`,

        complexity:
          "Training complexity is determined by engagement scope",

        urgency:
          `Timeline: ${factors.timeline} (${urgencyMultiplier}x)`,

        depth:
          "Training depth handled through curriculum and specialization",

        confidentiality:
          "Standard training confidentiality",

        subject:
          "Training engagement",

        training:
          "Insufficient structured session data — admin review required",
      },
    }
  }

  /**
   * Base live-instruction cost.
   */
  const baseLiveTrainingCost =
    trainingHours *
    TRAINING_PRICING.baseHourlyRate

  /**
   * Complete training estimate.
   */
  const rawPrice =
    baseLiveTrainingCost *
    deliveryMultiplier *
    durationMultiplier *
    componentMultiplier *
    urgencyMultiplier

  const estimatedPrice = Math.round(
    Math.min(
      TRAINING_PRICING.maxEngagement,
      Math.max(
        TRAINING_PRICING.minEngagement,
        rawPrice,
      ),
    ),
  )

  /**
   * Recommended range.
   *
   * We intentionally make this wider than a simple ±10%
   * because the admin still needs to review:
   *
   * - curriculum
   * - trainer requirements
   * - specialization
   * - practical environment
   * - student count
   * - support requirements
   */
  const rangeFactor =
    componentMultiplier >= 1.25
      ? 0.25
      : componentMultiplier >= 1.1
        ? 0.2
        : 0.15

  const minPrice = Math.round(
    Math.min(
      estimatedPrice,
      Math.max(
        TRAINING_PRICING.minEngagement,
        estimatedPrice * (1 - rangeFactor),
      ),
    ),
  )

  const maxPrice = Math.round(
    Math.min(
      TRAINING_PRICING.maxEngagement,
      Math.max(
        estimatedPrice,
        estimatedPrice * (1 + rangeFactor),
      ),
    ),
  )

  return {
    basePrice:
      TRAINING_PRICING.baseHourlyRate,

    complexityMultiplier: 1,

    urgencyMultiplier,

    depthMultiplier: 1,

    confidentialityMultiplier: 1,

    subjectMultiplier: 1,

    trainingMultiplier: Number(
      (
        deliveryMultiplier *
        durationMultiplier *
        componentMultiplier
      ).toFixed(2),
    ),

    estimatedPrice,

    minPrice,

    maxPrice,

    trainingHours,

    pricingModel: "training",

    breakdown: {
      baseService:
        `Cybersecurity Training: $${TRAINING_PRICING.baseHourlyRate}/live hour`,

      complexity:
        `Training engagement: ${trainingHours} live hours`,

      urgency:
        `${capitalize(factors.timeline)} timeline: ${urgencyMultiplier}x`,

      depth:
        `Training duration: ${weeks} week${weeks === 1 ? "" : "s"} (${durationMultiplier}x)`,

      confidentiality:
        "Training confidentiality handled separately from investigation pricing",

      subject:
        `Delivery model: ${factors.trainingDelivery || "standard"} (${deliveryMultiplier}x)`,

      training:
        `Training components multiplier: ${componentMultiplier}x`,
    },
  }
}

// ============================================================
// INVESTIGATION ESTIMATE
// ============================================================

function estimateInvestigationPrice(
  factors: PricingFactors,
): PriceEstimate {
  const serviceType =
    factors.serviceType ===
    "cybersecurity-training"
      ? "osint"
      : factors.serviceType

  const service =
    INVESTIGATION_BASE_PRICES[
      serviceType as Exclude<
        ServiceType,
        "cybersecurity-training"
      >
    ]

  const complexityMultiplier =
    calculateComplexityMultiplier(
      factors.description || "",
    )

  const urgencyMultiplier =
    calculateUrgencyMultiplier(
      factors.timeline,
    )

  const depthMultiplier =
    DEPTH_MULTIPLIERS[
      factors.investigationDepth ||
        "standard"
    ] || 1

  const confidentialityMultiplier =
    CONFIDENTIALITY_MULTIPLIERS[
      factors.confidentialityLevel ||
        "standard"
    ] || 1

  const subjectMultiplier =
    SUBJECT_MULTIPLIERS[
      factors.subjectType ||
        "person"
    ] || 1

  const rawPrice =
    service.avg *
    complexityMultiplier *
    urgencyMultiplier *
    depthMultiplier *
    confidentialityMultiplier *
    subjectMultiplier

  const estimatedPrice = Math.round(
    Math.min(
      service.max,
      Math.max(
        service.min,
        rawPrice,
      ),
    ),
  )

  const minPrice = Math.round(
    Math.min(
      service.max,
      Math.max(
        service.min,
        service.min *
          complexityMultiplier *
          depthMultiplier,
      ),
    ),
  )

  const maxPrice = Math.round(
    Math.min(
      service.max,
      Math.max(
        service.min,
        service.max *
          complexityMultiplier *
          depthMultiplier *
          confidentialityMultiplier,
      ),
    ),
  )

  const serviceNames: Record<
    Exclude<ServiceType, "cybersecurity-training">,
    string
  > = {
    osint:
      "OSINT Intelligence",

    forensics:
      "Digital Forensics",

    "ethical-hacking":
      "Ethical Hacking Assessment",

    mixed:
      "Multi-Service Investigation",
  }

  const timelineNames: Record<
    Timeline,
    string
  > = {
    urgent: "Urgent",
    standard: "Standard",
    flexible: "Flexible",
  }

  return {
    basePrice: service.avg,

    complexityMultiplier,

    urgencyMultiplier,

    depthMultiplier,

    confidentialityMultiplier,

    subjectMultiplier,

    trainingMultiplier: 1,

    estimatedPrice,

    minPrice,

    maxPrice,

    trainingHours: 0,

    pricingModel: "investigation",

    breakdown: {
      baseService:
        `${serviceNames[serviceType as Exclude<ServiceType, "cybersecurity-training">]}: $${service.avg.toLocaleString()}`,

      complexity:
        `Complexity: ${complexityMultiplier}x`,

      urgency:
        `${timelineNames[factors.timeline]} timeline: ${urgencyMultiplier}x`,

      depth:
        `Investigation depth: ${depthMultiplier}x`,

      confidentiality:
        `Confidentiality: ${confidentialityMultiplier}x`,

      subject:
        `Subject type: ${subjectMultiplier}x`,

      training:
        "Not applicable",
    },
  }
}

// ============================================================
// MAIN ESTIMATION
// ============================================================

export function estimatePrice(
  factors: PricingFactors,
): PriceEstimate {
  /**
   * Training has its own pricing engine.
   *
   * It must NEVER pass through the investigation pricing model.
   */
  if (
    factors.serviceType ===
    "cybersecurity-training"
  ) {
    return estimateTrainingPrice(
      factors,
    )
  }

  return estimateInvestigationPrice(
    factors,
  )
}

// ============================================================
// DISPLAY
// ============================================================

export function formatPrice(
  price: number,
): string {
  return `$${price.toLocaleString(
    "en-US",
  )}`
}

// ============================================================
// SERVICE RANGE
// ============================================================

export function getPriceRange(
  serviceType: string,
): {
  min: number
  max: number
} | null {
  /**
   * Training has a separate engagement range.
   */
  if (
    serviceType ===
    "cybersecurity-training"
  ) {
    return {
      min:
        TRAINING_PRICING.minEngagement,

      max:
        TRAINING_PRICING.maxEngagement,
    }
  }

  const range =
    INVESTIGATION_BASE_PRICES[
      serviceType as Exclude<
        ServiceType,
        "cybersecurity-training"
      >
    ]

  return range
    ? {
        min: range.min,
        max: range.max,
      }
    : null
}

// ============================================================
// TRAINING HELPERS
// ============================================================

/**
 * Calculate total live training hours.
 *
 * Example:
 *
 * 13 weeks × 4 sessions × 3 hours
 * = 156 hours
 */
export function getTrainingHours(
  weeks: number,
  sessionsPerWeek: number,
  sessionDurationHours: number,
): number {
  return Number(
    (
      Math.max(0, weeks) *
      Math.max(0, sessionsPerWeek) *
      Math.max(0, sessionDurationHours)
    ).toFixed(2),
  )
}

/**
 * Get the internal training hourly rate.
 *
 * Kept as a function so other parts of the application
 * don't need direct access to internal constants.
 */
export function getTrainingHourlyRate(): number {
  return TRAINING_PRICING.baseHourlyRate
}

/**
 * Get the training engagement range.
 */
export function getTrainingPriceRange(): {
  min: number
  max: number
} {
  return {
    min:
      TRAINING_PRICING.minEngagement,

    max:
      TRAINING_PRICING.maxEngagement,
  }
}

// ============================================================
// UTILITY
// ============================================================

function capitalize(
  value: string,
): string {
  if (!value) {
    return value
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  )
}