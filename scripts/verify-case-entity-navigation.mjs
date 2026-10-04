import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const layout = await readFile("app/cases/[id]/layout.tsx", "utf8")
const graph = await readFile("app/cases/[id]/graph/page.tsx", "utf8")
const osint = await readFile("lib/osint-workspace.ts", "utf8")

for (const label of ["Case Overview", "Entities", "Timeline", "Evidence", "Reports", "Case Activity"]) {
  assert.match(layout, new RegExp(`>${label}<`))
}
assert.doesNotMatch(layout, />Workspace</)
assert.doesNotMatch(layout, />Graph</)
assert.match(layout, /href={`\/cases\/\$\{id\}\/graph`}>Entities/)

assert.match(graph, /Entity Types/)
assert.doesNotMatch(graph, /Entity Palette/)
assert.match(graph, /Research & Review/)
assert.match(graph, /Stage Research Lead/)
assert.match(graph, /External provider lookup remains unavailable until a provider is configured/)
assert.match(osint, /manual_open_source_review/)
assert.match(osint, /configured_provider_lookup/)
assert.match(osint, /configured: false/)

console.log("Case entity navigation and research presentation verification passed.")
