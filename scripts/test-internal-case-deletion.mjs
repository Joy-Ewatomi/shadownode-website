import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")

const [route, control, casesPage] = await Promise.all([
  read("app/api/admin/cases/[id]/internal/route.ts"),
  read("components/cases/DeleteInternalCaseControl.tsx"),
  read("app/dashboard/cases/page.tsx"),
])

assert.match(route, /isSameOriginMutation/, "Internal case deletion must reject cross-site mutations.")
assert.match(route, /isSuperAdministratorRole/, "Internal case deletion must require a super administrator.")
assert.match(route, /client_profile_id IS NULL/, "Only non-client internal cases may be deleted.")
assert.match(route, /internal_case_created/, "Deletion must identify an internally created case.")
assert.match(route, /confirmation !== caseRecord\.case_number/, "Deletion must require the exact case-number confirmation.")
assert.match(route, /CASE_NOT_EMPTY/, "Deletion must fail when protected investigation records exist.")
assert.match(route, /extra_update_count/, "Deletion must preserve internal cases with additional update history.")
assert.match(route, /extra_assignment_count/, "Deletion must preserve internal cases with additional assignment history.")
assert.match(route, /DELETE FROM case_assignments/, "Internal workspace assignment records must be removed before the empty case.")
assert.match(route, /DELETE FROM case_updates/, "Internal workspace creation updates must be removed before the empty case.")
assert.match(route, /internal_case_deleted/, "Internal case deletion must be audited.")
assert.match(control, /window\.prompt/, "The user must explicitly confirm permanent deletion.")
assert.match(control, /Delete internal case/, "The internal-case delete action must be visible.")
assert.match(casesPage, /is_internal_case/, "The dashboard must identify internal cases server-side.")
assert.match(casesPage, /DeleteInternalCaseControl/, "The dashboard must expose deletion only for internal cases.")

console.log("Internal case deletion checks passed.")
