import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const operations = read("lib/services/training-operations-service.ts");
const genericPayment = read("lib/services/payment-completion-service.ts");
const paystackPayment = read("lib/services/paystack-payment-service.ts");
const clientList = read("app/dashboard/client/training/page.tsx");
const clientCards = read(
  "app/dashboard/client/training/TrainingNotificationList.tsx",
);
const trainingLayout = read("app/dashboard/training/[id]/layout.tsx");
const caseAccess = read("lib/investigation-workspace.ts");

assert.ok(
  operations.includes("preferred_start_date > CURRENT_DATE AS client_locked"),
);
assert.ok(
  operations.includes(
    "preferred_completion_date < CURRENT_DATE AS lifecycle_ended",
  ),
);
assert.ok(
  !operations.includes(
    "preferred_completion_date <= CURRENT_DATE AS lifecycle_ended",
  ),
);
assert.ok(operations.includes('mode === "write" && lifecycle === "completed"'));
assert.ok(operations.includes("Training access opens on"));
assert.ok(operations.includes("status = 'active'"));
assert.ok(operations.includes("status = 'scheduled'"));

for (const payment of [genericPayment, paystackPayment]) {
  assert.ok(payment.includes("preferred_start_date > CURRENT_DATE"));
  assert.ok(payment.includes("THEN 'scheduled'"));
  assert.ok(payment.includes("preferred_start_date <= CURRENT_DATE"));
}

assert.ok(clientList.includes("client_locked"));
assert.ok(clientList.includes("lifecycle_completed"));
assert.ok(clientCards.includes('aria-disabled="true"'));
assert.ok(clientCards.includes("Opens {r.preferred_start_date}"));
assert.ok(trainingLayout.includes("The assigned trainer may prepare the"));
assert.ok(trainingLayout.includes("client training"));
assert.ok(caseAccess.includes("estimated_completion < CURRENT_DATE"));
assert.ok(!caseAccess.includes("estimated_completion <= CURRENT_DATE"));
assert.ok(caseAccess.includes("This case is complete and is now read-only."));
assert.ok(caseAccess.includes("SET status = 'completed'"));

for (const file of [
  "app/api/training/[id]/assign/route.ts",
  "app/api/training/[id]/plan/route.ts",
  "app/api/training/[id]/schedule/route.ts",
  "app/api/training/[id]/materials/route.ts",
  "app/api/training/[id]/progress/route.ts",
  "app/api/training/[id]/updates/route.ts",
  "app/api/training/[id]/materials/progress/route.ts",
  "app/api/training/session/[id]/rsvp/route.ts",
  "app/api/training/session/[id]/calendar/route.ts",
]) {
  assert.ok(
    read(file).includes('"write"'),
    `missing completed-state write guard: ${file}`,
  );
}

console.log("Work lifecycle verification passed.");
