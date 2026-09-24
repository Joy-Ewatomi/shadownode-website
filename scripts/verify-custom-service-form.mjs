import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
const form = read("components/requests/CustomRequestForm.tsx")
const page = read("app/dashboard/client/requests/custom/page.tsx")

assert.match(form, /const STEPS = \[/)
for (const label of ["Service overview", "Requirements", "Supporting material", "Schedule and budget", "Review and submit"]) {
  assert.match(form, new RegExp(label, "i"))
}

assert.match(form, /if \(target === 1 && !data\.objective\.trim\(\)\)/)
assert.match(form, /setData\(\(current\) => \(\{ \.\.\.current, \[key\]: value \}\)\)/)
assert.match(form, /supportingLinks: \[""\]/)
assert.match(form, /function addLink\(\)/)
assert.match(form, /function removeLink\(index: number\)/)
assert.match(form, /scheduleError\(data\.preferredStartDate, data\.preferredEndDate\)/)
assert.match(form, /suggestedCurrencyForCountry\(country\)/)
assert.match(form, /SummaryItem/)
assert.match(form, /submitLocked\.current/)
assert.match(form, /await onSubmit\(\{/)
assert.match(form, /\.\.\.requestData/)
assert.match(form, /Existing documents or references:/)
assert.match(page, /Uploading \$\{files\.length\} supporting/)
assert.match(page, /\/evidence/)

assert.match(form, /aria-current=/)
assert.match(form, /aria-expanded=/)
assert.match(form, /aria-invalid=/)
assert.match(form, /aria-label=\{\`Remove supporting link/)
assert.match(form, /min-h-11/)
assert.match(form, /overflow-x-hidden/)
assert.match(form, /grid min-w-0/)
assert.match(form, /motion-reduce:animate-none/)

const visibleCopy = form
  .replace(/export type CustomRequestData[\s\S]*?^}/m, "")
  .replace(/className="[^"]*"/g, "")

for (const prohibited of ["intelligence objective", "suspect", "subject / target"]) {
  assert.doesNotMatch(visibleCopy, new RegExp(prohibited, "i"))
}
for (const internal of ["ai_analysis", "ai_reasoning", "admin_recommendation", "super_admin_decision"]) {
  assert.doesNotMatch(form, new RegExp(internal))
}

assert.match(form, /What would you like ShadowNode to accomplish\?/)
assert.match(form, /administrator reviews the request and a super administrator makes the final/)
assert.match(form, /does not guarantee acceptance/)

console.log("Custom service form presentation verification passed.")
