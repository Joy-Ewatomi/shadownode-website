import assert from "node:assert/strict"
import crypto from "node:crypto"
import fs from "node:fs"
import { createRequire } from "node:module"
import ts from "typescript"

if (process.env.NODE_ENV !== "test" || process.env.VERIFIER_TEST_MODE !== "isolated") throw new Error("Refusing to run outside the explicit isolated test environment.")
for (const key of ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING", "SUPABASE_DB_URL", "SUPABASE_POSTGRES_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (process.env[key]) throw new Error(`Refusing to run while ${key} is configured.`)
}
globalThis.fetch = async () => { throw new Error("External network access is forbidden in verifier integration tests.") }

const require = createRequire(import.meta.url)
function compile(source, mocks = {}) {
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  const mockedRequire = (id) => id in mocks ? mocks[id] : require(id)
  new Function("require", "module", "exports", output)(mockedRequire, module, module.exports)
  return module.exports
}
const integritySource = fs.readFileSync("lib/evidence-integrity.ts", "utf8")
const verifierSource = fs.readFileSync("lib/intelligence-verifier.ts", "utf8").replace('import { hashesMatch, sha256Buffer } from "@/lib/evidence-integrity"', "")
const verifier = compile(`${integritySource}\n${verifierSource}`)

const CASE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const CASE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const JOB_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const dnsBytes = (domain, ip) => Buffer.from(JSON.stringify({ type: "dns_observation", domain, addresses: [ip] }))
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex")

function baseState() {
  const bytes = dnsBytes("chatgpt.com", "172.64.155.209")
  return {
    access: "authorized",
    entities: [
      { id: "domain-a", case_id: CASE_A, entity_type: "DOMAIN", value: "chatgpt.com", name: "chatgpt.com", classification: "confidential", confidence_score: 85, source_reference: null, stale_at: null },
      { id: "ip-a", case_id: CASE_A, entity_type: "IP_ADDRESS", value: "172.64.155.209", name: "172.64.155.209", classification: "confidential", confidence_score: 85, source_reference: null, stale_at: null },
    ],
    relationships: [{ id: "rel-a", case_id: CASE_A, source_entity_id: "domain-a", target_entity_id: "ip-a", relationship_type: "resolves_to", confidence_score: 85, source_reference: null, created_at: "2026-01-01T00:00:00Z" }],
    evidence: [{ id: "ev-a", case_id: CASE_A, file_name: "dns.json", file_type: "application/json", file_hash: sha256(bytes), storage_path: "case-a/dns.json", evidence_type: "dns", description: null, created_at: "2026-01-01T00:00:00Z" }],
    evidenceLinks: [{ target_type: "relationship", target_id: "rel-a", evidence_id: "ev-a" }],
    sources: [{ id: "src-a", case_id: CASE_A, title: "Test DNS collector", source_type: "dns", collected_at: "2026-01-01T00:00:00Z" }],
    sourceLinks: [{ target_type: "relationship", target_id: "rel-a", source_id: "src-a" }],
    storage: new Map([["case-a/dns.json", bytes]]), storageErrors: new Set(), jobs: [],
  }
}
let state = baseState()

function entity(id) { return state.entities.find((item) => item.id === id) }
async function query(sql, params = []) {
  const compact = sql.replace(/\s+/g, " ").trim()
  if (compact.includes("FROM investigation_entities ie WHERE ie.id=$1")) {
    const item = state.entities.find((row) => row.id === params[0] && row.case_id === params[1])
    return { rows: item ? [{ ...item, target_type: "entity", source_value: null, target_value: null, relationship_type: null, source_entity_id: null, target_entity_id: null, source_entity_type: null, target_entity_type: null }] : [] }
  }
  if (compact.includes("FROM entity_relationships er JOIN investigation_entities source") && compact.includes("WHERE er.id=$1")) {
    const item = state.relationships.find((row) => row.id === params[0] && row.case_id === params[1])
    if (!item) return { rows: [] }
    const source = entity(item.source_entity_id), target = entity(item.target_entity_id)
    return { rows: [{ ...item, target_type: "relationship", entity_type: null, value: null, source_value: source.value, target_value: target.value, classification: null, source_entity_type: source.entity_type, target_entity_type: target.entity_type, stale_at: source.stale_at || target.stale_at }] }
  }
  if (compact.includes("FROM relationship_evidence link")) {
    const ids = state.evidenceLinks.filter((link) => link.target_type === "relationship" && link.target_id === params[0]).map((link) => link.evidence_id)
    return { rows: state.evidence.filter((item) => ids.includes(item.id) && item.case_id === params[1]).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)) }
  }
  if (compact.includes("FROM entity_evidence link")) {
    const ids = state.evidenceLinks.filter((link) => link.target_type === "entity" && link.target_id === params[0]).map((link) => link.evidence_id)
    return { rows: state.evidence.filter((item) => ids.includes(item.id) && item.case_id === params[1]) }
  }
  if (compact.includes("FROM relationship_sources link")) {
    const ids = state.sourceLinks.filter((link) => link.target_type === "relationship" && link.target_id === params[0]).map((link) => link.source_id)
    return { rows: state.sources.filter((item) => ids.includes(item.id) && item.case_id === params[1]).sort((a, b) => (a.collected_at || "~").localeCompare(b.collected_at || "~") || a.id.localeCompare(b.id)) }
  }
  if (compact.includes("FROM entity_sources link")) return { rows: [] }
  if (compact.includes("FROM analysis_results")) return { rows: state.jobs.filter((item) => item.id === params[0] && item.case_id === params[1]) }
  if (compact.includes("WHERE er.case_id=$1 AND er.relationship_type='resolves_to'")) {
    const [caseId, endpointA, endpointB] = params
    const rows = state.relationships.filter((item) => item.case_id === caseId && item.relationship_type === "resolves_to" && [endpointA, endpointB].includes(item.source_entity_id) && state.relationships.some((other) => other.case_id === caseId && other.relationship_type === "resolves_to" && other.target_entity_id === item.target_entity_id && other.source_entity_id !== item.source_entity_id && [endpointA, endpointB].includes(other.source_entity_id))).map((item) => { const source = entity(item.source_entity_id), target = entity(item.target_entity_id); return { ...item, target_type: "relationship", entity_type: null, value: null, source_value: source.value, target_value: target.value, classification: null, source_entity_type: source.entity_type, target_entity_type: target.entity_type, stale_at: source.stale_at || target.stale_at } })
    return { rows: rows.sort((a, b) => a.target_entity_id.localeCompare(b.target_entity_id) || a.source_entity_id.localeCompare(b.source_entity_id) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)) }
  }
  throw new Error(`Unhandled integration-test SQL: ${compact}`)
}
async function requireCaseOperationalAccess(_request, id) {
  if (state.access === "unauthenticated") return { ok: false, status: 401, error: "Unauthorized" }
  if (state.access === "forbidden") return { ok: false, status: 403, error: "Forbidden" }
  return { ok: true, caseId: id, user: { id: "test-user", role: "investigator" } }
}
async function downloadEvidenceFile(path) {
  if (state.storageErrors.has(path)) throw new Error("simulated storage error")
  const bytes = state.storage.get(path)
  if (!bytes) throw new Error("object not found")
  return Buffer.from(bytes)
}
const parseSdiaJobPayload = (value) => { try { return typeof value === "string" ? JSON.parse(value) : value } catch { return null } }
const routeSource = fs.readFileSync("app/api/cases/[id]/graph/verification/route.ts", "utf8")
const route = compile(routeSource, { "@/lib/db": { query }, "@/lib/investigation-workspace": { requireCaseOperationalAccess }, "@/lib/intelligence-verifier": verifier, "@/lib/services/storage-service": { downloadEvidenceFile }, "@/lib/sdia-analysis-jobs": { parseSdiaJobPayload } })
const { NextRequest } = require("next/server")
async function request(caseId, targetType, targetId) {
  const response = await route.GET(new NextRequest(`http://integration.test/api/cases/${caseId}/graph/verification?target_type=${targetType}&target_id=${targetId}`), { params: Promise.resolve({ id: caseId }) })
  return { statusCode: response.status, body: await response.json() }
}
async function test(name, run) { state = baseState(); await run(); console.log(`PASS ${name}`) }

await test("valid observed DNS route", async () => assert.equal((await request(CASE_A, "relationship", "rel-a")).body.status, "SUPPORTED"))
await test("semantic mismatch route", async () => { entity("ip-a").value = "1.2.3.4"; assert.equal((await request(CASE_A, "relationship", "rel-a")).body.status, "FAILED_VERIFICATION") })
await test("missing evidence record", async () => { state.evidence = []; assert.equal((await request(CASE_A, "relationship", "rel-a")).body.status, "INSUFFICIENT_EVIDENCE") })
await test("tampered stored content", async () => { state.storage.set("case-a/dns.json", dnsBytes("chatgpt.com", "1.2.3.4")); const body = (await request(CASE_A, "relationship", "rel-a")).body; assert.equal(body.integrity.status, "INVALID"); assert.equal(body.status, "FAILED_VERIFICATION") })
await test("missing storage object", async () => { state.storage.clear(); const body = (await request(CASE_A, "relationship", "rel-a")).body; assert.equal(body.integrity.status, "UNAVAILABLE"); assert.equal(body.status, "INSUFFICIENT_EVIDENCE") })
await test("storage retrieval error", async () => { state.storageErrors.add("case-a/dns.json"); assert.equal((await request(CASE_A, "relationship", "rel-a")).body.status, "INSUFFICIENT_EVIDENCE") })
await test("cross-case evidence isolation", async () => { state.evidence[0].case_id = CASE_B; assert.notEqual((await request(CASE_A, "relationship", "rel-a")).body.status, "SUPPORTED") })
await test("missing provenance", async () => { state.sourceLinks = []; assert.equal((await request(CASE_A, "relationship", "rel-a")).body.status, "LIMITED_SUPPORT") })
await test("missing observation timestamp", async () => { state.sources[0].collected_at = null; const body = (await request(CASE_A, "relationship", "rel-a")).body; assert.equal(body.provenance.status, "LIMITED"); assert.equal(body.status, "LIMITED_SUPPORT") })
await test("stale intact evidence", async () => { entity("domain-a").stale_at = "2020-01-01T00:00:00Z"; const body = (await request(CASE_A, "relationship", "rel-a")).body; assert.equal(body.status, "SUPPORTED"); assert.equal(body.currency, "STALE") })
await test("authorization boundaries", async () => { state.access = "unauthenticated"; assert.equal((await request(CASE_A, "relationship", "rel-a")).statusCode, 401); state.access = "forbidden"; assert.equal((await request(CASE_A, "relationship", "rel-a")).statusCode, 403) })
await test("deterministic repeated response", async () => { const first = await request(CASE_A, "relationship", "rel-a"); const second = await request(CASE_A, "relationship", "rel-a"); assert.deepEqual(second, first) })

await test("valid derived shared-IP route", async () => {
  const bytes = dnsBytes("api.chatgpt.com", "172.64.155.209")
  state.entities.push({ id: "domain-b", case_id: CASE_A, entity_type: "SUBDOMAIN", value: "api.chatgpt.com", name: "api.chatgpt.com", classification: "confidential", confidence_score: 85, source_reference: null, stale_at: null })
  state.relationships.push(
    { id: "rel-b", case_id: CASE_A, source_entity_id: "domain-b", target_entity_id: "ip-a", relationship_type: "resolves_to", confidence_score: 85, source_reference: null, created_at: "2026-01-02T00:00:00Z" },
    { id: "derived", case_id: CASE_A, source_entity_id: "domain-a", target_entity_id: "domain-b", relationship_type: "shares_observed_ip_with", confidence_score: 60, source_reference: null, created_at: "2026-01-03T00:00:00Z" },
  )
  state.evidence.push({ id: "ev-b", case_id: CASE_A, file_name: "dns-b.json", file_type: "application/json", file_hash: sha256(bytes), storage_path: "case-a/dns-b.json", evidence_type: "dns", description: null, created_at: "2026-01-02T00:00:00Z" })
  state.evidenceLinks.push({ target_type: "relationship", target_id: "rel-b", evidence_id: "ev-b" })
  state.sources.push({ id: "src-b", case_id: CASE_A, title: "Test DNS collector B", source_type: "dns", collected_at: "2026-01-02T00:00:00Z" })
  state.sourceLinks.push({ target_type: "relationship", target_id: "rel-b", source_id: "src-b" })
  state.storage.set("case-a/dns-b.json", bytes)
  assert.equal((await request(CASE_A, "relationship", "derived")).body.status, "SUPPORTED_AS_DERIVED")
})

await test("duplicate endpoint cannot satisfy derived route", async () => {
  state.entities.push({ id: "domain-b", case_id: CASE_A, entity_type: "SUBDOMAIN", value: "api.chatgpt.com", name: "api.chatgpt.com", classification: "confidential", confidence_score: 85, source_reference: null, stale_at: null })
  state.relationships.push(
    { ...state.relationships[0], id: "rel-a-duplicate", created_at: "2026-01-02T00:00:00Z" },
    { id: "derived", case_id: CASE_A, source_entity_id: "domain-a", target_entity_id: "domain-b", relationship_type: "shares_observed_ip_with", confidence_score: 60, source_reference: null, created_at: "2026-01-03T00:00:00Z" },
  )
  assert.notEqual((await request(CASE_A, "relationship", "derived")).body.status, "SUPPORTED_AS_DERIVED")
})

await test("SDIA response without canonical contract fails closed", async () => {
  state.relationships[0].source_reference = `${JOB_ID}:relationship:r1`
  state.jobs.push({ id: JOB_ID, case_id: CASE_A, updated_at: "2026-01-01T00:00:00Z", findings: JSON.stringify({ status: "completed", domain: "chatgpt.com", requested_by: "test-user", result: { entities: [{ entity_id: "domain:d1", value: "chatgpt.com" }, { entity_id: "ip:i1", value: "172.64.155.209" }], relationships: [{ relationship_id: "relationship:r1", source_entity_id: "domain:d1", target_entity_id: "ip:i1", relationship_type: "resolves_to" }] } }) })
  const body = (await request(CASE_A, "relationship", "rel-a")).body
  assert.equal(body.integrity.status, "INVALID")
  assert.equal(body.status, "FAILED_VERIFICATION")
})

console.log("\n15 isolated verifier route integration tests passed.")
