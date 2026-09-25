import assert from "node:assert/strict"
import test from "node:test"

import {
  approximateDevice,
  approximateIp,
  canConfirmTwoFactorSetup,
  isSameOriginMutation,
  performLogoutAll,
} from "../lib/security-center.ts"

function request(origin, headers = {}) {
  return {
    nextUrl: { origin },
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
  }
}

test("mutation protection accepts same origin and rejects cross origin", () => {
  assert.equal(isSameOriginMutation(request("https://app.test", { origin: "https://app.test" })), true)
  assert.equal(isSameOriginMutation(request("https://app.test", { origin: "https://evil.test" })), false)
})

test("logout-all revokes only the authenticated user and includes current session", async () => {
  const calls = []
  const result = await performLogoutAll(
    "authenticated-user",
    async (id) => calls.push(["audit", id]),
    async (id) => calls.push(["revoke", id]),
  )
  assert.deepEqual(calls, [
    ["audit", "authenticated-user"],
    ["revoke", "authenticated-user"],
  ])
  assert.equal(result.currentSessionRevoked, true)
})

test("2FA confirmation requires disabled state and valid TOTP result", () => {
  assert.equal(canConfirmTwoFactorSetup(false, true), true)
  assert.equal(canConfirmTwoFactorSetup(false, false), false)
  assert.equal(canConfirmTwoFactorSetup(true, true), false)
})

test("security presentation excludes raw IP and user-agent values", () => {
  const rawIp = "203.0.113.42"
  const rawUa = "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0"
  const output = JSON.stringify({
    ip: approximateIp(rawIp),
    device: approximateDevice(rawUa),
  })
  assert.equal(output.includes(rawIp), false)
  assert.equal(output.includes(rawUa), false)
  assert.match(output, /203\.0\.113\.x/)
})
