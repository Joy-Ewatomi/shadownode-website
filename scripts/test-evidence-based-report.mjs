import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)

function compile(source) {
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const module = { exports: {} }
  new Function("require", "module", "exports", output)(require, module, module.exports)
  return module.exports
}

function test(name, run) {
  run()
  console.log(`PASS ${name}`)
}

const source = fs.readFileSync("lib/evidence-based-report.ts", "utf8")
const { buildEvidenceBasedDraft } = compile(source)

function investigation(overrides = {}) {
  return {
    case: {
      id: "case-a",
      case_number: "CASE-SYNTHETIC-001",
      title: "Synthetic investigation",
      status: "active",
      service_type: "investigation",
      created_at: "2026-10-08T10:00:00.000Z",
      assigned_operator_name: "Synthetic Analyst",
      description: "Synthetic intake narrative.",
    },
    entities: [{
      id: "00000000-0000-4000-8000-000000000001",
      name: "Synthetic account",
      entity_type: "username",
      value: "synthetic_account",
      description: "Synthetic graph entity.",
      verification_status: "unreviewed",
    }],
    relationships: [{
      id: "00000000-0000-4000-8000-000000000002",
      source_entity_name: "Synthetic account",
      target_entity_name: "Synthetic wallet",
      relationship_type: "provided_payment_wallet",
      description: "Recorded synthetic association.",
      verification_status: "unreviewed",
    }],
    evidence: [{
      id: "00000000-0000-4000-8000-000000000003",
      file_name: "synthetic-record.txt",
      evidence_type: "digital",
      file_hash: "a".repeat(64),
      description: "Synthetic evidence description that must remain in the vault.",
      created_at: "2026-10-08T11:00:00.000Z",
    }],
    observations: [{
      id: "observation-a",
      title: "Synthetic observation",
      observation_type: "analyst_note",
      status: "unreviewed",
      confidence_score: 40,
      description: "Synthetic observation text.",
    }],
    timeline: [],
    sources: [],
    graph_provenance: [
      {
        link_type: "entity_evidence",
        graph_record_id: "00000000-0000-4000-8000-000000000001",
        graph_record_name: "Synthetic account",
        evidence_id: "00000000-0000-4000-8000-000000000003",
      },
      {
        link_type: "relationship_evidence",
        graph_record_id: "00000000-0000-4000-8000-000000000002",
        graph_record_name: "provided payment wallet",
        evidence_id: "00000000-0000-4000-8000-000000000003",
      },
    ],
    ...overrides,
  }
}

test("creates stable, ordered, editable evidence-based sections", () => {
  const draft = buildEvidenceBasedDraft(investigation())
  assert.equal(draft.sections.length, 14)
  assert.deepEqual(draft.sections.map((item) => item.order_index), [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140])
  assert.match(draft.executive_summary, /deterministic evidence-based draft/)
})

test("preserves unverified graph relationships as recorded associations", () => {
  const relationshipSection = buildEvidenceBasedDraft(investigation()).sections.find((item) => item.section_type === "relationship_analysis")
  assert.match(relationshipSection.content, /Verification status: unreviewed/)
  assert.match(relationshipSection.content, /does not establish identity, ownership, control, or responsibility/)
  assert.match(relationshipSection.content, /Supporting evidence: \[E1\]/)
})

test("uses evidence registration timestamps without converting them into incident dates", () => {
  const evidenceSection = buildEvidenceBasedDraft(investigation()).sections.find((item) => item.section_type === "evidence_register")
  assert.match(evidenceSection.content, /SHA-256: a{64}/)
  assert.match(evidenceSection.content, /registration\/upload timestamp \(not an incident date\)/)
  assert.match(evidenceSection.content, /Description: A controlled description is retained in the Evidence Vault/)
  assert.doesNotMatch(evidenceSection.content, /Synthetic evidence description/)
})

test("keeps an absent incident timeline distinct from case activity and uploads", () => {
  const timelineSection = buildEvidenceBasedDraft(investigation()).sections.find((item) => item.section_type === "incident_chronology")
  assert.equal(timelineSection.content, "No independently documented incident chronology is currently available in the case workspace.")
})

test("handles missing optional records without inventing information", () => {
  const draft = buildEvidenceBasedDraft(investigation({
    entities: [], relationships: [], evidence: [], observations: [], timeline: [], sources: [], graph_provenance: [],
  }))
  assert.match(draft.sections.find((item) => item.section_type === "evidence_register").content, /No eligible evidence records/)
  assert.match(draft.sections.find((item) => item.section_type === "investigator_observations").content, /requires investigator completion/)
})

const routeSource = fs.readFileSync("app/api/cases/[id]/reports/route.ts", "utf8")
const evidenceBranchStart = routeSource.indexOf('action === "generate_evidence_based_draft"')
const evidenceBranch = routeSource.slice(
  evidenceBranchStart,
  routeSource.indexOf("AI REPORT GENERATION", evidenceBranchStart),
)

test("evidence-based generation is case-scoped, transactional, and stays draft", () => {
  assert.match(routeSource, /function createEvidenceBasedDraft/)
  assert.match(routeSource, /withTransaction/)
  assert.match(routeSource, /WHERE ie\.case_id = \$3 AND ie\.id = ANY\(\$4::uuid\[\]\)/)
  assert.match(routeSource, /WHERE ff\.case_id = \$3/)
  assert.match(routeSource, /ON CONFLICT \(report_id, entity_id\) DO NOTHING/)
  assert.match(routeSource, /ON CONFLICT \(report_id, forensic_file_id\) DO NOTHING/)
  assert.match(routeSource, /VALUES \(\$1, \$2, NULL, \$3, \$4, \$5, 'draft', \$6, NOW\(\), NOW\(\)\)/)
  assert.match(evidenceBranch, /status: "draft"/)
})

test("evidence-based generation does not call the AI provider", () => {
  assert.match(routeSource, /const draft = buildEvidenceBasedDraft\(investigation\)/)
  assert.match(evidenceBranch, /createEvidenceBasedDraft\(investigation/)
  assert.doesNotMatch(evidenceBranch, /generateAiReport|api\.openai\.com|fetch\(/)
})

test("existing blank, AI, and export paths remain available", () => {
  assert.match(routeSource, /action ===\s*\n\s*"generate_ai_draft"/)
  assert.match(routeSource, /NORMAL BLANK REPORT/)
  const exportSource = fs.readFileSync("app/api/reports/[id]/export/route.ts", "utf8")
  assert.match(exportSource, /FROM case_report_sections WHERE report_id = \$1 ORDER BY order_index/)
})

console.log("\n8 evidence-based report checks passed.")
