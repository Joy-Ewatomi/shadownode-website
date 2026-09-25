import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { rmSync } from "node:fs"
import { pathToFileURL } from "node:url"
import { readFileSync } from "node:fs"

process.env.APP_URL = "https://shadownodebureau.netlify.app"
const out = "/tmp/shadownode-welcome-email-test"
rmSync(out, { recursive: true, force: true })
execFileSync("npm", ["exec", "tsc", "--", "lib/email-template.ts", "lib/app-origin.ts", "--outDir", out, "--module", "commonjs", "--target", "es2022", "--esModuleInterop", "--skipLibCheck"], { stdio: "inherit" })
const { renderShadowNodeEmail } = await import(pathToFileURL(out + "/email-template.js"))
const emailSource = readFileSync("lib/email.ts", "utf8")
const delivery = readFileSync("lib/welcome-email.ts", "utf8")
const verification = readFileSync("app/api/auth/verify-email/route.ts", "utf8")
const oauth = readFileSync("app/api/auth/oauth/[provider]/callback/route.ts", "utf8")

assert.match(emailSource, /subject: "Welcome to ShadowNode Operations Bureau"/)
assert.match(emailSource, /label: "Open client portal"/)
assert.match(emailSource, /Joy Ewatomi/)
assert.match(emailSource, /Chief Executive Officer/)
assert.match(delivery, /welcome_email_deliveries/)
assert.match(delivery, /status IN \('pending', 'failed'\)/)
assert.match(delivery, /status = 'sent'/)
assert.match(delivery, /status = 'failed'/)
assert.match(verification, /registerEligibility: result\.newlyVerified/)
assert.match(oauth, /registerWelcomeEmailEligibility\(user\.id\)/)
assert.match(oauth, /registerEligibility: false/)
assert.match(oauth, /password_login_enabled: false/)

const rendered = renderShadowNodeEmail({
  preheader: "Ready",
  category: "Client account",
  heading: "Welcome",
  recipientName: "<script>alert(1)</script>",
  paragraphs: ["Portal access is ready."],
  cta: { label: "Open client portal", url: "https://shadownodebureau.netlify.app/dashboard/client" },
  closingLines: ["Warm regards,", "", "Joy Ewatomi", "Chief Executive Officer", "ShadowNode Operations Bureau Limited"],
})
assert.doesNotMatch(rendered.html, /<script>/)
assert.match(rendered.html, /&lt;script&gt;/)
assert.match(rendered.html, /https:\/\/shadownodebureau\.netlify\.app\/dashboard\/client/)
assert.match(rendered.text, /Warm regards,\n\nJoy Ewatomi\nChief Executive Officer\nShadowNode Operations Bureau Limited/)
console.log("Welcome-email rendering and idempotency checks passed.")
