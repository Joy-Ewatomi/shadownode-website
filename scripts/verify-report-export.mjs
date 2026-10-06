import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
const exportRoute = read("app/api/reports/[id]/export/route.ts")
const reportRoute = read("app/api/cases/[id]/reports/route.ts")

assert.match(exportRoute, /buildGraphExhibit/)
assert.match(exportRoute, /Intelligence Graph Exhibit/)
assert.match(exportRoute, /Relationship Register/)
assert.match(exportRoute, /Investigation and Case Timeline/)
assert.match(exportRoute, /Evidence Register and Chain of Custody/)
assert.match(exportRoute, /Integrity Manifest/)
assert.match(exportRoute, /createHash\("sha256"\)/)
assert.match(exportRoute, /case_report_entities source_report_entity/)
assert.match(exportRoute, /source_reference/)
assert.match(exportRoute, /do not independently prove ownership or wrongdoing/)
assert.match(exportRoute, /does not by itself establish admissibility/)
assert.match(reportRoute, /independent reviewer can distinguish direct/)
assert.match(reportRoute, /native\s+evidence from intelligence/)
assert.match(reportRoute, /Do not infer the governing country/)
assert.match(reportRoute, /keep the report jurisdiction-neutral/)
assert.doesNotMatch(reportRoute, /Nigeria|Nigerian Evidence Act|section 84/i)
assert.doesNotMatch(exportRoute, /Nigeria|Nigerian Evidence Act|section 84/i)

console.log("Report export verifier passed.")
