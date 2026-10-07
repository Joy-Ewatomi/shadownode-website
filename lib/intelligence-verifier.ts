import net from "node:net"
import { domainToASCII } from "node:url"
import { hashesMatch, sha256Buffer } from "@/lib/evidence-integrity"

export const VERIFICATION_STATUSES = ["SUPPORTED", "SUPPORTED_AS_DERIVED", "LIMITED_SUPPORT", "INSUFFICIENT_EVIDENCE", "FAILED_VERIFICATION"] as const
export type IntelligenceVerificationStatus = typeof VERIFICATION_STATUSES[number]
export type VerificationClassification = "OBSERVED" | "DERIVED" | "UNCLASSIFIED"
export type SemanticSupport = "MATCH" | "MISMATCH" | "NOT_VERIFIABLE"
export type EvidenceCurrency = "CURRENT" | "STALE" | "UNKNOWN"
export type VerificationArtifact = { id: string; case_id: string; data: unknown; raw_content?: Buffer | null; recorded_sha256?: string | null; source?: string | null; source_type?: string | null; collected_at?: string | null; evidence_classification?: "observed" | "derived" | null; record_exists: boolean; content_available: boolean; integrity_error?: string | null }
export type VerificationClaim = { id: string; case_id: string; target_type: "entity" | "relationship"; entity_type?: string | null; value?: string | null; source_value?: string | null; source_entity_type?: string | null; target_value?: string | null; target_entity_type?: string | null; relationship_type?: string | null; evidence_classification?: "observed" | "derived" | null; handling_classification?: string | null; confidence_score?: number | null; stale_at?: string | null; artifact_ids: string[]; parent_claims?: VerificationClaim[] }
export type VerificationCheck = { check: string; passed: boolean; severity: "info" | "warning" | "error"; message: string; related_artifact_ids?: string[] }
export type IntelligenceVerificationResult = { status: IntelligenceVerificationStatus; classification: VerificationClassification; handling_classification: string | null; entity_or_relationship_id: string; target_type: "entity" | "relationship"; summary: string; checks: VerificationCheck[]; evidence_artifacts: string[]; parent_artifacts: string[]; integrity: { status: "VALID" | "INVALID" | "UNAVAILABLE"; valid: boolean; checked: number; failed: number; unavailable: number }; semantic_support: SemanticSupport; provenance: { status: "VALID" | "LIMITED" | "MISSING"; valid: boolean; sources: string[] }; currency: EvidenceCurrency; confidence: { score: number | null; label: "HIGH" | "MEDIUM" | "LOW" | "UNSCORED"; contextual_only: true }; collection_timestamps: string[]; source_information: string[]; conclusion: string; limitations: string[] }

type Json = Record<string, unknown>
type SemanticResult = { support: SemanticSupport; adapter: string; message: string }
const object = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Json : null
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null
const values = (value: unknown) => Array.isArray(value) ? value.map(text).filter(Boolean) as string[] : text(value) ? [text(value)!] : []

export function normalizeHostname(value: unknown, preserveWildcard = false) {
  const original = text(value)?.toLowerCase().replace(/\.$/, "")
  if (!original) return null
  const wildcard = original.startsWith("*.")
  const ascii = domainToASCII(wildcard ? original.slice(2) : original)
  if (!ascii || ascii.length > 253 || !ascii.includes(".")) return null
  if (ascii.split(".").some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) return null
  return wildcard && preserveWildcard ? `*.${ascii}` : ascii
}
export const normalizeDomain = normalizeHostname
export function normalizeIp(value: unknown) {
  const input = text(value)
  if (!input || !net.isIP(input)) return null
  if (net.isIP(input) === 4) return input.split(".").map((part) => String(Number(part))).join(".")
  try { return new URL(`http://[${input}]/`).hostname.slice(1, -1).toLowerCase() } catch { return null }
}

function candidateObjects(data: unknown) {
  const root = object(data)
  if (!root) return []
  return [root, root.dns, root.observation, root.result, root.attributes].map(object).filter(Boolean) as Json[]
}
function dnsObservation(item: Json) {
  const domain = normalizeHostname(item.domain ?? item.hostname ?? item.query ?? item.name)
  const ips = new Set<string>()
  for (const key of ["a", "aaaa", "addresses", "ips", "ip_addresses"]) for (const value of values(item[key])) { const ip = normalizeIp(value); if (ip) ips.add(ip) }
  for (const raw of [...(Array.isArray(item.answers) ? item.answers : []), ...(Array.isArray(item.records) ? item.records : [])]) {
    const record = object(raw)
    if (!record || !["a", "aaaa"].includes(String(record.type || record.record_type || "").toLowerCase())) continue
    const ip = normalizeIp(record.value ?? record.data ?? record.address)
    if (ip) ips.add(ip)
  }
  return domain && ips.size ? { domain, ips } : null
}
function graphObservation(data: unknown) {
  const item = object(data), relationship = object(item?.relationship), source = object(item?.source_entity), target = object(item?.target_entity)
  if (!relationship || !source || !target) return null
  return { type: text(relationship.relationship_type ?? relationship.type), source: text(source.value ?? source.name ?? source.display_name), target: text(target.value ?? target.name ?? target.display_name) }
}

function semanticForArtifact(claim: VerificationClaim, artifact: VerificationArtifact): SemanticResult {
  if (!artifact.content_available) return { support: "NOT_VERIFIABLE", adapter: "storage", message: "Artifact content is unavailable." }
  const relationship = String(claim.relationship_type || "").toLowerCase()
  if (claim.target_type === "relationship" && relationship === "resolves_to") {
    const domain = normalizeHostname(claim.source_value), ip = normalizeIp(claim.target_value)
    if (!domain || !ip) return { support: "MISMATCH", adapter: "dns", message: "Graph endpoints are not a valid domain-to-IP pair." }
    const candidates = candidateObjects(artifact.data)
    if (candidates.some((item) => { const observation = dnsObservation(item); return observation?.domain === domain && observation.ips.has(ip) })) return { support: "MATCH", adapter: "dns", message: `One DNS observation records ${ip} for ${domain}.` }
    const graph = graphObservation(artifact.data)
    if (graph?.type === "resolves_to" && normalizeHostname(graph.source) === domain && normalizeIp(graph.target) === ip) return { support: "MATCH", adapter: "sdia-graph", message: "The structured SDIA graph observation records the exact domain-to-IP relationship." }
    const recognized = candidates.some((item) => ["domain", "hostname", "query", "a", "aaaa", "addresses", "answers", "records"].some((key) => key in item))
    return recognized ? { support: "MISMATCH", adapter: "dns", message: "No coherent DNS observation contains the exact normalized domain and IP." } : { support: "NOT_VERIFIABLE", adapter: "dns", message: "Artifact does not contain a recognized structured DNS observation." }
  }
  if (claim.target_type === "relationship" && ["has_ct_hostname", "certificate_for", "has_san", "issued_for"].includes(relationship)) {
    const expected = normalizeHostname(claim.target_value, true) || normalizeHostname(claim.source_value, true)
    const names = candidateObjects(artifact.data).flatMap((item) => ["hostnames", "dns_names", "san", "sans", "subject_alt_names"].flatMap((key) => values(item[key]))).map((item) => normalizeHostname(item, true)).filter(Boolean)
    return expected && names.includes(expected) ? { support: "MATCH", adapter: "ct-certificate", message: "The normalized hostname is in the structured CT/certificate hostname collection." } : { support: "MISMATCH", adapter: "ct-certificate", message: "The structured CT/certificate hostname collection does not contain the claim." }
  }
  if (claim.target_type === "relationship" && ["belongs_to_asn", "announced_by", "registered_to_asn"].includes(relationship)) {
    const ip = normalizeIp(claim.source_value), asn = String(claim.target_value || "").toUpperCase().replace(/^AS/, "")
    const matched = candidateObjects(artifact.data).some((item) => normalizeIp(item.ip ?? item.address ?? item.ip_address) === ip && String(item.asn ?? item.as_number ?? item.autonomous_system_number ?? "").toUpperCase().replace(/^AS/, "") === asn)
    return matched ? { support: "MATCH", adapter: "asn-network", message: "The structured network observation associates the exact IP with the ASN." } : { support: "MISMATCH", adapter: "asn-network", message: "No structured observation contains the exact IP-to-ASN association." }
  }
  if (claim.target_type === "entity") {
    const type = String(claim.entity_type || "").toUpperCase()
    if (type === "IP_ADDRESS") {
      const expected = normalizeIp(claim.value)
      const matched = candidateObjects(artifact.data).some((item) => dnsObservation(item)?.ips.has(expected || "") || normalizeIp(item.ip ?? item.address ?? item.ip_address) === expected)
      return matched ? { support: "MATCH", adapter: "ip", message: "The exact normalized IP occurs in structured network evidence." } : { support: "MISMATCH", adapter: "ip", message: "Structured network evidence does not contain the exact IP." }
    }
    if (["DOMAIN", "SUBDOMAIN", "HOSTNAME"].includes(type)) {
      const expected = normalizeHostname(claim.value)
      const matched = candidateObjects(artifact.data).some((item) => dnsObservation(item)?.domain === expected || normalizeHostname(item.domain ?? item.hostname ?? item.name) === expected)
      return matched ? { support: "MATCH", adapter: "hostname", message: "The exact normalized hostname occurs in structured evidence." } : { support: "MISMATCH", adapter: "hostname", message: "Structured evidence does not contain the exact hostname." }
    }
  }
  return { support: "NOT_VERIFIABLE", adapter: "unsupported", message: "Artifact type does not have a semantic verification adapter for this graph claim." }
}

const confidenceLabel = (score: number | null | undefined) => score == null || !Number.isFinite(score) ? "UNSCORED" as const : score >= 75 ? "HIGH" as const : score >= 45 ? "MEDIUM" as const : "LOW" as const
const hostType = (value: string | null | undefined) => ["DOMAIN", "SUBDOMAIN", "HOSTNAME"].includes(String(value || "").toUpperCase())
function derivationMatches(claim: VerificationClaim, parents: VerificationClaim[]) {
  if (claim.relationship_type !== "shares_observed_ip_with" || parents.length !== 2 || !hostType(claim.source_entity_type) || !hostType(claim.target_entity_type)) return false
  if (!parents.every((parent) => parent.relationship_type === "resolves_to" && hostType(parent.source_entity_type) && String(parent.target_entity_type || "").toUpperCase() === "IP_ADDRESS")) return false
  const ips = parents.map((parent) => normalizeIp(parent.target_value)), endpoints = new Set(parents.map((parent) => normalizeHostname(parent.source_value)))
  return Boolean(ips[0] && ips[0] === ips[1] && endpoints.size === 2 && endpoints.has(normalizeHostname(claim.source_value)) && endpoints.has(normalizeHostname(claim.target_value)))
}

export function verifyIntelligenceClaim(claim: VerificationClaim, allArtifacts: VerificationArtifact[]): IntelligenceVerificationResult {
  const checks: VerificationCheck[] = []
  const referenced = claim.artifact_ids.map((id) => allArtifacts.find((artifact) => artifact.id === id && artifact.case_id === claim.case_id)).filter(Boolean) as VerificationArtifact[]
  const missing = claim.artifact_ids.filter((id) => !referenced.some((artifact) => artifact.id === id))
  checks.push({ check: "evidence_reference_exists", passed: claim.artifact_ids.length > 0, severity: claim.artifact_ids.length ? "info" : "warning", message: claim.artifact_ids.length ? `${claim.artifact_ids.length} evidence reference(s) recorded.` : "No direct evidence reference is attached." })
  const available = !missing.length && referenced.every((item) => item.record_exists && item.content_available)
  checks.push({ check: "artifact_content_available", passed: available, severity: available ? "info" : "error", message: available ? "All referenced artifact records and content are available." : "One or more artifact records or stored bodies are unavailable.", related_artifact_ids: claim.artifact_ids })
  let checked = 0, failed = 0, unavailable = 0
  for (const artifact of referenced) {
    if (artifact.integrity_error) { failed++; continue }
    if (!artifact.content_available || !artifact.recorded_sha256 || !artifact.raw_content) { unavailable++; continue }
    checked++
    if (!hashesMatch(artifact.recorded_sha256, sha256Buffer(artifact.raw_content))) failed++
  }
  const integrityStatus = failed ? "INVALID" : checked > 0 && unavailable === 0 ? "VALID" : "UNAVAILABLE"
  checks.push({ check: "artifact_hash_valid", passed: integrityStatus === "VALID", severity: integrityStatus === "INVALID" ? "error" : integrityStatus === "VALID" ? "info" : "warning", message: integrityStatus === "INVALID" ? "One or more integrity checks failed." : integrityStatus === "VALID" ? "Every artifact matches its recorded SHA-256." : "Integrity is unavailable for one or more artifacts." })
  const sources = [...new Set(referenced.map((item) => item.source).filter(Boolean) as string[])].sort(), timestamps = [...new Set(referenced.map((item) => item.collected_at).filter(Boolean) as string[])].sort()
  const provenanceStatus = !sources.length ? "MISSING" : !timestamps.length ? "LIMITED" : "VALID"
  checks.push({ check: "artifact_provenance_valid", passed: provenanceStatus === "VALID", severity: provenanceStatus === "MISSING" ? "error" : provenanceStatus === "LIMITED" ? "warning" : "info", message: provenanceStatus === "VALID" ? "Authoritative source and observation time are present." : provenanceStatus === "LIMITED" ? "Source is present, but observation time is unavailable." : "No authoritative intelligence source is linked." })
  const derived = claim.evidence_classification === "derived", classification: VerificationClassification = derived ? "DERIVED" : referenced.length ? "OBSERVED" : "UNCLASSIFIED"
  const classificationConsistent = derived ? claim.target_type === "relationship" && claim.relationship_type === "shares_observed_ip_with" : true
  const parentResults = (claim.parent_claims || []).map((parent) => verifyIntelligenceClaim(parent, allArtifacts)), parentValid = !derived || parentResults.length === 2 && parentResults.every((result) => result.status === "SUPPORTED")
  const semanticResults = derived ? [] : referenced.map((artifact) => semanticForArtifact(claim, artifact))
  const semanticSupport: SemanticSupport = derived ? parentValid && derivationMatches(claim, claim.parent_claims || []) ? "MATCH" : "MISMATCH" : semanticResults.some((item) => item.support === "MATCH") ? "MATCH" : semanticResults.some((item) => item.support === "MISMATCH") ? "MISMATCH" : "NOT_VERIFIABLE"
  checks.push({ check: "evidence_semantically_matches", passed: semanticSupport === "MATCH", severity: semanticSupport === "MISMATCH" ? "error" : semanticSupport === "MATCH" ? "info" : "warning", message: semanticSupport === "MATCH" ? derived ? "Independent parent observations establish the shared-IP derivation." : semanticResults.find((item) => item.support === "MATCH")?.message || "Structured evidence supports the claim." : semanticSupport === "MISMATCH" ? "Structured evidence does not establish the exact graph claim." : "No safe semantic adapter is available." })
  if (derived) checks.push({ check: "parent_evidence_valid", passed: parentValid, severity: parentValid ? "info" : "error", message: parentValid ? "One independently supported parent exists for each endpoint." : "Both required parents are not independently supported." }, { check: "derivation_supported", passed: semanticSupport === "MATCH", severity: semanticSupport === "MATCH" ? "info" : "error", message: semanticSupport === "MATCH" ? "Both endpoints resolve to the same normalized IP." : "The shared-IP rule cannot be reproduced." })
  const currency: EvidenceCurrency = claim.stale_at ? new Date(claim.stale_at).getTime() <= Date.now() ? "STALE" : "CURRENT" : "UNKNOWN"
  const total = derived ? parentResults.reduce((sum, item) => ({ checked: sum.checked + item.integrity.checked, failed: sum.failed + item.integrity.failed, unavailable: sum.unavailable + item.integrity.unavailable }), { checked: 0, failed: 0, unavailable: 0 }) : { checked, failed, unavailable }
  const effectiveIntegrity = derived ? parentResults.some((item) => item.integrity.status === "INVALID") ? "INVALID" : parentResults.length === 2 && parentResults.every((item) => item.integrity.status === "VALID") ? "VALID" : "UNAVAILABLE" : integrityStatus
  const effectiveProvenance = derived ? parentResults.some((item) => item.provenance.status === "MISSING") ? "MISSING" : parentResults.length === 2 && parentResults.every((item) => item.provenance.status === "VALID") ? "VALID" : "LIMITED" : provenanceStatus
  const status: IntelligenceVerificationStatus = effectiveIntegrity === "INVALID" || semanticSupport === "MISMATCH" || !classificationConsistent || derived && !parentValid ? "FAILED_VERIFICATION" : derived ? parentResults.length !== 2 ? "INSUFFICIENT_EVIDENCE" : effectiveIntegrity !== "VALID" || effectiveProvenance !== "VALID" ? "LIMITED_SUPPORT" : "SUPPORTED_AS_DERIVED" : !referenced.length || missing.length || !available || semanticSupport === "NOT_VERIFIABLE" ? "INSUFFICIENT_EVIDENCE" : effectiveIntegrity !== "VALID" || effectiveProvenance !== "VALID" ? "LIMITED_SUPPORT" : "SUPPORTED"
  const limitations = claim.target_type === "relationship" ? ["Does not establish ownership.", "Does not establish administrative control.", "Does not establish organizational affiliation.", "Does not establish permanent association.", "Does not establish legal admissibility."] : ["Supports only the entity observed in the referenced evidence.", "Does not establish ownership, control, attribution, or legal admissibility."]
  const conclusion = status === "SUPPORTED" ? `${semanticResults.find((item) => item.support === "MATCH")?.message || "The exact graph item was observed."} This is a point-in-time observation.` : status === "SUPPORTED_AS_DERIVED" ? "Two independently supported DNS observations associate the endpoints with the same observed IP." : status === "LIMITED_SUPPORT" ? "Structured evidence supports the claim, but integrity or authoritative provenance is incomplete." : status === "FAILED_VERIFICATION" ? "Stored evidence fails an integrity, semantic, classification, or derivation requirement." : "Stored evidence cannot safely establish this graph claim."
  const derivedSources = derived ? [...new Set(parentResults.flatMap((item) => item.source_information))].sort() : sources, derivedTimes = derived ? [...new Set(parentResults.flatMap((item) => item.collection_timestamps))].sort() : timestamps
  return { status, classification, handling_classification: claim.handling_classification || null, entity_or_relationship_id: claim.id, target_type: claim.target_type, summary: conclusion, checks, evidence_artifacts: referenced.map((item) => item.id), parent_artifacts: parentResults.flatMap((item) => [...item.evidence_artifacts, ...item.parent_artifacts]), integrity: { status: effectiveIntegrity, valid: effectiveIntegrity === "VALID", ...total }, semantic_support: semanticSupport, provenance: { status: effectiveProvenance, valid: effectiveProvenance === "VALID", sources: derivedSources }, currency, confidence: { score: claim.confidence_score ?? null, label: confidenceLabel(claim.confidence_score), contextual_only: true }, collection_timestamps: derivedTimes, source_information: derivedSources, conclusion, limitations }
}
