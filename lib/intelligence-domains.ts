export const INTELLIGENCE_DOMAINS = [
  {
    id: "people",
    title: "People Intelligence",
    description: "Person-centric intelligence across identifiers, accounts and identity correlation.",
    capabilities: ["Email", "Phone", "Username", "Social", "Identity Resolution"],
    available: false,
  },
  {
    id: "company",
    title: "Company Intelligence",
    description: "Organizations, ownership, directors, filings, reputation and business relationships.",
    capabilities: ["Registration", "Directors", "Ownership", "Public Filings", "Corporate Relationships"],
    available: false,
  },
  {
    id: "domain",
    title: "Domain & Infrastructure Intelligence",
    description: "Technical infrastructure analysis powered by the existing SDIA engine.",
    capabilities: ["SDIA", "DNS", "IP", "ASN", "TLS", "Certificate Transparency", "Infrastructure Correlation"],
    available: true,
  },
  {
    id: "image",
    title: "Image Intelligence",
    description: "Metadata, visual analysis, authenticity indicators and visual relationships.",
    capabilities: ["Metadata", "Visual Analysis", "Reverse-image Workflow", "Authenticity Indicators"],
    available: false,
  },
  {
    id: "document",
    title: "Document Intelligence",
    description: "File metadata, extracted entities, authorship indicators, provenance and relationships.",
    capabilities: ["Metadata", "Entity Extraction", "Authorship Indicators", "Document Provenance"],
    available: false,
  },
  {
    id: "geo",
    title: "Geo Intelligence",
    description: "Coordinates, maps, imagery, landmarks, physical locations and geographic relationships.",
    capabilities: ["Coordinates", "Maps", "Imagery", "Landmarks", "Geographic Correlation"],
    available: false,
  },
  {
    id: "threat",
    title: "Threat Intelligence",
    description: "Threat actors, indicators, campaigns, vulnerabilities, infrastructure and TTPs.",
    capabilities: ["Indicators", "Threat Actors", "Campaigns", "Vulnerabilities", "TTPs"],
    available: false,
  },
  {
    id: "financial",
    title: "Financial / Business Intelligence",
    description: "Lawfully available ownership, asset, transaction, disclosure and due-diligence intelligence.",
    capabilities: ["Ownership Structures", "Corporate Disclosures", "Assets", "Commercial Exposure", "Due Diligence"],
    available: false,
  },
  {
    id: "case",
    title: "Case Intelligence",
    description: "The operational layer connecting every intelligence domain to cases, evidence, findings, timelines, relationships and reports.",
    capabilities: ["Investigation", "Evidence", "Findings", "Timeline", "Entity Graph", "Reports"],
    available: true,
  },
] as const

export type IntelligenceDomainId = typeof INTELLIGENCE_DOMAINS[number]["id"]
