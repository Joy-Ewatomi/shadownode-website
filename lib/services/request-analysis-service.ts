import { estimatePrice } from "@/lib/pricing"

type AnalysisInput = {
  serviceType: string
  description: string
  timeline?: string | null
  urgency?: string | null
  investigationDepth?: string | null
  confidentialityLevel?: string | null
  subjectType?: string | null
}

export type RequestAnalysis = {
  complexity: string
  estimatedHours: number
  suggestedService: string
  suggestedPriority: string
  suggestedPrice: number
  confidence: number
  reasoning: string
}

const SERVICE_TYPES = new Set([
  "osint",
  "forensics",
  "ethical-hacking",
  "mixed",
])

const TIMELINES = new Set([
  "urgent",
  "standard",
  "flexible",
])

export function analyzeRequest(
  input: AnalysisInput,
): RequestAnalysis {
  const description =
    input.description.trim()

  const words =
    description
      .split(/\s+/)
      .filter(Boolean).length

  const normalizedService =
    SERVICE_TYPES.has(input.serviceType)
      ? input.serviceType
      : "mixed"

  const timeline =
    TIMELINES.has(input.timeline || "")
      ? (input.timeline as
          | "urgent"
          | "standard"
          | "flexible")
      : input.urgency === "critical" ||
          input.urgency === "high"
        ? "urgent"
        : "standard"

  const estimate = estimatePrice({
    serviceType:
      normalizedService as
        | "osint"
        | "forensics"
        | "ethical-hacking"
        | "mixed",

    description,

    timeline,

    investigationDepth:
      input.investigationDepth,

    confidentialityLevel:
      input.confidentialityLevel,

    subjectType:
      input.subjectType,
  })

  /**
   * Determine complexity.
   */

  const complexity =
    estimate.complexityMultiplier >= 1.5
      ? "high"
      : estimate.complexityMultiplier >= 1.2
        ? "medium"
        : "low"

  /**
   * More realistic working-hour estimates.
   */

  const estimatedHours =
    complexity === "high"
      ? 24
      : complexity === "medium"
        ? 12
        : 6

  /**
   * Priority.
   */

  const suggestedPriority =
    input.urgency === "critical"
      ? "critical"
      : input.urgency === "high" ||
          timeline === "urgent"
        ? "high"
        : "normal"

  /**
   * Confidence is based on how much information
   * the request contains.
   */

  let confidence = 0.65

  if (words >= 80) {
    confidence += 0.05
  }

  if (input.subjectType) {
    confidence += 0.05
  }

  if (input.investigationDepth) {
    confidence += 0.05
  }

  if (input.confidentialityLevel) {
    confidence += 0.05
  }

  confidence = Math.min(
    0.9,
    Number(confidence.toFixed(2)),
  )

  return {
    complexity,

    estimatedHours,

    suggestedService:
      normalizedService,

    suggestedPriority,

    suggestedPrice:
      estimate.estimatedPrice,

    confidence,

    reasoning:
      `Internal estimate based on ${words} words, ` +
      `${normalizedService} service, ` +
      `${timeline} timeline, ` +
      `${input.investigationDepth || "standard"} depth, ` +
      `${input.confidentialityLevel || "standard"} confidentiality, ` +
      `${input.subjectType || "person"} subject, ` +
      `and a ${estimate.complexityMultiplier}x ` +
      `complexity multiplier. ` +
      `Recommended internal estimate: $${estimate.estimatedPrice.toLocaleString()}.`,
  }
}