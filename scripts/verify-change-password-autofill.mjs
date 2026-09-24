import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync, rmSync } from "node:fs"
import { pathToFileURL } from "node:url"

const out = "/tmp/shadownode-change-password-tests"
rmSync(out, { recursive: true, force: true })
execFileSync("npm", ["exec", "tsc", "--", "lib/password-policy.ts", "--outDir", out, "--module", "commonjs", "--target", "es2022", "--esModuleInterop", "--skipLibCheck"], { stdio: "inherit" })
const policy = await import(pathToFileURL(`${out}/password-policy.js`))
const staleState = { currentPassword: "", newPassword: "", confirmPassword: "" }
const autofilled = new Map([["currentPassword", "ExistingPass8!"], ["newPassword", "ChromeGenerated9!Safe"], ["confirmPassword", "ChromeGenerated9!Safe"]])
const submitted = policy.readChangePasswordFormValues(autofilled)
assert.equal(staleState.newPassword, "")
assert.equal(submitted.currentPassword, "ExistingPass8!")
assert.equal(submitted.newPassword, "ChromeGenerated9!Safe")
assert.equal(submitted.confirmPassword, submitted.newPassword)
assert.equal(policy.evaluatePassword(submitted.newPassword).valid, true)
const mismatch = policy.readChangePasswordFormValues(new Map([["currentPassword", "ExistingPass8!"], ["newPassword", "ChromeGenerated9!Safe"], ["confirmPassword", "DifferentPass7!"]]))
assert.equal(mismatch.newPassword === mismatch.confirmPassword, false)
const page = readFileSync("app/security/page.tsx", "utf8")
assert.match(page, /<form onSubmit=\{changePassword\}/)
assert.match(page, /new FormData\(formElement\)/)
assert.match(page, /name="currentPassword"[\s\S]*autoComplete="current-password"/)
assert.match(page, /name="newPassword"[\s\S]*autoComplete="new-password"/)
assert.match(page, /name="confirmPassword"[\s\S]*autoComplete="new-password"/)
assert.match(page, /Passwords do not match\./)
assert.doesNotMatch(page, /currentPassword: form\.currentPassword/)
console.log("Change Password autofill checks passed (13 assertions).")
