import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
const config = read("lib/payments/flutterwave.ts")
const initialize = read("app/api/client/payments/flutterwave/initialize/route.ts")
const callback = read("app/api/client/payments/flutterwave/callback/route.ts")
const webhook = read("app/api/client/payments/flutterwave/webhook/route.ts")
const verification = read("lib/services/flutterwave-payment-service.ts")
const completion = read("lib/services/payment-completion-service.ts")
const providers = read("app/api/client/payments/providers/route.ts")
const paymentPage = read("app/dashboard/client/payments/[id]/page.tsx")
const migration = read("scripts/flutterwave-payment-provider.sql")
const history = read("lib/services/commercial-history-service.ts")

assert.match(config, /FLWSECK_TEST-/)
assert.match(config, /FLWPUBK_TEST-/)
assert.match(config, /createHmac\("sha256"/)
assert.match(config, /timingSafeEqual/)
assert.match(config, /"TZS"/)
assert.doesNotMatch(config, /NEXT_PUBLIC_FLUTTERWAVE/)

assert.match(initialize, /isSameOriginMutation/)
assert.match(initialize, /r\.user_id = \$2/)
assert.match(initialize, /q\.id = r\.accepted_quote_version_id/)
assert.match(initialize, /crypto\.randomBytes/)
assert.match(initialize, /INSERT INTO payments/)
assert.match(initialize, /'flutterwave'/)
assert.match(initialize, /getTrustedApplicationOrigin/)
assert.doesNotMatch(initialize, /body\.(amount|currency|client_id|quote_id|callback)/)

assert.match(callback, /verifyAndCompleteFlutterwavePayment/)
assert.doesNotMatch(callback, /status.*===.*successful|UPDATE payments/)
assert.match(webhook, /request\.text\(\)/)
assert.match(webhook, /flutterwave-signature/)
assert.match(webhook, /verifyAndCompleteFlutterwavePayment/)

assert.match(verification, /transactions\/\$\{encodeURIComponent\(transactionId\)\}\/verify/)
assert.match(verification, /data\.tx_ref !== txRef/)
assert.match(verification, /expected !== received/)
assert.match(verification, /currency.*toUpperCase/)
assert.match(completion, /FOR UPDATE OF p, r, q/)
assert.match(completion, /status = 'paid'/)
assert.match(completion, /status = 'cancelled'/)
assert.match(completion, /recordRequestAudit/)
assert.match(completion, /newlyCompleted/)

assert.match(providers, /flutterwaveSupportsCurrency\(currency\)/)
assert.match(paymentPage, /PaymentProvider = "paystack" \| "flutterwave"/)
assert.match(paymentPage, /request\.commercial_history\?\.status === "paid"/)
assert.match(history, /provider/)
assert.match(migration, /provider_transaction_id/)
assert.match(migration, /initiated_at/)

const forbidden = ["FLWSECK_TEST-actual", "FLWSECK_LIVE-", "card_number", "cvv", "mobile_money_pin"]
for (const value of forbidden) {
  assert.doesNotMatch(initialize + callback + webhook, new RegExp(value, "i"))
}

console.log("Flutterwave integration verifier passed.")
