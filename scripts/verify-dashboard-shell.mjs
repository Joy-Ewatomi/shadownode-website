import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const layout = read("app/dashboard/layout.tsx");
const redirectPage = read("app/dashboard/page.tsx");
const shell = read("components/dashboard/DashboardShell.tsx");
const header = read("components/dashboard/Header.tsx");
const sidebar = read("components/dashboard/Sidebar.tsx");
const overview = read("app/dashboard/client/page.tsx");
const requests = read("app/dashboard/client/requests/page.tsx");
const requestDetail = read("app/dashboard/client/requests/[id]/page.tsx");
const paymentDetail = read("app/dashboard/client/payments/[id]/page.tsx");
const loading = read("app/dashboard/loading.tsx");
const errorBoundary = read("app/dashboard/error.tsx");
const notFound = read("app/dashboard/not-found.tsx");
const rootLayout = read("app/layout.tsx");
const submitted = read("components/client/RequestSubmitted.tsx");

assert.match(layout, /const user = await getCurrentUser\(\)/);
assert.match(layout, /if \(!user\)[\s\S]*redirect\("\/login"\)/);
assert.match(layout, /<DashboardShell user=\{user\}>\{children\}<\/DashboardShell>/);

for (const page of [overview, requests, requestDetail, paymentDetail]) {
  assert.doesNotMatch(page, /<DashboardShell|<Sidebar|<Header/);
}

assert.match(requestDetail, /Loading request/);
assert.match(paymentDetail, /Loading payment workflow/);
assert.match(loading, /Loading dashboard content/);
assert.match(errorBoundary, /Your navigation remains available/);
assert.match(notFound, /href="\/dashboard"/);

for (const forbidden of [
  "request.status",
  "commercial_status",
  "quote",
  "payment",
  "loading",
]) {
  assert.ok(
    !shell.toLowerCase().includes(forbidden),
    `DashboardShell must not depend on ${forbidden}`,
  );
}
assert.equal((shell.match(/<ClientNotificationProvider>/g) || []).length, 1);
assert.doesNotMatch(shell, /notifications?\.(?:length|loading)|unreadCount|unreadByCategory/);

assert.equal((layout.match(/<DashboardShell/g) || []).length, 1);
assert.equal((shell.match(/<Header/g) || []).length, 1);
assert.equal((shell.match(/<Sidebar/g) || []).length, 1);
assert.match(shell, /data-dashboard-shell/);
assert.match(shell, /data-dashboard-content/);
assert.match(shell, /fixed inset-0[\s\S]*h-dvh/);
assert.match(shell, /contentRef\.current\?\.scrollTo\(\{ top: 0, left: 0 \}\)/);
assert.match(header, /data-dashboard-mobile-header/);
assert.match(header, /sticky top-0/);
assert.match(header, /lg:hidden/);
assert.match(sidebar, /data-dashboard-sidebar/);
assert.match(sidebar, /lg:translate-x-0/);
assert.match(rootLayout, /<ThreatNodeNetwork \/>/);
assert.match(shell, /fixed inset-0 z-10[\s\S]*bg-transparent/);
assert.match(submitted, /\[data-dashboard-content\]/);
assert.match(submitted, /scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/);

for (const roleDestination of [
  "/dashboard/client",
  "/dashboard/staff",
  "/dashboard/administrator",
  "/dashboard/super-administrator",
]) assert.ok(redirectPage.includes(`redirect("${roleDestination}")`));

assert.equal(existsSync("components/dashboard/Layout.tsx"), false);

console.log("Dashboard shell verifier passed.");
