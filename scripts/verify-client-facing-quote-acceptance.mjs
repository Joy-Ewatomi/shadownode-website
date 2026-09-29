import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const history = readFileSync("lib/services/commercial-history-service.ts", "utf8");
const decision = readFileSync("app/api/client/requests/[id]/decision/route.ts", "utf8");
const classification = readFileSync("lib/services/request-engagement-classification.ts", "utf8");

assert.match(classification, /"digital_safety"/);
assert.match(history, /client_currency_snapshot/);
assert.match(history, /supersedes_quote_version_id/);
assert.match(history, /creator_role IN \('administrator', 'super_administrator', 'super-administrator'\)/);
assert.match(history, /status IN \('approved', 'issued', 'quote_sent', 'revised_quote_sent'\)/);
assert.match(history, /price, currency/);
assert.match(history, /accepted_quote_version_id/);
assert.doesNotMatch(history, /creator_role IN \('client'/);
assert.match(decision, /isSameOriginMutation/);
assert.match(decision, /convertAcceptedRequestToTrainingEngagement/);

console.log("Client-facing quote acceptance verifier passed.");
