import assert from "node:assert/strict"
import fs from "node:fs"
import ts from "typescript"

const source = fs.readFileSync("lib/sdia-evidence-bridge.ts", "utf8")
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const module = { exports: {} }
new Function("module", "exports", output)(module, module.exports)
const bridge = module.exports

const report = {
  schema_version: "1.0",
  tool: "ShadowNode Domain Intelligence Analyzer",
  tool_version: "0.1.0",
  investigation: { domain: "example.com", run_id: "run-1" },
  evidence: [{
    artifact_id: "artifact-rdap",
    artifact_type: "rdap_source_response",
    source: "RDAP registry",
    collected_at: "2026-10-16T00:00:00Z",
    sha256: "a".repeat(64),
    collector: "RDAP Collector",
    collector_version: "1.0",
    classification: "observed",
    parent_artifacts: [],
    context: { role: "rdap_source_response" },
    data: { body_base64: "c2VjcmV0", body_sha256: "b".repeat(64), body_length: 6, nested: { response_body: "secret-nested-body" } },
  }],
  evidence_manifest: { artifact_count: 1 },
  entities: [{ entity_id: "domain:example.com", evidence_artifacts: ["artifact-rdap", "missing-entity"] }],
  relationships: [{ relationship_id: "relationship:r1", evidence_artifacts: ["artifact-rdap", "missing-relationship"] }],
  findings: [{ finding_id: "finding:f1", evidence_artifacts: ["artifact-rdap", "missing-finding"] }],
}
const storedPayload = { status: "completed", domain: "example.com", result: report }

const indexed = bridge.sdiaArtifactIndex(report)
assert.equal(indexed.length, 1)
assert.equal(indexed[0].payload_locator, "result.evidence[0]")
assert.equal(bridge.resolveSdiaPayloadLocator(storedPayload, indexed[0].payload_locator).artifact_id, "artifact-rdap")
assert.equal(indexed[0].sha256, "a".repeat(64))
assert.equal("data" in indexed[0], false)
assert.equal(JSON.stringify(indexed).includes("c2VjcmV0"), false)
assert.deepEqual(bridge.sdiaMissingArtifactIds(["artifact-rdap", "missing"], indexed), ["missing"])

assert.deepEqual(bridge.sdiaEvidenceArtifactIds(report.entities[0]), ["artifact-rdap", "missing-entity"])
assert.deepEqual(bridge.sdiaEvidenceArtifactIds(report.relationships[0]), ["artifact-rdap", "missing-relationship"])
assert.deepEqual(bridge.sdiaEvidenceArtifactIds(report.findings[0]), ["artifact-rdap", "missing-finding"])
assert.deepEqual(bridge.sdiaEvidenceArtifactIds({ evidence_artifact_ids: ["artifact-rdap"] }), ["artifact-rdap"])

const redacted = bridge.redactSdiaResultForClient(storedPayload)
const redactedData = redacted.result.evidence[0].data
assert.equal(redacted.result.evidence[0].artifact_id, "artifact-rdap")
assert.equal(redacted.result.evidence[0].sha256, "a".repeat(64))
assert.equal(redactedData.body_base64, undefined)
assert.equal(redactedData.response_body, undefined)
assert.equal(redactedData.body_sha256, "b".repeat(64))
assert.equal(JSON.stringify(redacted).includes("c2VjcmV0"), false)
assert.equal(JSON.stringify(redacted).includes("secret-nested-body"), false)

const metadata = bridge.sdiaReportMetadata(report)
assert.equal(metadata.producer_authenticity, "not_established")
assert.equal(metadata.evidence_contract_version, null)
assert.equal(metadata.verification.status, "unavailable")

assert.equal(bridge.sdiaVerificationState({ migration_available: false }), "MIGRATION_UNAVAILABLE")
assert.equal(bridge.sdiaVerificationState({ migration_available: true, bridge_record_available: false }), "BRIDGE_RECORD_UNAVAILABLE")
assert.equal(bridge.sdiaVerificationState({ migration_available: true, bridge_record_available: true, missing_artifact_ids: ["missing"] }), "MISSING_EVIDENCE_REFERENCES")
assert.equal(bridge.sdiaVerificationState({ migration_available: true, bridge_record_available: true, report: { ...metadata, verification: { status: "verified" } } }), "CANONICAL_VERIFICATION_COMPLETED")
assert.equal(bridge.sdiaVerificationState({ migration_available: true, bridge_record_available: true, report: metadata }), "CANONICAL_VERIFIER_UNAVAILABLE")

const baseContext = {
  report_id: "job-1",
  source_record_id: "relationship:r1",
  evidence_artifact_ids: ["artifact-rdap", "missing"],
  missing_artifact_ids: ["missing"],
  artifacts: indexed,
  report: metadata,
  migration_available: true,
  bridge_record_available: true,
}
const unclassified = bridge.sdiaUnavailableVerification({
  id: "graph-1",
  case_id: "case-1",
  target_type: "relationship",
  classification: "confidential",
  confidence_score: 85,
  stale_at: null,
}, baseContext)
assert.equal(unclassified.status, "INSUFFICIENT_EVIDENCE")
assert.equal(unclassified.verification_availability, "UNAVAILABLE")
assert.equal(unclassified.sdia_verification_state, "MISSING_EVIDENCE_REFERENCES")
assert.equal(unclassified.classification, "UNCLASSIFIED")
assert.equal(unclassified.integrity.status, "UNAVAILABLE")
assert.equal(unclassified.producer_authenticity, "not_established")
assert.deepEqual(unclassified.evidence_artifacts, ["artifact-rdap", "missing"])

const observed = bridge.sdiaUnavailableVerification({
  id: "graph-1",
  case_id: "case-1",
  target_type: "relationship",
  classification: "confidential",
  confidence_score: 85,
  stale_at: null,
}, { ...baseContext, source_classification: "observed", missing_artifact_ids: [] })
assert.equal(observed.classification, "OBSERVED")

console.log("SDIA evidence bridge tests passed.")
