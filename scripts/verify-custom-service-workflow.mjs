import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

const workflow = read("lib/custom-request-workflow.ts")
const createRoute = read("app/api/client/requests/custom/route.ts")
const adminRoute = read("app/api/admin/requests/[id]/custom-recommendation/route.ts")
const decisionRoute = read("app/api/admin/requests/[id]/custom-decision/route.ts")
const amendmentRoute = read("app/api/client/requests/[id]/additional-information/route.ts")
const clientRoute = read("app/api/client/requests/[id]/route.ts")
const form = read("components/requests/CustomRequestForm.tsx")
const migration = read("scripts/custom-service-workflow.sql")

assert.match(workflow, /objective: requiredText/)
assert.match(workflow, /authorizationConfirmed !== true \|\| input\.termsAccepted !== true/)
assert.match(workflow, /A maximum of 10 links/)
assert.match(workflow, /preferredEndDate < preferredStartDate/)
assert.match(workflow, /approve_for_quote: "approved_for_quote"/)
assert.match(workflow, /request_more_information: "more_information_required"/)

assert.match(createRoute, /isSameOriginMutation/)
assert.match(createRoute, /user\.role !== "client"/)
assert.match(createRoute, /withTransaction/)
assert.match(createRoute, /ON CONFLICT \(user_id, submission_key\)/)
assert.match(createRoute, /custom_request_submitted/)
assert.match(createRoute, /Promise\.allSettled/)
assert.doesNotMatch(createRoute, /INSERT INTO (cases|payments|training_engagements)/)

assert.match(adminRoute, /user\.role !== "administrator"/)
assert.match(workflow, /return "pending_super_admin_review"/)
assert.doesNotMatch(adminRoute, /approved_quote_amount|quote_sent/)
assert.match(decisionRoute, /super_administrator/)
assert.match(decisionRoute, /body\.confirmed !== true/)
assert.match(decisionRoute, /internalReason/)
assert.match(decisionRoute, /clientMessage/)
assert.match(decisionRoute, /FOR UPDATE/)

assert.match(amendmentRoute, /AND user_id = \$2 FOR UPDATE/)
assert.match(amendmentRoute, /request_amendments/)
assert.match(clientRoute, /internal_decision_reason: _internalDecisionReason/)
assert.match(clientRoute, /admin_recommendation: _adminRecommendation/)

assert.match(form, /What would you like ShadowNode to accomplish\?/)
assert.match(form, /authorizationConfirmed/)
assert.match(form, /termsAccepted/)
assert.match(form, /billingCountry/)
assert.match(form, /supporting files/i)

assert.match(migration, /ADD COLUMN IF NOT EXISTS custom_details/)
assert.match(migration, /CREATE TABLE IF NOT EXISTS request_amendments/)
assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_requests_custom_submission_key/)

const sensitiveClientFields = ["internal_decision_reason", "admin_recommendation", "super_admin_decision", "submission_key"]
for (const field of sensitiveClientFields) {
  assert.match(clientRoute, new RegExp(`${field}: _`))
}

console.log("Custom service workflow verification passed.")
