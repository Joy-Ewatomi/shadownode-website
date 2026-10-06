import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
const taxonomy = read("lib/intelligence-domains.ts")
const workspace = read("app/dashboard/intelligence/page.tsx")
const casePage = read("app/dashboard/cases/[id]/page.tsx")
const graph = read("app/cases/[id]/graph/page.tsx")

for (const domain of [
  "People Intelligence", "Company Intelligence", "Domain & Infrastructure Intelligence",
  "Image Intelligence", "Document Intelligence", "Geo Intelligence", "Threat Intelligence",
  "Financial / Business Intelligence", "Case Intelligence",
]) assert.match(taxonomy, new RegExp(domain.replace(/[&/]/g, "\\$&")))

for (const capability of ["Email", "Phone", "Username", "Social", "Identity Resolution"]) {
  assert.match(taxonomy, new RegExp(`\\b${capability}\\b`))
}

assert.match(workspace, /INTELLIGENCE_DOMAINS/)
assert.match(casePage, /INTELLIGENCE_DOMAINS/)
assert.match(graph, /INTELLIGENCE_DOMAINS/)
assert.doesNotMatch(workspace, /title: "Email Intelligence"/)
assert.doesNotMatch(workspace, /title: "Phone Intelligence"/)
assert.doesNotMatch(workspace, /title: "Social Intelligence"/)
assert.match(workspace, /Eight intelligence domains feed Case Intelligence/)

console.log("Intelligence ecosystem verifier passed.")
