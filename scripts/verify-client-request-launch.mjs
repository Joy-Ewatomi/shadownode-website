import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
const read=(file)=>readFileSync(file,"utf8")
const routes=[
  read("app/api/client/requests/osint/route.ts"),
  read("app/api/client/requests/cybersecurity/route.ts"),
  read("app/api/client/requests/custom/route.ts"),
]
for(const route of routes){
  assert.match(route,/isSameOriginMutation/)
  assert.match(route,/notifyRequestReviewers/)
  assert.match(route,/notifyUser/)
  assert.ok(route.includes('type: "request_submitted"'))
  assert.ok(route.includes("force_email: true"))
  assert.ok(!route.includes("details: error instanceof Error"))
}
for(const route of routes.slice(0,2)){
  assert.match(route,/submission_key/)
  assert.ok(route.includes("ON CONFLICT (user_id, submission_key)"))
  assert.ok(route.includes("(xmax = 0) AS created"))
  assert.ok(route.includes("if (!inserted.rows[0].created)"))
}
const notifications=read("lib/services/notification-service.ts")
assert.ok(notifications.includes("role IN ('administrator', 'super_administrator', 'super-administrator')"))
assert.match(notifications,/status = 'active'/)
const delivery=read("lib/services/notification-delivery-service.ts")
assert.match(delivery,/email_verified_at/)
assert.ok(delivery.includes("notification.metadata?.force_email === true"))
assert.match(delivery,/Request reference/)
assert.match(delivery,/Service category/)
assert.match(delivery,/Submitted/)
assert.ok(delivery.includes("notification_id,") && delivery.includes("channel"))
assert.ok(delivery.includes('sent ? "sent" : "skipped"'))
assert.match(delivery,/"failed"/)
assert.match(delivery,/target_page|destination/)
const osintPage=read("app/dashboard/client/requests/osint/page.tsx")
const trainingPage=read("app/dashboard/client/requests/cybersecurity/page.tsx")
for(const page of [osintPage,trainingPage]){
  assert.ok(page.includes("crypto.randomUUID()"))
  assert.match(page,/submission_key: submissionKey/)
}
console.log("Client request launch-boundary verification passed.")
