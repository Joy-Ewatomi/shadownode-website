import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync, rmSync } from "node:fs"
import { pathToFileURL } from "node:url"

const out = "/tmp/shadownode-security-center-phase2"
rmSync(out, { recursive: true, force: true })
execFileSync("npm", ["exec", "tsc", "--", "lib/security-center.ts", "--outDir", out, "--module", "commonjs", "--target", "es2022", "--esModuleInterop", "--skipLibCheck"], { stdio: "inherit" })
const helpers = await import(pathToFileURL(`${out}/security-center.js`))
const codes = helpers.generateRecoveryCodes()
assert.equal(codes.length, 10)
assert.equal(new Set(codes).size, 10)
const stored = helpers.serializeRecoveryCodeHashes(codes)
assert.equal(codes.some((code) => stored.includes(code)), false)
const consumed = helpers.consumeRecoveryCode(stored, codes[0])
assert.equal(consumed.valid, true)
assert.equal(helpers.consumeRecoveryCode(consumed.remaining, codes[0]).valid, false)
assert.equal(helpers.consumeRecoveryCode(stored, "WRONG-CODE").valid, false)
assert.equal(helpers.deletionCoolingOffDate(new Date("2026-01-01T00:00:00Z")).toISOString(), "2026-01-31T00:00:00.000Z")
const page = readFileSync("app/security/page.tsx", "utf8")
for (const label of ["Change Password", "Disable 2FA", "Recovery Codes", "Delete Account Request"]) assert.ok(page.includes(label))
assert.ok(page.includes("scrollIntoView"))
assert.ok(page.includes("aria-pressed"))
const deletion = readFileSync("app/api/auth/account-deletion/route.ts", "utf8")
assert.ok(deletion.includes("cooling_off_ends_at"))
assert.equal(deletion.includes("DELETE FROM app_users"), false)
console.log("Security Center Phase 2 checks passed (10 assertions).")
