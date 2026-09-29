import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const catalogue = readFileSync("lib/cybersecurity-training-catalog.ts", "utf8");
const engagement = readFileSync("lib/services/request-engagement-classification.ts", "utf8");
const adminCard = readFileSync("components/requests/AdminRequestReviewCard.tsx", "utf8");
const superCard = readFileSync("components/requests/SuperAdminRequestReviewCard.tsx", "utf8");
const adminRoute = readFileSync("app/api/admin/requests/[id]/route.ts", "utf8");

for (const service of [
  "professional_training",
  "security_awareness",
  "digital_safety",
  "security_assessment",
  "custom_training",
]) {
  assert.ok(catalogue.includes(`id: "${service}"`), `catalogue missing ${service}`);
  assert.ok(engagement.includes(`"${service}"`), `engagement classifier missing ${service}`);
}

for (const source of [adminCard, superCard, adminRoute]) {
  assert.match(source, /isCybersecurityTrainingServiceId/);
}
assert.match(adminCard, /service !== "security_assessment"/);
assert.match(superCard, /!isSecurityAssessment && isCybersecurityTrainingServiceId/);
assert.match(adminRoute, /value !== "security_assessment"/);

console.log("Cybersecurity review classification verifier passed.");
