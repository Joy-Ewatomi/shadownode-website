import assert from "node:assert/strict"
import fs from "node:fs"

const route = fs.readFileSync("app/api/cases/[id]/graph/verification/route.ts", "utf8")
assert.match(route, /requireCaseOperationalAccess\(request, id\)/)
assert.match(route, /ff\.case_id=\$2/)
assert.match(route, /src\.case_id=\$2/)
assert.match(route, /analysis_results WHERE id=\$1 AND case_id=\$2/)
assert.match(route, /content_available: contentAvailable/)
assert.match(route, /raw: buffer/)
assert.doesNotMatch(route, /raw_content:\s*JSON\.stringify\(record\)/)
assert.match(route, /integrity_error: "The authoritative SDIA canonical manifest verifier is not available/)
assert.match(route, /ORDER BY src\.collected_at ASC NULLS LAST, src\.id ASC/)
assert.match(route, /ORDER BY ff\.created_at ASC, ff\.id ASC/)
assert.match(route, /ORDER BY er\.target_entity_id ASC, er\.source_entity_id ASC, er\.created_at ASC, er\.id ASC/)
assert.match(route, /for \(const endpointId of \[target\.source_entity_id, target\.target_entity_id\]\)/)
console.log("Intelligence verifier route contract checks passed.")
