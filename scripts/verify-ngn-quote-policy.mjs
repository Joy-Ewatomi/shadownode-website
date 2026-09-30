import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  AUTHORITATIVE_QUOTE_CURRENCY,
  requireAuthoritativeQuoteCurrency,
} from "../lib/quote-currency.ts"

assert.equal(AUTHORITATIVE_QUOTE_CURRENCY, "NGN")
assert.equal(requireAuthoritativeQuoteCurrency("ngn"), "NGN")
assert.throws(() => requireAuthoritativeQuoteCurrency("GBP"), /must be issued in NGN/)
assert.throws(() => requireAuthoritativeQuoteCurrency(""), /must be issued in NGN/)

const adminRoute = readFileSync("app/api/admin/requests/[id]/route.ts", "utf8")
const ownerRoute = readFileSync("app/api/admin/requests/[id]/super-admin-review/route.ts", "utf8")
const workflow = readFileSync("lib/services/quote-workflow-service.ts", "utf8")
const ownerService = readFileSync("lib/services/super-admin-quote-review-service.ts", "utf8")
const adminCard = readFileSync("components/requests/AdminRequestReviewCard.tsx", "utf8")
const ownerCard = readFileSync("components/requests/SuperAdminRequestReviewCard.tsx", "utf8")
const clientPage = readFileSync("app/dashboard/client/requests/[id]/page.tsx", "utf8")

assert.match(adminRoute, /const currency = AUTHORITATIVE_QUOTE_CURRENCY/)
assert.match(ownerRoute, /suppliedCurrency !== AUTHORITATIVE_QUOTE_CURRENCY/)
assert.match(workflow, /requireAuthoritativeQuoteCurrency\(input\.currency\)/)
assert.match(ownerService, /requireAuthoritativeQuoteCurrency\(input\.currency\)/)
assert.match(adminCard, /approved_quote_currency: "NGN"/)
assert.match(ownerCard, /const CURRENCIES = \["NGN"\]/)
assert.match(ownerCard, /amount != null && aiCurrency === "NGN"/)
assert.match(clientPage, /Payment is charged in NGN/)
assert.doesNotMatch(adminCard, /approved_quote_currency:[\s\S]{0,80}"USD"/)

console.log("NGN quotation policy verifier passed.")
