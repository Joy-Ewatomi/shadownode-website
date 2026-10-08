import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
import ts from "typescript"

if (process.env.NODE_ENV !== "test" || process.env.EVIDENCE_ASSOCIATION_TEST_MODE !== "isolated") {
  throw new Error("Refusing to run outside the explicit isolated test environment.")
}

for (const key of [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "SUPABASE_DB_URL",
  "SUPABASE_POSTGRES_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]) {
  if (process.env[key]) throw new Error(`Refusing to run while ${key} is configured.`)
}

globalThis.fetch = async () => {
  throw new Error("External network access is forbidden in evidence association tests.")
}

const require = createRequire(import.meta.url)

function compile(source, mocks = {}) {
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText
  const module = { exports: {} }
  const mockedRequire = (id) => (id in mocks ? mocks[id] : require(id))
  new Function("require", "module", "exports", output)(mockedRequire, module, module.exports)
  return module.exports
}

const CASE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const CASE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const ACTOR_ID = "actor-user"
const PROFILE_ID = "profile-a"

function baseState() {
  return {
    access: "authorized",
    entities: [{ id: "entity-a", case_id: CASE_A, name: "example.com" }],
    relationships: [{ id: "relationship-a", case_id: CASE_A, relationship_type: "resolves_to" }],
    evidence: [
      {
        id: "evidence-a",
        case_id: CASE_A,
        file_name: "synthetic-dns.json",
        evidence_type: "dns",
        description: "Synthetic DNS observation for an isolated test.",
        file_hash: "a".repeat(64),
      },
      {
        id: "evidence-b",
        case_id: CASE_B,
        file_name: "other-case.json",
        evidence_type: "dns",
        description: "Synthetic other-case record.",
        file_hash: "b".repeat(64),
      },
    ],
    entityLinks: [],
    relationshipLinks: [],
    sourceLinks: [],
    reportEvidenceIds: ["evidence-a"],
    audits: [],
    timeline: [],
    events: [],
  }
}

let state = baseState()

function evidence(id) {
  return state.evidence.find((item) => item.id === id)
}

function association(targetType, targetId, evidenceId, createdBy = PROFILE_ID) {
  const file = evidence(evidenceId)
  const target = targetType === "entity"
    ? state.entities.find((item) => item.id === targetId)
    : state.relationships.find((item) => item.id === targetId)
  return {
    association_id: `${targetType}:${targetId}:${evidenceId}`,
    target_type: targetType,
    target_id: targetId,
    target_label: targetType === "entity" ? target?.name : target?.relationship_type,
    evidence_id: evidenceId,
    evidence_file_name: file?.file_name,
    evidence_type: file?.evidence_type ?? null,
    evidence_description: file?.description ?? null,
    evidence_sha256: file?.file_hash ?? null,
    created_at: "2026-10-08T12:00:00.000Z",
    created_by: createdBy,
    created_by_username: createdBy ? "test-investigator" : null,
  }
}

function targetExists(targetType, targetId, caseId) {
  const records = targetType === "entity" ? state.entities : state.relationships
  return records.some((item) => item.id === targetId && item.case_id === caseId)
}

function targetAssociations(targetType, targetId, caseId) {
  const links = targetType === "entity" ? state.entityLinks : state.relationshipLinks
  return links
    .filter((item) => item.target_id === targetId)
    .filter((item) => targetExists(targetType, targetId, caseId))
    .filter((item) => evidence(item.evidence_id)?.case_id === caseId)
    .map((item) => association(targetType, targetId, item.evidence_id, item.created_by))
}

function evidenceAssociations(evidenceId, caseId) {
  return [
    ...state.entityLinks.map((item) => ({ ...item, target_type: "entity" })),
    ...state.relationshipLinks.map((item) => ({ ...item, target_type: "relationship" })),
  ]
    .filter((item) => item.evidence_id === evidenceId)
    .filter((item) => targetExists(item.target_type, item.target_id, caseId))
    .filter(() => evidence(evidenceId)?.case_id === caseId)
    .map((item) => association(item.target_type, item.target_id, evidenceId, item.created_by))
}

async function query(sql, params = []) {
  const compact = sql.replace(/\s+/g, " ").trim()

  if (compact.startsWith("DELETE FROM entity_evidence")) {
    const [targetId, evidenceId, caseId] = params
    const index = state.entityLinks.findIndex((item) => item.target_id === targetId && item.evidence_id === evidenceId)
    if (index < 0 || !targetExists("entity", targetId, caseId) || evidence(evidenceId)?.case_id !== caseId) return { rows: [] }
    const [removed] = state.entityLinks.splice(index, 1)
    return { rows: [association("entity", targetId, evidenceId, removed.created_by)] }
  }

  if (compact.startsWith("DELETE FROM relationship_evidence")) {
    const [targetId, evidenceId, caseId] = params
    const index = state.relationshipLinks.findIndex((item) => item.target_id === targetId && item.evidence_id === evidenceId)
    if (index < 0 || !targetExists("relationship", targetId, caseId) || evidence(evidenceId)?.case_id !== caseId) return { rows: [] }
    const [removed] = state.relationshipLinks.splice(index, 1)
    return { rows: [association("relationship", targetId, evidenceId, removed.created_by)] }
  }

  if (compact.startsWith("INSERT INTO entity_evidence")) {
    const [targetId, evidenceId, _notes, createdBy] = params
    if (state.entityLinks.some((item) => item.target_id === targetId && item.evidence_id === evidenceId)) return { rows: [] }
    state.entityLinks.push({ target_id: targetId, evidence_id: evidenceId, created_by: createdBy })
    return { rows: [{ evidence_id: evidenceId }] }
  }

  if (compact.startsWith("INSERT INTO relationship_evidence")) {
    const [targetId, evidenceId, _notes, createdBy] = params
    if (state.relationshipLinks.some((item) => item.target_id === targetId && item.evidence_id === evidenceId)) return { rows: [] }
    state.relationshipLinks.push({ target_id: targetId, evidence_id: evidenceId, created_by: createdBy })
    return { rows: [{ evidence_id: evidenceId }] }
  }

  if (compact.startsWith("INSERT INTO entity_sources") || compact.startsWith("INSERT INTO relationship_sources")) {
    state.sourceLinks.push({ target_id: params[0], source_id: params[1] })
    return { rows: [] }
  }

  if (compact.startsWith("SELECT id FROM investigation_entities")) {
    return { rows: targetExists("entity", params[0], params[1]) ? [{ id: params[0] }] : [] }
  }

  if (compact.startsWith("SELECT id FROM entity_relationships")) {
    return { rows: targetExists("relationship", params[0], params[1]) ? [{ id: params[0] }] : [] }
  }

  if (compact.startsWith("SELECT id FROM forensic_files")) {
    return { rows: evidence(params[0])?.case_id === params[1] ? [{ id: params[0] }] : [] }
  }

  if (compact.includes("FROM entity_evidence ee") && compact.includes("WHERE ee.entity_id = $1")) {
    return { rows: targetAssociations("entity", params[0], params[1]) }
  }

  if (compact.includes("FROM relationship_evidence re") && compact.includes("WHERE re.relationship_id = $1")) {
    return { rows: targetAssociations("relationship", params[0], params[1]) }
  }

  if (compact.includes("WHERE ee.forensic_file_id = $1")) {
    return { rows: evidenceAssociations(params[0], params[1]) }
  }

  throw new Error(`Unhandled evidence-association test SQL: ${compact}`)
}

async function requireAccess(_request, id) {
  if (state.access === "unauthenticated") return { ok: false, status: 401, error: "Unauthorized" }
  if (state.access === "forbidden") return { ok: false, status: 403, error: "Forbidden" }
  return { ok: true, caseId: id, user: { id: ACTOR_ID, role: "investigator" } }
}

const auditLog = async (_actorId, action, _request, data) => {
  state.audits.push({ action, data })
}
const recordInvestigationTimeline = async (_caseId, _actorId, action, title, detail) => {
  state.timeline.push({ action, title, detail })
}
const emitCaseWorkspaceEvent = async (event) => {
  state.events.push(event)
  return { delivered: false, payload: event }
}

const routeSource = fs.readFileSync("app/api/cases/[id]/graph/provenance/route.ts", "utf8")
const route = compile(routeSource, {
  "@/lib/auth": { auditLog },
  "@/lib/db": { query, withTransaction: async (run) => run({ query }) },
  "@/lib/investigation-workspace": {
    optionalText: (value) => typeof value === "string" && value.trim() ? value.trim() : null,
    profileIdForUser: async () => PROFILE_ID,
    recordInvestigationTimeline,
    requireCaseReadAccess: requireAccess,
    requireInvestigationWorkspace: requireAccess,
  },
  "@/lib/realtime/workspace-events": { emitCaseWorkspaceEvent },
})

const { NextRequest } = require("next/server")

async function call(method, caseId, { query = "", body } = {}) {
  const url = `http://association.test/api/cases/${caseId}/graph/provenance${query ? `?${query}` : ""}`
  const request = new NextRequest(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const response = await route[method](request, { params: Promise.resolve({ id: caseId }) })
  return { status: response.status, body: await response.json() }
}

async function test(name, run) {
  state = baseState()
  await run()
  console.log(`PASS ${name}`)
}

await test("adds and lists an entity-evidence association", async () => {
  const created = await call("POST", CASE_A, { body: { target_type: "entity", target_id: "entity-a", evidence_id: "evidence-a" } })
  assert.equal(created.status, 200)
  assert.equal(created.body.created, true)
  assert.equal(created.body.association.evidence_sha256, "a".repeat(64))

  const listed = await call("GET", CASE_A, { query: "target_type=entity&target_id=entity-a" })
  assert.equal(listed.status, 200)
  assert.equal(listed.body.associations.length, 1)
  assert.equal(listed.body.associations[0].evidence_file_name, "synthetic-dns.json")
})

await test("adds and lists a relationship-evidence association", async () => {
  const created = await call("POST", CASE_A, { body: { target_type: "relationship", target_id: "relationship-a", evidence_id: "evidence-a" } })
  assert.equal(created.status, 200)
  assert.equal(created.body.association.target_type, "relationship")

  const listed = await call("GET", CASE_A, { query: "target_type=relationship&target_id=relationship-a" })
  assert.equal(listed.body.associations.length, 1)
})

await test("lists graph records linked to evidence", async () => {
  await call("POST", CASE_A, { body: { target_type: "entity", target_id: "entity-a", evidence_id: "evidence-a" } })
  await call("POST", CASE_A, { body: { target_type: "relationship", target_id: "relationship-a", evidence_id: "evidence-a" } })
  const listed = await call("GET", CASE_A, { query: "evidence_id=evidence-a" })
  assert.equal(listed.status, 200)
  assert.equal(listed.body.associations.length, 2)
})

await test("removes only the requested association and preserves the evidence record", async () => {
  const before = structuredClone(evidence("evidence-a"))
  await call("POST", CASE_A, { body: { target_type: "entity", target_id: "entity-a", evidence_id: "evidence-a" } })
  await call("POST", CASE_A, { body: { target_type: "relationship", target_id: "relationship-a", evidence_id: "evidence-a" } })

  const removed = await call("DELETE", CASE_A, { body: { target_type: "entity", target_id: "entity-a", evidence_id: "evidence-a" } })
  assert.equal(removed.status, 200)
  assert.equal(state.entityLinks.length, 0)
  assert.equal(state.relationshipLinks.length, 1)
  assert.deepEqual(evidence("evidence-a"), before)
  assert.deepEqual(state.reportEvidenceIds, ["evidence-a"])
})

await test("rejects cross-case evidence without creating an association", async () => {
  const response = await call("POST", CASE_A, { body: { target_type: "entity", target_id: "entity-a", evidence_id: "evidence-b" } })
  assert.equal(response.status, 404)
  assert.equal(state.entityLinks.length, 0)
})

await test("rejects unauthorized association removal", async () => {
  await call("POST", CASE_A, { body: { target_type: "entity", target_id: "entity-a", evidence_id: "evidence-a" } })
  state.access = "forbidden"
  const response = await call("DELETE", CASE_A, { body: { target_type: "entity", target_id: "entity-a", evidence_id: "evidence-a" } })
  assert.equal(response.status, 403)
  assert.equal(state.entityLinks.length, 1)
})

await test("records one audit, timeline item, and realtime event for each mutation", async () => {
  await call("POST", CASE_A, { body: { target_type: "entity", target_id: "entity-a", evidence_id: "evidence-a" } })
  await call("POST", CASE_A, { body: { target_type: "entity", target_id: "entity-a", evidence_id: "evidence-a" } })
  await call("DELETE", CASE_A, { body: { target_type: "entity", target_id: "entity-a", evidence_id: "evidence-a" } })

  assert.deepEqual(state.audits.map((item) => item.action), ["evidence_associated", "evidence_unlinked"])
  assert.deepEqual(state.timeline.map((item) => item.action), ["evidence_associated", "evidence_unlinked"])
  assert.deepEqual(state.events.map((item) => item.type), ["evidence.associated", "evidence.unlinked"])
})

await test("does not create a source link when a combined request contains cross-case evidence", async () => {
  const response = await call("POST", CASE_A, {
    body: {
      target_type: "entity",
      target_id: "entity-a",
      source_id: "source-a",
      evidence_id: "evidence-b",
    },
  })
  assert.equal(response.status, 404)
  assert.equal(state.sourceLinks.length, 0)
})

await test("graph UI refreshes its state after supporting-evidence changes", async () => {
  const page = fs.readFileSync("app/cases/[id]/graph/page.tsx", "utf8")
  assert.match(
    page,
    /async function addSupportingEvidence\(\)[\s\S]*?await loadGraph\(true\)/,
  )
  assert.match(
    page,
    /async function removeSupportingEvidence\([\s\S]*?await loadGraph\(true\)/,
  )
})

console.log("\n9 isolated evidence-association checks passed.")
