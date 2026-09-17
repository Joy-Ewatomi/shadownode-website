import { readFileSync } from "node:fs"
import { join } from "node:path"
import process from "node:process"

const root = process.cwd()

function read(path) {
  return readFileSync(join(root, path), "utf8")
}

const checks = [
  {
    file: "scripts/osint-graph-workspace.sql",
    patterns: [
      "CREATE TABLE IF NOT EXISTS osint_search_results",
      "CREATE TABLE IF NOT EXISTS relationship_sources",
      "CREATE TABLE IF NOT EXISTS entity_evidence",
      "CREATE TABLE IF NOT EXISTS relationship_evidence",
      "CREATE UNIQUE INDEX IF NOT EXISTS entity_positions_entity_unique",
      "investigation_entities_original_result_fk",
      "search_time_ms integer",
    ],
  },
  {
    file: "scripts/osint-graph-audit.md",
    patterns: [
      "Existing Graph Surfaces",
      "Existing Tables Reused",
      "Authorization Observed And Preserved",
      "Provider Boundary",
    ],
  },
  {
    file: "scripts/osint-graph-runbook.md",
    patterns: [
      "scripts/osint-graph-workspace.sql",
      "Case Graph Smoke Test",
      "Provider Safety",
      "manual_open_source_review",
    ],
  },
  {
    file: "lib/osint-workspace.ts",
    patterns: [
      "VERIFICATION_STATES",
      "ENTITY_PALETTE",
      "OSINT_TRANSFORMS",
      "OsintProviderConnector",
      "configured_provider_lookup",
    ],
  },
  {
    file: "app/api/cases/[id]/graph/osint/route.ts",
    patterns: [
      "requireInvestigationWorkspace",
      "osint_search_results",
      "withTransaction",
      "Selected provider transform is not configured",
      "imported_with_relationship",
    ],
  },
  {
    file: "app/api/cases/[id]/graph/provenance/route.ts",
    patterns: [
      "entity_sources",
      "relationship_sources",
      "entity_evidence",
      "relationship_evidence",
    ],
  },
  {
    file: "app/api/cases/[id]/graph/automation/route.ts",
    patterns: [
      "investigation_tasks",
      "graph_automation_run",
      "verification_status IN",
      "confidence_score < 50",
    ],
  },
  {
    file: "app/cases/[id]/graph/page.tsx",
    patterns: [
      "Entity Palette",
      "Search & Review",
      "Provenance Linker",
      "Review State",
      "Automate",
      "Stage Search Result",
    ],
  },
  {
    file: "app/api/cases/[id]/reports/route.ts",
    patterns: [
      "GRAPH PROVENANCE LINKS",
      "graph_provenance",
      "relationship_sources",
      "entity_evidence",
      "relationship_evidence",
    ],
  },
]

const failures = []

for (const check of checks) {
  const content = read(check.file)

  for (const pattern of check.patterns) {
    if (!content.includes(pattern)) {
      failures.push(`${check.file}: missing ${pattern}`)
    }
  }
}

if (failures.length > 0) {
  console.error("OSINT graph verification failed:")
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log("OSINT graph verification passed.")
