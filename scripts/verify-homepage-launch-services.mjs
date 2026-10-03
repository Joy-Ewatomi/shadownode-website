import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const homepage = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8")

assert.match(homepage, /const SHOW_PLANNED_SERVICES = false/)
assert.match(homepage, /SHOW_PLANNED_SERVICES &&/)
assert.match(homepage, /Future services are retained here and hidden until launch/)
assert.match(homepage, /href="\/services\/osint"/)
assert.match(homepage, /href="\/services\/cybersecurity-training"/)
assert.match(homepage, /Lawful OSINT\./)
assert.match(homepage, /Practical cybersecurity training\./)
assert.match(homepage, /href="\/contact"/)
assert.match(homepage, /SUBMIT A SERVICE REQUEST/)
assert.match(homepage, /mx-auto max-w-6xl md:grid-cols-2/)
assert.match(homepage, /grid-cols-1 gap-6/)
assert.equal((homepage.match(/lg:aspect-\[16\/9\]/g) || []).length, 2)
assert.equal((homepage.match(/min-h-\[18rem\]/g) || []).length, 2)
assert.match(homepage, /https:\/\/www\.linkedin\.com\/in\/joy-ewatomi-559250366\//)
assert.doesNotMatch(homepage, /href: "https:\/\/linkedin\.com"/)
assert.doesNotMatch(homepage, /CLASSIFIED INTELLIGENCE DIVISION/)
assert.doesNotMatch(homepage, /INITIALIZE SECURE PORTAL/)

for (const retainedService of [
  "DIGITAL FORENSICS",
  "ETHICAL HACKING",
  "GOVERNMENT CONSULTING",
  "CORRECTIONAL INTELLIGENCE",
  "LEGAL ADVISORY",
  "RESEARCH",
  "OPSEC CONSULTING",
]) {
  assert.match(homepage, new RegExp(retainedService))
}

console.log("Homepage launch-services verifier passed.")
