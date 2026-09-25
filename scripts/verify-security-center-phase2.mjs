import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { deletionCoolingOffDate } from "../lib/security-center.ts"

assert.equal(deletionCoolingOffDate(new Date("2026-01-01T00:00:00Z")).toISOString(), "2026-01-31T00:00:00.000Z")
const page = readFileSync("app/security/page.tsx", "utf8")
for (const label of ["Change Password", "Disable 2FA", "Recovery Codes", "Delete Account Request"]) assert.ok(page.includes(label))
assert.ok(page.includes("scrollIntoView"))
assert.ok(page.includes("aria-pressed"))
assert.ok(page.includes("Copy all"))
assert.ok(page.includes("Download as text"))
const deletion = readFileSync("app/api/auth/account-deletion/route.ts", "utf8")
assert.ok(deletion.includes("cooling_off_ends_at"))
assert.equal(deletion.includes("DELETE FROM app_users"), false)
console.log("Security Center Phase 2 checks passed.")
