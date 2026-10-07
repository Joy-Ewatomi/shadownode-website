import assert from "node:assert/strict"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import ts from "typescript"

const root = process.cwd()
const integritySource = fs.readFileSync(path.join(root, "lib/evidence-integrity.ts"), "utf8")
const verifierSource = fs.readFileSync(path.join(root, "lib/intelligence-verifier.ts"), "utf8")
  .replace('import { hashesMatch, sha256Buffer } from "@/lib/evidence-integrity"', "")
const output = ts.transpileModule(`${integritySource}\n${verifierSource}`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText
const module = { exports: {} }
new Function("require", "module", "exports", output)(createRequire(import.meta.url), module, module.exports)
const { verifyIntelligenceClaim } = module.exports

const raw = (data) => JSON.stringify(data)
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex")
const artifact = (id, data, options = {}) => {
  const content = raw(data)
  return { id, case_id: options.case_id || "case-a", data, raw_content: Buffer.from(content), recorded_sha256: options.hash || digest(content), source: options.source === undefined ? "DNS resolver" : options.source, source_type: "dns", collected_at: options.collected_at === undefined ? "2026-10-06T00:00:00.000Z" : options.collected_at, evidence_classification: "observed", record_exists: true, content_available: options.content_available ?? true, integrity_error: options.integrity_error || null }
}
const relationship = (overrides = {}) => ({ id: "rel-1", case_id: "case-a", target_type: "relationship", source_value: "chatgpt.com", source_entity_type: "DOMAIN", target_value: "172.64.155.209", target_entity_type: "IP_ADDRESS", relationship_type: "resolves_to", evidence_classification: "observed", confidence_score: 85, artifact_ids: ["dns-1"], ...overrides })
const entity = (overrides = {}) => ({ id: "entity-1", case_id: "case-a", target_type: "entity", entity_type: "IP_ADDRESS", value: "172.64.155.209", evidence_classification: "observed", confidence_score: 85, artifact_ids: ["dns-1"], ...overrides })
const dns = artifact("dns-1", { type: "dns_observation", domain: "chatgpt.com", addresses: ["172.64.155.209"] })

const tests = [
  ["valid observed DNS relationship", () => assert.equal(verifyIntelligenceClaim(relationship(), [dns]).status, "SUPPORTED")],
  ["DNS semantic mismatch", () => assert.equal(verifyIntelligenceClaim(relationship({ target_value: "1.2.3.4" }), [dns]).status, "FAILED_VERIFICATION")],
  ["missing evidence artifact", () => assert.equal(verifyIntelligenceClaim(relationship({ artifact_ids: ["missing"] }), []).status, "INSUFFICIENT_EVIDENCE")],
  ["invalid artifact hash", () => assert.equal(verifyIntelligenceClaim(relationship(), [artifact("dns-1", dns.data, { hash: "0".repeat(64) })]).status, "FAILED_VERIFICATION")],
  ["valid derived shared-IP relationship", () => {
    const second = artifact("dns-2", { type: "dns_observation", domain: "api.chatgpt.com", addresses: ["172.64.155.209"] })
    const parents = [relationship(), relationship({ id: "rel-2", source_value: "api.chatgpt.com", artifact_ids: ["dns-2"] })]
    const claim = relationship({ id: "derived-1", source_value: "chatgpt.com", source_entity_type: "DOMAIN", target_value: "api.chatgpt.com", target_entity_type: "SUBDOMAIN", relationship_type: "shares_observed_ip_with", evidence_classification: "derived", artifact_ids: [], parent_claims: parents })
    assert.equal(verifyIntelligenceClaim(claim, [dns, second]).status, "SUPPORTED_AS_DERIVED")
  }],
  ["invalid derived relationship", () => {
    const parents = [relationship(), relationship({ id: "rel-2", source_value: "api.chatgpt.com", artifact_ids: ["missing"] })]
    const claim = relationship({ id: "derived-2", source_value: "chatgpt.com", source_entity_type: "DOMAIN", target_value: "api.chatgpt.com", target_entity_type: "SUBDOMAIN", relationship_type: "shares_observed_ip_with", evidence_classification: "derived", artifact_ids: [], parent_claims: parents })
    assert.equal(verifyIntelligenceClaim(claim, [dns]).status, "FAILED_VERIFICATION")
  }],
  ["case isolation", () => assert.equal(verifyIntelligenceClaim(relationship(), [{ ...dns, case_id: "case-b" }]).status, "INSUFFICIENT_EVIDENCE")],
  ["missing timestamp and source", () => assert.equal(verifyIntelligenceClaim(relationship(), [artifact("dns-1", dns.data, { source: null, collected_at: null })]).status, "LIMITED_SUPPORT")],
  ["entity verification", () => assert.equal(verifyIntelligenceClaim(entity(), [dns]).status, "SUPPORTED")],
  ["ownership overclaim protection", () => {
    const claim = relationship({ source_value: "172.64.155.209", target_value: "Example Org", relationship_type: "owned_by" })
    const evidence = artifact("dns-1", { type: "dns_observation", domain: "chatgpt.com", addresses: ["172.64.155.209"], note: "Example Org owns this IP" })
    assert.equal(verifyIntelligenceClaim(claim, [evidence]).status, "INSUFFICIENT_EVIDENCE")
  }],
  ["storage download failure", () => assert.equal(verifyIntelligenceClaim(relationship(), [{ ...dns, content_available: false, raw_content: null }]).status, "INSUFFICIENT_EVIDENCE")],
  ["stale intact evidence", () => { const result = verifyIntelligenceClaim(relationship({ stale_at: "2020-01-01T00:00:00Z" }), [dns]); assert.equal(result.status, "SUPPORTED"); assert.equal(result.currency, "STALE") }],
  ["trailing dot and IPv6 normalization", () => {
    const data = { domain: "EXAMPLE.COM.", aaaa: ["2001:0db8:0:0:0:0:0:1"] }
    const item = artifact("dns-v6", data)
    assert.equal(verifyIntelligenceClaim(relationship({ source_value: "example.com", target_value: "2001:db8::1", artifact_ids: ["dns-v6"] }), [item]).status, "SUPPORTED")
  }],
  ["unknown schema fails closed", () => assert.equal(verifyIntelligenceClaim(relationship(), [artifact("dns-1", { note: "chatgpt.com resolves to 172.64.155.209" })]).status, "INSUFFICIENT_EVIDENCE")],
  ["SDIA without canonical contract fails", () => assert.equal(verifyIntelligenceClaim(relationship(), [{ ...dns, integrity_error: "canonical contract unavailable" }]).status, "FAILED_VERIFICATION")],
]

for (const [name, test] of tests) {
  test()
  console.log(`PASS ${name}`)
}
console.log(`\n${tests.length} intelligence verifier tests passed.`)
