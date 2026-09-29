import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { paymentStatusDestination } from "../lib/payment-redirect.ts";

const trainingId = "11111111-1111-4111-8111-111111111111";
const requestId = "22222222-2222-4222-8222-222222222222";
const caseId = "33333333-3333-4333-8333-333333333333";

const paidTraining = {
  success: true,
  status: "paid",
  request_id: requestId,
  training_engagement_id: trainingId,
};

assert.equal(
  paymentStatusDestination(paidTraining),
  `/dashboard/training/${trainingId}`,
);
assert.equal(
  paymentStatusDestination({
    success: true,
    status: "paid",
    request_id: requestId,
    case_id: caseId,
  }),
  `/dashboard/client/cases/${caseId}`,
);

for (const result of [
  { success: false, status: "pending", training_engagement_id: trainingId },
  { success: false, status: "failed", training_engagement_id: trainingId },
  { success: false, status: "amount_mismatch", training_engagement_id: trainingId },
]) {
  assert.equal(
    paymentStatusDestination(result, requestId),
    `/dashboard/client/payments/${requestId}`,
  );
}

assert.equal(
  paymentStatusDestination(paidTraining),
  paymentStatusDestination({ ...paidTraining }),
  "Duplicate paid callbacks retain the same destination",
);

const paystack = readFileSync("app/api/client/payments/callback/route.ts", "utf8");
const flutterwave = readFileSync("app/api/client/payments/flutterwave/callback/route.ts", "utf8");
const trainingLayout = readFileSync("app/dashboard/training/[id]/layout.tsx", "utf8");
const history = readFileSync("components/requests/CommercialHistoryPanel.tsx", "utf8");
const paystackService = readFileSync("lib/services/paystack-payment-service.ts", "utf8");
const completion = readFileSync("lib/services/payment-completion-service.ts", "utf8");
const accessService = readFileSync("lib/services/training-operations-service.ts", "utf8");

for (const callback of [paystack, flutterwave]) {
  assert.match(callback, /paymentStatusDestination/);
  assert.doesNotMatch(callback, /dashboard\/client\/training\//);
}
assert.match(paystack, /JOIN requests r ON r\.id = p\.request_id[\s\S]*r\.user_id = \$2/);
assert.match(flutterwave, /r\.user_id=\$2/);
assert.match(history, /dashboard\/training\/\$\{history\.destination\.id\}/);

assert.match(paystackService, /if \(payment\.status === "paid"\)/);
assert.match(paystackService, /already_processed: true/);
assert.match(completion, /if \(payment\.status === "paid"\)/);
assert.match(completion, /already_processed: !completed\.newlyCompleted/);
assert.match(trainingLayout, /profile\?\.user_id === user\.id/);
assert.match(trainingLayout, /!canViewTraining && !isOwner && !isAssignedTrainer/);
assert.match(trainingLayout, /ensureAccess\(id, user, false\)/);
assert.match(accessService, /engagement\.client_profile_id !== profileId/);
assert.match(accessService, /engagement\.payment_status !== "paid"/);

console.log("Payment training redirect verifier passed.");
