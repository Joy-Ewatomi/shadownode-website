import { validateCommunicationSelection } from "@/lib/communication-channels"
export const CUSTOM_SERVICE_TYPE = "custom_service"

export const CUSTOM_REQUEST_STATUSES = [
  "pending_admin_review",
  "more_information_required",
  "pending_super_admin_review",
  "returned_for_revision",
  "approved_for_quote",
  "quote_preparation",
  "quote_available",
  "currently_unavailable",
  "outside_scope",
  "declined",
  "cancelled",
] as const

export type CustomRequestStatus = (typeof CUSTOM_REQUEST_STATUSES)[number]

export const ADMIN_RECOMMENDATIONS = [
  "recommend_approval",
  "request_more_information",
  "recommend_unavailable",
  "recommend_outside_scope",
  "recommend_decline",
] as const

export const SUPER_ADMIN_DECISIONS = [
  "approve_for_quote",
  "return_for_revision",
  "request_more_information",
  "currently_unavailable",
  "outside_scope",
  "decline",
] as const

export type AdminRecommendation = (typeof ADMIN_RECOMMENDATIONS)[number]
export type SuperAdminDecision = (typeof SUPER_ADMIN_DECISIONS)[number]

export type CustomRequestDetails = {
  serviceCategory: string | null
  context: string | null
  goals: string | null
  deliverables: string | null
  audience: string | null
  existingEnvironment: string | null
  technicalRequirements: string | null
  technologies: string | null
  integrations: string | null
  scale: string | null
  preferredStartDate: string | null
  preferredEndDate: string | null
  schedulePreference: string | null
  urgency: string | null
  budgetAmount: number | null
  budgetCurrency: string | null
  confidentialityRequirements: string | null
  complianceRequirements: string | null
  accessibilityRequirements: string | null
  additionalNotes: string | null
}

export type ParsedCustomRequest = {
  submissionKey: string
  title: string | null
  objective: string
  billingCountry: string
  preferredCurrency: string
  communicationMethod: "portal_notification" | "email" | "whatsapp"
  communicationEmail: string | null
  communicationWhatsapp: string | null
  whatsappConsent: boolean
  supportingLinks: string[]
  authorizationConfirmed: true
  termsAccepted: true
  details: CustomRequestDetails
}

export class CustomRequestValidationError extends Error {}

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null
  const text = value.trim()
  if (!text) return null
  if (text.length > maxLength) throw new CustomRequestValidationError("One or more fields are too long.")
  return text
}

function requiredText(value: unknown, maxLength: number, message: string) {
  const text = optionalText(value, maxLength)
  if (!text) throw new CustomRequestValidationError(message)
  return text
}

function optionalDate(value: unknown) {
  const text = optionalText(value, 10)
  if (!text) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new CustomRequestValidationError("Enter a valid date.")
  }
  return text
}

function parseLinks(value: unknown) {
  const values = Array.isArray(value) ? value : []
  if (values.length > 10) throw new CustomRequestValidationError("A maximum of 10 links is allowed.")
  return values.map((item) => {
    const text = requiredText(item, 2048, "Links cannot be empty.")
    let url: URL
    try { url = new URL(text) } catch { throw new CustomRequestValidationError("Each link must be a valid absolute URL.") }
    if (!new Set(["https:", "http:"]).has(url.protocol) || url.username || url.password) {
      throw new CustomRequestValidationError("Each link must use HTTP or HTTPS and must not contain credentials.")
    }
    return url.toString()
  })
}

export function parseCustomRequestInput(body: unknown): ParsedCustomRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new CustomRequestValidationError("Invalid request body.")
  }
  const input = body as Record<string, unknown>
  const submissionKey = requiredText(input.submissionKey, 36, "A submission key is required.")
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionKey)) {
    throw new CustomRequestValidationError("Invalid submission key.")
  }
  const billingCountry = requiredText(input.billingCountry, 2, "Select a billing country.").toUpperCase()
  if (!/^[A-Z]{2}$/.test(billingCountry)) throw new CustomRequestValidationError("Select a valid billing country.")
  const preferredCurrency = requiredText(input.preferredCurrency, 3, "Select a preferred currency.").toUpperCase()
  if (!/^[A-Z]{3}$/.test(preferredCurrency)) throw new CustomRequestValidationError("Enter a valid three-letter currency code.")
  if (input.authorizationConfirmed !== true || input.termsAccepted !== true) {
    throw new CustomRequestValidationError("Authorization and terms acceptance are required.")
  }
  const communication = validateCommunicationSelection({
    preference: input.communicationMethod,
    whatsappNumber: input.communicationWhatsapp,
    whatsappConsent: input.whatsappConsent,
  })
  const communicationMethod = communication.preference
  const preferredStartDate = optionalDate(input.preferredStartDate)
  const preferredEndDate = optionalDate(input.preferredEndDate)
  if (preferredStartDate && preferredEndDate && preferredEndDate < preferredStartDate) {
    throw new CustomRequestValidationError("The preferred end date cannot be before the start date.")
  }
  const rawBudget = input.budgetAmount
  const budgetAmount = rawBudget === null || rawBudget === undefined || rawBudget === "" ? null : Number(rawBudget)
  if (budgetAmount !== null && (!Number.isFinite(budgetAmount) || budgetAmount < 0 || budgetAmount > 1_000_000_000)) {
    throw new CustomRequestValidationError("Enter a valid budget amount.")
  }
  return {
    submissionKey,
    title: optionalText(input.title, 160),
    objective: requiredText(input.objective, 10_000, "Describe what you would like ShadowNode to do."),
    billingCountry,
    preferredCurrency,
    communicationMethod: communicationMethod === "portal" ? "portal_notification" : communicationMethod,
    communicationEmail: optionalText(input.communicationEmail, 254),
    communicationWhatsapp: communication.whatsappNumber,
    whatsappConsent: communication.whatsappConsent,
    supportingLinks: parseLinks(input.supportingLinks),
    authorizationConfirmed: true,
    termsAccepted: true,
    details: {
      serviceCategory: optionalText(input.serviceCategory, 100), context: optionalText(input.context, 5000),
      goals: optionalText(input.goals, 5000), deliverables: optionalText(input.deliverables, 5000),
      audience: optionalText(input.audience, 1000), existingEnvironment: optionalText(input.existingEnvironment, 5000),
      technicalRequirements: optionalText(input.technicalRequirements, 5000), technologies: optionalText(input.technologies, 2000),
      integrations: optionalText(input.integrations, 2000), scale: optionalText(input.scale, 1000),
      preferredStartDate, preferredEndDate, schedulePreference: optionalText(input.schedulePreference, 1000),
      urgency: optionalText(input.urgency, 40), budgetAmount,
      budgetCurrency: optionalText(input.budgetCurrency, 3)?.toUpperCase() || preferredCurrency,
      confidentialityRequirements: optionalText(input.confidentialityRequirements, 3000),
      complianceRequirements: optionalText(input.complianceRequirements, 3000),
      accessibilityRequirements: optionalText(input.accessibilityRequirements, 3000),
      additionalNotes: optionalText(input.additionalNotes, 5000),
    },
  }
}

export function statusForAdminRecommendation(action: AdminRecommendation): CustomRequestStatus {
  if (action === "request_more_information") return "more_information_required"
  return "pending_super_admin_review"
}

export function statusForSuperAdminDecision(action: SuperAdminDecision): CustomRequestStatus {
  return ({
    approve_for_quote: "approved_for_quote",
    return_for_revision: "returned_for_revision",
    request_more_information: "more_information_required",
    currently_unavailable: "currently_unavailable",
    outside_scope: "outside_scope",
    decline: "declined",
  } as const)[action]
}

export function isCustomRequest(value: string | null | undefined) {
  return value === CUSTOM_SERVICE_TYPE || value === "custom"
}


export type CustomTriageRecommendation = {
  advisoryOnly: true
  suggestedCategory: string
  complexity: "low" | "medium" | "high"
  recommendedAction: "review_scope" | "request_more_information"
  missingInformation: string[]
  riskFlags: string[]
}

export function buildCustomTriageRecommendation(input: ParsedCustomRequest): CustomTriageRecommendation {
  const missingInformation = [
    !input.details.goals && "goals",
    !input.details.deliverables && "deliverables",
    !input.details.preferredEndDate && "preferred completion date",
    !input.details.budgetAmount && "indicative budget",
  ].filter((item): item is string => Boolean(item))
  const signals = [
    input.details.technicalRequirements,
    input.details.integrations,
    input.details.complianceRequirements,
    input.details.confidentialityRequirements,
  ].filter(Boolean).length
  const riskFlags = [
    input.details.complianceRequirements && "Compliance review requested",
    input.details.confidentialityRequirements && "Confidentiality requirements supplied",
    input.details.urgency === "urgent" && "Urgent delivery requested",
  ].filter((item): item is string => Boolean(item))
  return {
    advisoryOnly: true,
    suggestedCategory: input.details.serviceCategory || "Other / requires classification",
    complexity: signals >= 3 ? "high" : signals >= 1 ? "medium" : "low",
    recommendedAction: missingInformation.length >= 3 ? "request_more_information" : "review_scope",
    missingInformation,
    riskFlags,
  }
}
