import { estimatePrice } from "@/lib/pricing"

type AnalysisInput = {
  serviceType: string
  description: string
  timeline?: string | null
  urgency?: string | null
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

  const complexity = words > 160 || estimate.complexityMultiplier >= 1.7 ? "high" : words > 70 || estimate.complexityMultiplier >= 1.25 ? "medium" : "low"
  const estimatedHours = complexity === "high" ? 48 : complexity === "medium" ? 24 : 10
  const suggestedPriority = input.urgency === "critical" ? "critical" : input.urgency === "high" || timeline === "urgent" ? "high" : "normal"

  return {
    complexity,
    estimatedHours,
    suggestedService: normalizedService,
    suggestedPriority,
    suggestedPrice: estimate.estimatedPrice,
    confidence: 0.72,
    reasoning: `Estimated from ${words} words, ${normalizedService} service type, ${timeline} timeline, and ${estimate.complexityMultiplier}x complexity multiplier.`,
  }
}
