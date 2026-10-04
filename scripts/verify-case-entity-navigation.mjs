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
assert.match(graph, /Intelligence Search/)
assert.match(graph, /Save Research Lead/)
assert.match(graph, /Domain & DNS Intelligence/)
assert.match(graph, /Not yet available/)
assert.match(graph, /Create review tasks/)
assert.match(graph, /it does not search the internet or change findings automatically/)
assert.match(osint, /manual_open_source_review/)
assert.match(osint, /configured_provider_lookup/)
assert.match(osint, /configured: false/)

console.log("Case entity navigation and research presentation verification passed.")
