import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync, rmSync } from "node:fs"
import { pathToFileURL } from "node:url"

const out = "/tmp/shadownode-password-reset-tests"
rmSync(out, { recursive: true, force: true })
execFileSync("npm", ["exec", "tsc", "--", "lib/password-policy.ts", "lib/password-reset.ts", "lib/app-origin.ts", "lib/email-template.ts", "--outDir", out, "--module", "commonjs", "--target", "es2022", "--esModuleInterop", "--skipLibCheck"], { stdio: "inherit" })
const policy = await import(pathToFileURL(`${out}/password-policy.js`))
const resets = await import(pathToFileURL(`${out}/password-reset.js`))
const origins = await import(pathToFileURL(`${out}/app-origin.js`))
const email = await import(pathToFileURL(`${out}/email-template.js`))

assert.equal(policy.evaluatePassword("StrongPass1!").valid, true)
assert.equal(policy.evaluatePassword("mR7!vQ2#zP9@kL4$xN8&").valid, true)
assert.equal(policy.evaluatePassword(`${"A".repeat(120)}a1!`).valid, true)
assert.equal(policy.evaluatePassword(`${"A".repeat(126)}a1!`).valid, false)
assert.equal(policy.evaluatePassword("lowercase123!").checks.uppercase, false)
assert.equal(policy.evaluatePassword("UPPERCASE123!").checks.lowercase, false)
assert.equal(policy.evaluatePassword("NoNumbersHere!").checks.number, false)
assert.equal(policy.evaluatePassword("NoSpecial123A").checks.specialCharacter, false)

const componentStatePassword = ""
const autofilledPassword = "ChromeFilled9!Secure"
const fakeFormData = new Map([["newPassword", autofilledPassword], ["confirmNewPassword", autofilledPassword]])
const submitted = policy.readNewPasswordFormValues(fakeFormData)
assert.equal(componentStatePassword, "")
assert.equal(submitted.password, autofilledPassword)
assert.equal(submitted.confirmPassword, autofilledPassword)
assert.notEqual(submitted.password, componentStatePassword)
assert.equal(submitted.password === "different", false)

const now = new Date("2026-09-24T12:00:00Z")
assert.equal(resets.isUsablePasswordReset(null, now), false)
assert.equal(resets.isUsablePasswordReset({ expires_at: "invalid", used_at: null }, now), false)
assert.equal(resets.isUsablePasswordReset({ expires_at: "2026-09-24T11:59:59Z", used_at: null }, now), false)
assert.equal(resets.isUsablePasswordReset({ expires_at: "2026-09-24T12:15:00Z", used_at: "2026-09-24T11:00:00Z" }, now), false)
assert.equal(resets.isUsablePasswordReset({ expires_at: "2026-09-24T12:15:00Z", used_at: null }, now), true)

const cleanOrigin = "https://shadownodebureau.netlify.app"
assert.equal(origins.validateApplicationOrigin(cleanOrigin, true), cleanOrigin)
assert.equal(origins.validateApplicationOrigin("APP_URL=https://shadownodebureau.netlify.app", true), null)
assert.equal(origins.validateApplicationOrigin("app_url=https://shadownodebureau.netlify.app", true), null)
assert.equal(origins.validateApplicationOrigin("[ShadowNode](https://shadownodebureau.netlify.app)", true), null)
assert.equal(origins.validateApplicationOrigin("https://user:pass@shadownodebureau.netlify.app", true), null)
assert.equal(origins.validateApplicationOrigin("https://shadownodebureau.netlify.app/path", true), null)
assert.equal(origins.validateApplicationOrigin("https://shadownodebureau.netlify.app?source=x", true), null)
assert.equal(origins.validateApplicationOrigin("https://shadownodebureau.netlify.app#fragment", true), null)
assert.equal(origins.validateApplicationOrigin("shadownodebureau.netlify.app", true), null)
const fallback = origins.resolveTrustedApplicationOrigin({ APP_URL: "APP_URL=https://invalid.example", NEXT_PUBLIC_APP_URL: cleanOrigin, URL: "https://fallback.example", DEPLOY_PRIME_URL: "https://preview.example" }, true)
assert.deepEqual(fallback, { origin: cleanOrigin, source: "NEXT_PUBLIC_APP_URL" })
const resetUrl = origins.createPasswordResetActionUrl("test-token-placeholder", cleanOrigin)
assert.equal(resetUrl, "https://shadownodebureau.netlify.app/reset-password?token=test-token-placeholder")
const priorAppUrl = process.env.APP_URL
process.env.APP_URL = cleanOrigin
const rendered = email.renderShadowNodeEmail({ preheader: "Security notice", category: "Account security", heading: "Reset your password", paragraphs: ["Use the secure link."], cta: { label: "Reset password", url: resetUrl, showFallbackUrl: true } })
if (priorAppUrl === undefined) delete process.env.APP_URL
else process.env.APP_URL = priorAppUrl
assert.ok(rendered.html.includes(resetUrl))
assert.ok(rendered.text.includes(resetUrl))

const page = readFileSync("app/reset-password/page.tsx", "utf8")
const route = readFileSync("app/api/auth/reset-password/route.ts", "utf8")
assert.match(page, /new FormData\(event\.currentTarget\)/)
assert.match(page, /name="newPassword"[\s\S]*autoComplete="new-password"/)
assert.match(page, /name="confirmNewPassword"[\s\S]*autoComplete="new-password"/)
assert.match(page, /Passwords do not match/)
assert.match(route, /FOR UPDATE/)
assert.match(route, /used_at = NOW\(\)[\s\S]*used_at IS NULL/)
assert.match(route, /password_reset_failed[\s\S]*15 minutes/)
assert.match(route, /total \|\| 0\) >= 10/)
assert.doesNotMatch(route, /console\.(?:log|error)[\s\S]*(?:password|token)/i)
assert.doesNotMatch(route, /json\(\{[^}]*\b(?:password|token)\b\s*:/i)
console.log("Password reset checks passed (42 assertions).")
