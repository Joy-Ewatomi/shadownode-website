import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const route = await readFile("app/api/admin/cases/create/route.ts", "utf8")
const page = await readFile("app/dashboard/cases/page.tsx", "utf8")
const control = await readFile("components/cases/CreateInternalCaseControl.tsx", "utf8")

assert.match(route, /isSameOriginMutation\(request\)/)
assert.match(route, /isSuperAdministratorRole\(user\.role\)/)
assert.match(route, /withTransaction/)
assert.match(route, /INSERT INTO cases/)
assert.match(route, /INSERT INTO case_assignments/)
assert.match(route, /'lead_investigator', 'approved'/)
assert.match(route, /INSERT INTO case_updates/)
assert.match(route, /INSERT INTO audit_logs/)
assert.match(route, /'active'/)
assert.match(route, /'waived'/)
assert.doesNotMatch(route, /INSERT INTO requests/)
assert.doesNotMatch(route, /INSERT INTO payments/)

assert.match(page, /isSuperAdministratorRole\(user\.role\)/)
assert.match(page, /isSuperAdministrator \? <CreateInternalCaseControl \/>/)
assert.match(control, /new FormData\(form\)/)
assert.match(control, /window\.confirm/)
assert.match(control, /acknowledged/)
assert.match(control, /\/api\/admin\/cases\/create/)
assert.match(control, /router\.push\(payload\.destination\)/)

console.log("Super-administrator internal case creation verification passed.")
