import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const read = (path) => readFile(path, "utf8")
const [landing, casePage, domainPage, domainUi, people, api, shell, sidebar, graph] = await Promise.all([
  read("app/dashboard/intelligence/page.tsx"),
  read("app/dashboard/cases/[id]/page.tsx"),
  read("app/dashboard/intelligence/domains/page.tsx"),
  read("components/intelligence/DomainIntelligenceWorkspace.tsx"),
  read("app/dashboard/intelligence/people/page.tsx"),
  read("app/api/intelligence/domains/analyze/route.ts"),
  read("components/dashboard/DashboardShell.tsx"),
  read("components/dashboard/Sidebar.tsx"),
  read("app/cases/[id]/graph/page.tsx"),
])

for (const name of ["Domain & DNS Intelligence", "People Intelligence", "Email Intelligence", "Company Intelligence", "Phone Intelligence", "Social Intelligence", "Entity Graph"]) {
  assert.match(landing, new RegExp(name.replace(/[&]/g, "&")))
  assert.match(casePage, new RegExp(name.replace(/[&]/g, "&")))
}
assert.match(landing, /Not Yet Available/)
assert.match(landing, /SDIA currently powers Domain & DNS Intelligence only/)
assert.doesNotMatch(landing, /Open Module/)
assert.match(people, /redirect\("\/dashboard\/intelligence"\)/)
assert.doesNotMatch(people, /Investigate|useState|fetch\(/)

assert.match(casePage, /dashboard\/intelligence\/domains\?case_id=/)
assert.match(casePage, /\/cases\/\$\{caseId\}\/graph/)
assert.match(domainPage, /if \(requested && !selectedCase\) notFound\(\)/)
assert.match(domainUi, /lockedCase/)
assert.match(domainUi, /Authorized case locked/)
assert.match(domainUi, /Results are not permanently saved/)
assert.equal((domainUi.match(/\/api\/intelligence\/domains\/analyze/g) || []).length, 1)
assert.match(api, /requireCaseOperationalAccess\(request, caseId\)/)
assert.match(api, /sdia_domain_analysis_completed/)
assert.match(api, /persisted: false/)

assert.match(shell, /graphWorkspace/)
assert.match(shell, /lg:pl-20/)
assert.match(sidebar, /Collapse dashboard sidebar/)
assert.match(graph, /inspectorOpen/)
assert.match(graph, /Intelligence search/)
assert.match(graph, /setInspectorOpen\(true\)/)
assert.match(graph, /lg:grid-cols-\[260px_minmax\(0,1fr\)\]/)

console.log("Intelligence architecture verification passed.")
