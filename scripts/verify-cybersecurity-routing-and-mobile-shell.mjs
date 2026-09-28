import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const catalog = read("lib/cybersecurity-training-catalog.ts");
const formConstants = read(
  "components/client/forms/cybersecurity-training/constants.ts",
);
const route = read("app/api/client/requests/cybersecurity/route.ts");
const classifier = read("lib/services/request-engagement-classification.ts");
const review = read(
  "components/client/forms/cybersecurity-training/steps/ReviewAuthorizationStep.tsx",
);
const shell = read("components/dashboard/DashboardShell.tsx");
const header = read("components/dashboard/Header.tsx");
const sidebar = read("components/dashboard/Sidebar.tsx");
const trainerLayout = read("app/trainer/layout.tsx");
const caseLayout = read("app/cases/[id]/layout.tsx");

const serviceIds = [
  "professional_training",
  "security_awareness",
  "digital_safety",
  "security_assessment",
  "custom_training",
];

for (const id of serviceIds) {
  assert.ok(catalog.includes(`id: "${id}"`), `catalog missing ${id}`);
  assert.ok(classifier.includes(`"${id}"`) || id === "professional_training");
}

assert.ok(formConstants.includes("CYBERSECURITY_TRAINING_SERVICES.filter"));
assert.ok(route.includes('const category = "cybersecurity"'));
assert.ok(route.includes("isCybersecurityTrainingServiceId"));
assert.ok(!route.includes("body.category ||"));
assert.ok(route.includes("normalizeCybersecurityTrainingServiceType"));
assert.ok(route.includes('submittedServiceType === "custom_training"'));
assert.ok(review.includes('form.service_type === "custom_training"'));
assert.ok(!review.includes('form.service_type === "custom"'));

assert.ok(shell.includes("useEffect"));
assert.ok(shell.includes("setSidebarOpen(false)"));
assert.ok(shell.includes("[pathname]"));
assert.ok(header.includes('aria-controls="dashboard-sidebar"'));
assert.ok(header.includes("aria-expanded={sidebarOpen}"));
assert.ok(sidebar.includes('id="dashboard-sidebar"'));
assert.ok(sidebar.includes('aria-label="Dashboard navigation"'));
assert.ok(trainerLayout.includes("<DashboardShell"));
assert.ok(caseLayout.includes("<DashboardShell"));

console.log("Cybersecurity catalogue and mobile shell verification passed.");
