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

/* Depth level multipliers used in AI estimation */
const DEPTH_MULTIPLIERS: Record<string, number> = {
  basic: 0.6,
  standard: 1.0,
  deep: 1.6,
  comprehensive: 2.2,
}

/* Confidentiality surcharge */
const CONFIDENTIALITY_SURCHARGE: Record<string, number> = {
  standard: 1.0,
  confidential: 1.25,
  highly_confidential: 1.5,
}

/* Subject-type complexity factor */
const SUBJECT_COMPLEXITY: Record<string, number> = {
  person: 1.0,
  company: 1.15,
  digital_asset: 1.3,
}

const serviceTypes = new Set(["osint", "forensics", "ethical-hacking", "mixed"])
const timelines = new Set(["urgent", "standard", "flexible"])

export function analyzeRequest(input: AnalysisInput): RequestAnalysis {
  const description = input.description.trim()
  const words = description.split(/\s+/).filter(Boolean).length
  const normalizedService = serviceTypes.has(input.serviceType) ? input.serviceType : "mixed"
  const timeline = timelines.has(input.timeline || "") ? input.timeline || "standard" : input.urgency === "critical" || input.urgency === "high" ? "urgent" : "standard"
  const estimate = estimatePrice({
    serviceType: normalizedService as "osint" | "forensics" | "ethical-hacking" | "mixed",
    description,
    timeline: timeline as "urgent" | "standard" | "flexible",
  })

  /* Incorporate depth, confidentiality, and subject type into complexity */
  const depthMultiplier = DEPTH_MULTIPLIERS[input.investigationDepth || "standard"] || 1.0
  const confMultiplier = CONFIDENTIALITY_SURCHARGE[input.confidentialityLevel || "standard"] || 1.0
  const subjectMultiplier = SUBJECT_COMPLEXITY[input.subjectType || "person"] || 1.0

  /* Effective complexity combines all factors */
  const effectiveMultiplier = estimate.complexityMultiplier * depthMultiplier * subjectMultiplier
  const complexity = effectiveMultiplier >= 1.8 || words > 200 ? "high" : effectiveMultiplier >= 1.3 || words > 80 ? "medium" : "low"
  const estimatedHours = Math.round(
    complexity === "high" ? 48 * depthMultiplier * confMultiplier
    : complexity === "medium" ? 24 * depthMultiplier * confMultiplier
    : 10 * depthMultiplier * confMultiplier,
  )

  const suggestedPriority = input.urgency === "critical" ? "critical" : input.urgency === "high" || timeline === "urgent" ? "high" : "normal"

  /* Adjusted price takes depth, confidentiality, and subject into account */
  const adjustedPrice = Math.round(estimate.estimatedPrice * depthMultiplier * confMultiplier)

  return {
    complexity,
    estimatedHours,
    suggestedService: normalizedService,
    suggestedPriority,
    suggestedPrice: adjustedPrice,
    confidence: 0.72,
    reasoning: `Estimated from ${words} words, ${normalizedService} service type, ${timeline} timeline, ${input.investigationDepth || "standard"} depth, ${input.confidentialityLevel || "standard"} confidentiality, ${input.subjectType || "person"} subject type, and ${effectiveMultiplier.toFixed(2)}x effective complexity multiplier.`,
  }
}
