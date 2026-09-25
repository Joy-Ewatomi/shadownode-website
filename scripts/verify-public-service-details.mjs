import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
const page = read("app/page.tsx")
const details = read("components/public/ServiceTrackDetails.tsx")
const route = read("app/api/public/service-launch-interest/route.ts")
const migration = read("scripts/service-launch-interests.sql")

for (const key of ["osint", "forensics", "hacking", "gov", "correctional", "legal", "research", "opsec"]) {
  assert.match(page, new RegExp(`handleTrackToggle\\('${key}'\\)`))
  assert.match(details, new RegExp(`\\b${key}: \\{`))
}

for (const phrase of [
  "Target logics", "System matrices", "Flaw categorization matrix",
  "Long-duration footprint probing", "Combat environments", "Master imaging",
  "Hard core deleted", "Recidivism prediction", "Expert witness",
]) {
  assert.doesNotMatch(details, new RegExp(phrase, "i"))
}

for (const key of [
  "digital_forensics", "ethical_hacking", "government_consulting",
  "correctional_intelligence", "legal_advisory",
  "research_threat_intelligence", "opsec_consulting",
]) {
  assert.match(details, new RegExp(`serviceKey: "${key}"`))
  assert.match(route, new RegExp(`"${key}"`))
  assert.match(migration, new RegExp(`'${key}'`))
}

assert.match(route, /isSameOriginMutation/)
assert.match(route, /email\.length > 254/)
assert.match(route, /ON CONFLICT \(service_key, \(lower\(email_normalized\)\)\)/)
assert.match(route, /submission_count[^]*> 10/)
assert.match(route, /status: 429/)
assert.match(route, /status: 503/)
assert.doesNotMatch(route, /console\.(log|info|warn|error)/)
assert.doesNotMatch(route, /export async function GET/)
assert.match(details, /if \(!response\.ok\) throw/)
assert.match(details, /name="email"/)
assert.match(details, /autoComplete="email"/)
assert.match(details, /role="alert"/)
assert.match(page, /role="dialog"/)
assert.match(page, /aria-modal="true"/)
assert.match(page, /event\.key === 'Escape'/)
assert.match(page, /event\.key === 'Tab'/)
assert.match(page, /useReducedMotion/)
assert.match(page, /max-h-\[calc\(100dvh-2rem\)\]/)
assert.match(details, /href="\/request"/)
assert.match(migration, /CREATE TABLE IF NOT EXISTS service_launch_interests/)
assert.doesNotMatch(page + details, /\/api\/notifications|\/api\/client\/requests/)

console.log("Public service details and launch-interest verifier passed.")
