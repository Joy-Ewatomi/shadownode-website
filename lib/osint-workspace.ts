export const VERIFICATION_STATES = [
  "unreviewed",
  "candidate",
  "partially_verified",
  "verified",
  "disputed",
  "disproved",
  "stale",
] as const

export type VerificationState =
  (typeof VERIFICATION_STATES)[number]

export const RELATIONSHIP_TYPES = [
  "uses",
  "owns",
  "controls",
  "registered_to",
  "works_for",
  "director_of",
  "contacted",
  "communicates_with",
  "resides_at",
  "located_at",
  "resolves_to",
  "hosted_by",
  "linked_to",
  "member_of",
  "transferred_to",
  "mentioned_in",
  "appears_in",
  "created_by",
  "derived_from",
  "same_as",
  "possibly_same_as",
] as const

export type OsintRelationshipType =
  (typeof RELATIONSHIP_TYPES)[number]

export type EntityPaletteItem = {
  type: string
  label: string
  category: string
  icon: string
  color: string
  clientVisibleAllowed: boolean
  sensitive?: boolean
}

const paletteCategories = [
  {
    category: "Identity",
    icon: "user",
    color: "#20dc73",
    items: [
      "Person",
      "Alias",
      "Username",
      "Email",
      "Phone",
      "VOIP number",
      "Social-media account",
      "Messaging account",
      "Forum account",
      "Gaming account",
      "Photograph",
      "Date of birth",
      "Age",
    ],
  },
  {
    category: "Infrastructure",
    icon: "globe",
    color: "#38bdf8",
    items: [
      "Domain",
      "Subdomain",
      "URL",
      "IP address",
      "Server",
      "ASN",
      "DNS record",
      "SSL certificate",
      "Hosting provider",
      "Network range",
    ],
  },
  {
    category: "Organizations",
    icon: "building",
    color: "#f8c14a",
    items: [
      "Company",
      "Organization",
      "Employee",
      "Director",
      "Business-registration record",
      "Brand",
      "Vendor",
    ],
  },
  {
    category: "Locations",
    icon: "map",
    color: "#fb7185",
    items: [
      "Country",
      "State",
      "City",
      "Address",
      "Coordinates",
      "Property",
      "Landmark",
    ],
  },
  {
    category: "Assets and finance",
    icon: "wallet",
    color: "#a78bfa",
    items: [
      "Cryptocurrency wallet",
      "Transaction",
      "Bank account, restricted",
      "Vehicle",
      "Vessel",
      "Aircraft",
      "Device",
    ],
  },
  {
    category: "Evidence and research",
    icon: "file",
    color: "#f97316",
    items: [
      "Document",
      "Image",
      "Video",
      "Audio",
      "File hash",
      "Metadata record",
      "Archive",
      "Source URL",
      "Observation",
      "Lead",
      "Hypothesis",
      "Finding",
      "Evidence",
      "Event",
      "Risk",
      "Unknown entity",
    ],
  },
]

function toEntityType(label: string) {
  return label
    .replace(/,/g, "")
    .replace(/-/g, " ")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
}

export const ENTITY_PALETTE: EntityPaletteItem[] =
  paletteCategories.flatMap((group) =>
    group.items.map((label) => ({
      type: toEntityType(label),
      label,
      category: group.category,
      icon: group.icon,
      color: group.color,
      clientVisibleAllowed:
        label !== "Bank account, restricted",
      sensitive:
        label === "Bank account, restricted",
    })),
  )

export type NormalizedOsintResult = {
  id: string
  title: string
  entity_type: string
  value: string
  description: string
  provider: string
  transform: string
  source_url: string | null
  confidence: number
  verification_status: VerificationState
  retrieved_at: string
  safe_snapshot: Record<string, unknown>
  terms_classification: string
}

export type OsintSearchInput = {
  caseId: string
  queryEntityId?: string | null
  queryValue: string
  queryType: string
  sourceUrl?: string | null
  notes?: string | null
}

export type OsintProviderConnector = {
  id: string
  label: string
  configured: boolean
  termsClassification: string
  search: (
    input: OsintSearchInput,
  ) => Promise<NormalizedOsintResult[]>
}

export type OsintTransform = {
  id: string
  label: string
  inputTypes: string[]
  outputTypes: string[]
  provider: string
  configured: boolean
  status: string
  estimatedCost: string
}

export const OSINT_TRANSFORMS: OsintTransform[] = [
  {
    id: "manual_open_source_review",
    label: "Manual open-source review",
    inputTypes: ["ANY"],
    outputTypes: ["SOURCE_URL", "LEAD", "FINDING"],
    provider: "manual",
    configured: true,
    status: "Available",
    estimatedCost: "No provider cost",
  },
  {
    id: "configured_provider_lookup",
    label: "Configured provider lookup",
    inputTypes: ["ANY"],
    outputTypes: ["UNKNOWN_ENTITY"],
    provider: "configured_provider",
    configured: false,
    status: "Requires approved provider credentials",
    estimatedCost: "Provider dependent",
  },
]

export function normalizeVerificationStatus(
  value: unknown,
): VerificationState {
  const text = String(value || "")
    .trim()
    .toLowerCase()

  if (
    text === "confirmed" ||
    text === "verified"
  ) {
    return "verified"
  }

  if (
    text === "unverified" ||
    text === "pending" ||
    text === "unreviewed"
  ) {
    return "unreviewed"
  }

  return VERIFICATION_STATES.includes(
    text as VerificationState,
  )
    ? (text as VerificationState)
    : "unreviewed"
}

export function normalizeConfidence(
  value: unknown,
) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.min(
    100,
    Math.max(0, Math.round(numeric)),
  )
}

export function normalizeEntityType(
  value: unknown,
) {
  const normalized = String(
    value || "UNKNOWN_ENTITY",
  )
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")

  return normalized || "UNKNOWN_ENTITY"
}
