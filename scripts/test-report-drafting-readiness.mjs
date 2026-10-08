import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)

function compile(source, mocks = {}) {
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const module = { exports: {} }
  const mockedRequire = (id) => (id in mocks ? mocks[id] : require(id))
  new Function("require", "module", "exports", output)(mockedRequire, module, module.exports)
  return module.exports
}

const readinessSource = fs.readFileSync("lib/report-drafting-readiness.ts", "utf8")
const { calculateReportDraftingReadiness } = compile(readinessSource)
const evidenceBasedSource = fs.readFileSync("lib/evidence-based-report.ts", "utf8")
const { buildEvidenceBasedDraft } = compile(evidenceBasedSource)

function material(overrides = {}) {
  return {
    case_present: true,
    entity_count: 0,
    relationship_count: 0,
    source_count: 0,
    observation_count: 0,
    timeline_count: 0,
    evidence_count: 0,
    graph_provenance_count: 0,
    case_activity_count: 0,
    note_count: 0,
    ...overrides,
  }
}

function test(name, run) {
  run()
  console.log(`PASS ${name}`)
}

test("drafting is eligible without intelligence sources", () => {
  const result = calculateReportDraftingReadiness(material({
    evidence_count: 1,
    entity_count: 2,
    relationship_count: 1,
    graph_provenance_count: 1,
  }))
  assert.equal(result.ready, true)
  assert.equal(result.mode, "evidence_backed")
  assert.match(result.limitations.join(" "), /No intelligence source records/)
})

test("drafting is eligible without observations or timeline events", () => {
  const result = calculateReportDraftingReadiness(material({
    evidence_count: 1,
    entity_count: 1,
  }))
  assert.equal(result.ready, true)
  assert.match(result.limitations.join(" "), /No directly documented incident-timeline events/)
  assert.match(result.limitations.join(" "), /No separately recorded investigator observations/)
})

test("evidence, graph records, and provenance produce an evidence-backed draft", () => {
  const result = calculateReportDraftingReadiness(material({
    evidence_count: 3,
    entity_count: 4,
    relationship_count: 3,
    graph_provenance_count: 5,
    case_activity_count: 2,
  }))
  assert.equal(result.ready, true)
  assert.equal(result.mode, "evidence_backed")
  assert.equal(result.score, 100)
})

test("a limited-evidence case can produce a preliminary draft with warnings", () => {
  const result = calculateReportDraftingReadiness(material())
  assert.equal(result.ready, true)
  assert.equal(result.mode, "preliminary")
  assert.ok(result.limitations.length >= 4)
})

test("a missing case cannot be drafted", () => {
  const result = calculateReportDraftingReadiness(material({ case_present: false }))
  assert.equal(result.ready, false)
})

const routeSource = fs.readFileSync("app/api/cases/[id]/reports/route.ts", "utf8")
const operationalAccess = routeSource.indexOf("await requireCaseOperationalAccess(")
const aiDraftBranch = routeSource.indexOf('action ===\n      "generate_ai_draft"')

test("operational authorization remains before AI drafting", () => {
  assert.ok(operationalAccess >= 0)
  assert.ok(aiDraftBranch >= 0)
  assert.ok(operationalAccess < aiDraftBranch)
  assert.match(routeSource, /!canManageReports\([\s\S]*?You are not authorized to create reports\./)
})

const unauthorizedRoute = compile(routeSource, {
  "@/lib/auth": { auditLog: async () => undefined },
  "@/lib/db": {
    query: async () => ({ rows: [] }),
    withTransaction: async (run) => run({ query: async () => ({ rows: [] }) }),
  },
  "@/lib/investigation-workspace": {
    canUseCaseOperationalAccess: async () => false,
    canUseCaseOversightRead: async () => false,
    canUseCaseReviewAccess: async () => false,
    optionalText: (value) => typeof value === "string" && value.trim() ? value.trim() : null,
    profileIdForUser: async () => null,
    recordInvestigationTimeline: async () => undefined,
    requireCaseOperationalAccess: async () => ({ ok: false, status: 401, error: "Unauthorized" }),
    requireCaseReadAccess: async () => ({ ok: false, status: 401, error: "Unauthorized" }),
  },
  "@/lib/realtime/workspace-events": { emitCaseWorkspaceEvent: async () => undefined },
  "@/lib/report-drafting-readiness": { calculateReportDraftingReadiness },
  "@/lib/evidence-based-report": { buildEvidenceBasedDraft },
  "@/lib/services/notification-service": {
    notifyAdmins: async () => undefined,
    notifySuperAdmins: async () => undefined,
    notifyUser: async () => undefined,
  },
})

const { NextRequest } = require("next/server")
const unauthorizedResponse = await unauthorizedRoute.POST(
  new NextRequest("http://report.test/api/cases/test-case/reports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "generate_ai_draft" }),
  }),
  { params: Promise.resolve({ id: "test-case" }) },
)

test("unauthorized AI drafting is rejected by the route", () => {
  assert.equal(unauthorizedResponse.status, 401)
})

test("report approval and review controls remain present", () => {
  assert.match(routeSource, /!canApproveReports\([\s\S]*?Only an administrator or Super Administrator can approve, finalize, deliver, or publish reports\./)
  assert.match(routeSource, /A report must contain at least one substantive section before approval\./)
  assert.match(routeSource, /Only a Super Administrator can finalize, deliver, or publish a report\./)
})

test("AI prompt preserves evidence association and chronology limits", () => {
  assert.match(routeSource, /GRAPH PROVENANCE LINKS/)
  assert.match(routeSource, /CASE ACTIVITY \(PROCEDURAL HISTORY ONLY; NOT INCIDENT CHRONOLOGY\)/)
  assert.match(routeSource, /evidence record created_at values as upload, collection, or custody/)
  assert.match(routeSource, /does not authenticate the evidence/)
  assert.match(routeSource, /do not[\s\S]*?sexually explicit\s+imagery/)
})

test("graph provenance is case-scoped before it is supplied to AI drafting", () => {
  assert.equal((routeSource.match(/AND ins\.case_id = \$1/g) || []).length, 2)
  assert.equal((routeSource.match(/AND ff\.case_id = \$1/g) || []).length, 2)
})

console.log("\n10 report drafting readiness checks passed.")
