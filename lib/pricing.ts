/**
 * ShadowNode Pricing Estimation Engine
 *
 * IMPORTANT:
 * - Internal pricing is calculated in USD.
 * - Client-facing currency conversion happens separately.
 * - The AI estimate is a recommendation, NOT the final quote.
 */

export type ServiceType =
  | "osint"
  | "forensics"
  | "ethical-hacking"
  | "mixed"

export type Timeline =
  | "urgent"
  | "standard"
  | "flexible"

export interface PricingFactors {
  serviceType: ServiceType
  description: string
  timeline: Timeline
  investigationDepth?: string | null
  confidentialityLevel?: string | null
  subjectType?: string | null
}

export interface PriceEstimate {
  basePrice: number
  complexityMultiplier: number
  urgencyMultiplier: number
  depthMultiplier: number
  confidentialityMultiplier: number
  subjectMultiplier: number
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
  }
}

/**
 * ---------------------------------------------------------
 * BASE INTERNAL PRICES
 * ---------------------------------------------------------
 *
 * These are intentionally much more realistic for
 * ShadowNode's initial investigation workflow.
 *
 * All values are USD.
 */

const BASE_PRICES: Record<
  ServiceType,
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

/**
 * ---------------------------------------------------------
 * DEPTH
 * ---------------------------------------------------------
 */

const DEPTH_MULTIPLIERS: Record<string, number> = {
  basic: 0.7,
  standard: 1,
  deep: 1.35,
  comprehensive: 1.7,
}

/**
 * ---------------------------------------------------------
 * CONFIDENTIALITY
 * ---------------------------------------------------------
 */

const CONFIDENTIALITY_MULTIPLIERS: Record<string, number> = {
  standard: 1,
  confidential: 1.1,
  highly_confidential: 1.2,
}

/**
 * ---------------------------------------------------------
 * SUBJECT
 * ---------------------------------------------------------
 */

const SUBJECT_MULTIPLIERS: Record<string, number> = {
  person: 1,
  company: 1.15,
  digital_asset: 1.25,
}

/**
 * ---------------------------------------------------------
 * COMPLEXITY
 * ---------------------------------------------------------
 */

function calculateComplexityMultiplier(
  description: string,
): number {
  const normalized = description.toLowerCase()

  const words = normalized
    .split(/\s+/)
    .filter(Boolean).length

  let multiplier = 1

  /**
   * Word count contributes only modestly.
   *
   * We do NOT want a long description to automatically
   * become an extremely expensive investigation.
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

/**
 * ---------------------------------------------------------
 * URGENCY
 * ---------------------------------------------------------
 */

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

/**
 * ---------------------------------------------------------
 * MAIN ESTIMATION
 * ---------------------------------------------------------
 */

export function estimatePrice(
  factors: PricingFactors,
): PriceEstimate {
  const service =
    BASE_PRICES[factors.serviceType]

  const complexityMultiplier =
    calculateComplexityMultiplier(
      factors.description,
    )

  const urgencyMultiplier =
    calculateUrgencyMultiplier(
      factors.timeline,
    )

  const depthMultiplier =
    DEPTH_MULTIPLIERS[
      factors.investigationDepth || "standard"
    ] || 1

  const confidentialityMultiplier =
    CONFIDENTIALITY_MULTIPLIERS[
      factors.confidentialityLevel ||
        "standard"
    ] || 1

  const subjectMultiplier =
    SUBJECT_MULTIPLIERS[
      factors.subjectType || "person"
    ] || 1

  /**
   * Calculate estimated price.
   */

  const rawPrice =
    service.avg *
    complexityMultiplier *
    urgencyMultiplier *
    depthMultiplier *
    confidentialityMultiplier *
    subjectMultiplier

  /**
   * Keep the recommendation inside the service's
   * realistic boundaries.
   */

  const estimatedPrice = Math.round(
    Math.min(
      service.max,
      Math.max(service.min, rawPrice),
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
    ServiceType,
    string
  > = {
    osint: "OSINT Intelligence",
    forensics: "Digital Forensics",
    "ethical-hacking":
      "Ethical Hacking Assessment",
    mixed: "Multi-Service Investigation",
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

    estimatedPrice,

    minPrice,

    maxPrice,

    breakdown: {
      baseService:
        `${serviceNames[factors.serviceType]}: $${service.avg.toLocaleString()}`,

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
    },
  }
}

/**
 * ---------------------------------------------------------
 * DISPLAY
 * ---------------------------------------------------------
 */

export function formatPrice(
  price: number,
): string {
  return `$${price.toLocaleString("en-US")}`
}

/**
 * ---------------------------------------------------------
 * SERVICE RANGE
 * ---------------------------------------------------------
 */

export function getPriceRange(
  serviceType: string,
): {
  min: number
  max: number
} | null {
  const range =
    BASE_PRICES[
      serviceType as ServiceType
    ]

  return range
    ? {
        min: range.min,
        max: range.max,
      }
    : null
}