import assert from "node:assert/strict"
import fs from "node:fs"
import ts from "typescript"

const CASE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const JOB_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

function compile(source, mocks = {}) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  const mockedRequire = (id) => id in mocks ? mocks[id] : require(id)
  new Function("require", "module", "exports", output)(mockedRequire, module, module.exports)
  return module.exports
}

const bridge = compile(fs.readFileSync("lib/sdia-evidence-bridge.ts", "utf8"))
const source = fs.readFileSync("app/api/intelligence/domains/analyze/import/route.ts", "utf8")

function analysisWithEvidence(evidence) {
  return {
    schema_version: "1.0",
    tool: "ShadowNode Domain Intelligence Analyzer",
    investigation: { domain: "example.com", run_id: "run-1" },
    evidence_manifest: { artifact_count: evidence.length },
    evidence,
    entities: [
      { entity_id: "domain:d1", value: "example.com", entity_type: "domain", evidence_artifacts: ["artifact-1", "missing-entity"] },
      { entity_id: "ip:i1", value: "192.0.2.1", entity_type: "ip", evidence_artifacts: ["artifact-1"] },
    ],
    relationships: [{ relationship_id: "relationship:r1", source_entity_id: "domain:d1", target_entity_id: "ip:i1", relationship_type: "resolves_to", evidence_artifacts: ["artifact-1"] }],
    findings: [{ finding_id: "finding:f1", name: "Observed DNS", description: "The domain resolves to the observed address.", evidence_artifacts: ["artifact-1"] }],
  }
}

const artifact = { artifact_id: "artifact-1", artifact_type: "rdap_domain", source: "RDAP registry", collected_at: "2026-10-16T00:00:00Z", sha256: "a".repeat(64), collector: "RDAP Collector", collector_version: "1.0", classification: "observed", parent_artifacts: [], context: { domain: "example.com" }, data: { body_base64: "must-not-enter-index" } }

function initialState() {
  return {
    jobs: [{ id: JOB_ID, case_id: CASE_ID, findings: JSON.stringify({ status: "completed", result: analysisWithEvidence([artifact]) }) }],
    reports: [],
    artifacts: [],
    entities: [],
    relationships: [],
    observations: [],
    provenance: [],
    failOn: null,
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

let database = initialState()

function makeClient(state) {
  return { query: async (sql, params = []) => {
    const compact = sql.replace(/\s+/g, " ").trim()
    if (state.failOn && compact.includes(state.failOn)) throw new Error("simulated import failure")
    if (compact.startsWith("SELECT id, case_id, findings FROM analysis_results")) return { rows: state.jobs.filter((job) => job.id === params[0] && job.case_id === params[1]) }
    if (compact.startsWith("INSERT INTO sdia_analysis_reports")) {
      state.reports = [{ analysis_result_id: params[0], case_id: params[1] }]
      return { rowCount: 1, rows: [] }
    }
    if (compact === "DELETE FROM sdia_graph_provenance WHERE report_id=$1") {
      state.provenance = state.provenance.filter((row) => row.report_id !== params[0])
      return { rowCount: 1, rows: [] }
    }
    if (compact === "DELETE FROM sdia_evidence_artifacts WHERE report_id=$1") {
      state.artifacts = state.artifacts.filter((row) => row.report_id !== params[0])
      return { rowCount: 1, rows: [] }
    }
    if (compact.startsWith("INSERT INTO sdia_evidence_artifacts")) {
      const rows = JSON.parse(params[1])
      state.artifacts.push(...rows.map((row) => ({ report_id: params[0], ...row })))
      return { rowCount: rows.length, rows: [] }
    }
    if (compact.startsWith("INSERT INTO investigation_entities")) {
      const rows = JSON.parse(params[1])
      let rowCount = 0
      for (const row of rows) {
        if (state.entities.some((existing) => existing.case_id === params[0] && existing.source_reference === row.source_reference)) continue
        state.entities.push({ id: `entity-${row.external_id || row.source_reference}`, case_id: params[0], source_reference: row.source_reference })
        rowCount += 1
      }
      return { rowCount, rows: [] }
    }
    if (compact.startsWith("SELECT id, source_reference FROM investigation_entities")) {
      return { rows: state.entities.filter((row) => row.case_id === params[0] && params[1].includes(row.source_reference)) }
    }
    if (compact.startsWith("INSERT INTO entity_relationships")) {
      const rows = JSON.parse(params[1])
      let rowCount = 0
      for (const row of rows) {
        if (state.relationships.some((existing) => existing.case_id === params[0] && existing.source_reference === row.source_reference)) continue
        state.relationships.push({ id: `relationship-${row.source_reference}`, case_id: params[0], source_reference: row.source_reference })
        rowCount += 1
      }
      return { rowCount, rows: [] }
    }
    if (compact.startsWith("INSERT INTO intelligence_observations")) {
      const rows = JSON.parse(params[1])
      let rowCount = 0
      for (const row of rows) {
        if (state.observations.some((existing) => existing.case_id === params[0] && existing.finding_id === row.finding_id)) continue
        state.observations.push({ id: `finding-${row.finding_id}`, case_id: params[0], finding_id: row.finding_id, related_sources: [{ provider: "SDIA", job_id: params[2], finding_id: row.finding_id }] })
        rowCount += 1
      }
      return { rowCount, rows: [] }
    }
    if (compact.startsWith("SELECT id, source_reference FROM entity_relationships")) return { rows: state.relationships.filter((row) => row.case_id === params[0] && params[1].includes(row.source_reference)) }
    if (compact.startsWith("SELECT id, related_sources FROM intelligence_observations")) return { rows: state.observations.filter((row) => row.case_id === params[0] && row.related_sources.some((source) => source.provider === "SDIA" && source.job_id === params[1])) }
    if (compact.startsWith("INSERT INTO sdia_graph_provenance")) {
      const rows = JSON.parse(params[2])
      for (const row of rows) {
        const key = `${params[0]}:${row.target_type}:${row.source_record_id}`
        state.provenance = state.provenance.filter((existing) => `${existing.report_id}:${existing.target_type}:${existing.source_record_id}` !== key)
        state.provenance.push({ report_id: params[0], case_id: params[1], ...row })
      }
      return { rowCount: rows.length, rows: [] }
    }
    throw new Error(`Unhandled import SQL: ${compact}`)
  } }
}

const withTransaction = async (callback) => {
  const staged = clone(database)
  try {
    const result = await callback(makeClient(staged))
    database = staged
    return result
  } catch (error) {
    throw error
  }
}
const route = compile(source, {
  "next/server": { NextRequest: class {} , NextResponse: { json: (body, init = {}) => ({ status: init.status || 200, json: async () => body }) } },
  "@/lib/auth": { auditLog: async () => {} },
  "@/lib/db": { withTransaction },
  "@/lib/investigation-workspace": { profileIdForUser: async () => "profile-1", recordInvestigationTimeline: async () => {}, requireCaseOperationalAccess: async (_request, caseId) => ({ ok: true, caseId, user: { id: "user-1" } }) },
  "@/lib/security-center": { isSameOriginMutation: () => true },
  "@/lib/sdia-analysis-jobs": { parseSdiaJobPayload: (value) => { try { return JSON.parse(value) } catch { return null } }, SDIA_ANALYSIS_TYPE: "domain_intelligence" },
  "@/lib/sdia-evidence-bridge": bridge,
})

async function importJob() {
  const response = await route.POST({ json: async () => ({ case_id: CASE_ID, job_id: JOB_ID }) })
  return { status: response.status, body: await response.json() }
}

const first = await importJob()
assert.equal(first.status, 200)
assert.equal(database.artifacts.length, 1)
assert.equal(database.entities.length, 2)
assert.equal(database.relationships.length, 1)
assert.equal(database.observations.length, 1)
assert.equal(database.provenance.length, 4)
assert.equal(database.artifacts[0].data, undefined)

const firstSnapshot = clone(database)
const repeat = await importJob()
assert.equal(repeat.status, 200)
assert.equal(repeat.body.entities_created, 0)
assert.equal(repeat.body.relationships_created, 0)
assert.equal(repeat.body.observations_created, 0)
assert.equal(database.entities.length, 2)
assert.equal(database.relationships.length, 1)
assert.equal(database.observations.length, 1)
assert.equal(database.provenance.length, 4)
assert.deepEqual(database.provenance.map((row) => `${row.target_type}:${row.source_record_id}`).sort(), ["entity:domain:d1", "entity:ip:i1", "finding:finding:f1", "relationship:relationship:r1"])

database.jobs[0].findings = JSON.stringify({ status: "completed", result: analysisWithEvidence([]) })
const missing = await importJob()
assert.equal(missing.status, 200)
assert.equal(database.artifacts.length, 0)
assert.ok(database.provenance.every((row) => row.missing_artifact_ids.includes("artifact-1")))

const beforeFailure = clone(database)
database.failOn = "INSERT INTO sdia_graph_provenance"
await assert.rejects(importJob, /simulated import failure/)
database.failOn = null
assert.deepEqual(database, beforeFailure)
assert.notDeepEqual(firstSnapshot, beforeFailure)

const beforeCaseMismatch = clone(database)
database.jobs[0].case_id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
await assert.rejects(importJob, /analysis_case_mismatch/)
database.jobs[0].case_id = CASE_ID
assert.deepEqual(database, beforeCaseMismatch)

database.relationships.push({ id: "relationship-ambiguous", case_id: CASE_ID, source_reference: `${JOB_ID}:relationship:r1` })
const beforeAmbiguousReference = clone(database)
await assert.rejects(importJob, /sdia_relationship_source_reference_ambiguous/)
assert.deepEqual(database, beforeAmbiguousReference)
database.relationships.pop()

console.log("SDIA evidence import transaction tests passed.")
