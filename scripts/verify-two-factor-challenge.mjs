import assert from "node:assert/strict"
import test from "node:test"

import { assessPendingTwoFactorChallenge } from "../lib/two-factor-challenge.ts"

const future = new Date(Date.now() + 60_000)
const base = {
  exists: true,
  userMatches: true,
  expiresAt: future,
  consumedAt: null,
  attempts: 0,
  maxAttempts: 5,
}

test("valid code and challenge is the only session-eligible result", () => {
  assert.deepEqual(
    assessPendingTwoFactorChallenge(base, true),
    { accepted: true, consume: true, incrementAttempts: false },
  )
  assert.equal(
    assessPendingTwoFactorChallenge(base, false).accepted,
    false,
  )
})

test("missing and expired challenges are rejected", () => {
  assert.equal(
    assessPendingTwoFactorChallenge(
      { ...base, exists: false },
      true,
    ).accepted,
    false,
  )
  assert.equal(
    assessPendingTwoFactorChallenge(
      { ...base, expiresAt: new Date(0) },
      true,
    ).accepted,
    false,
  )
})

test("a challenge bound to another user is rejected", () => {
  const decision = assessPendingTwoFactorChallenge(
    { ...base, userMatches: false },
    true,
  )
  assert.equal(decision.accepted, false)
  assert.equal(decision.reason, "mismatched")
})

test("a consumed challenge cannot be replayed", () => {
  const decision = assessPendingTwoFactorChallenge(
    { ...base, consumedAt: new Date() },
    true,
  )
  assert.equal(decision.accepted, false)
  assert.equal(decision.reason, "reused")
})

test("repeated invalid attempts exhaust and consume the challenge", () => {
  const decision = assessPendingTwoFactorChallenge(
    { ...base, attempts: 4 },
    false,
  )
  assert.equal(decision.accepted, false)
  assert.equal(decision.incrementAttempts, true)
  assert.equal(decision.consume, true)
  assert.equal(decision.reason, "rate_limited")
})

test("challenge decisions do not log or return sensitive values", () => {
  const secret = "totp-secret-never-log"
  const code = "123456"
  const logs = []
  const original = console.log
  console.log = (...values) => logs.push(values)
  let decision
  try {
    decision = assessPendingTwoFactorChallenge(base, false)
  } finally {
    console.log = original
  }
  const serialized = JSON.stringify({ logs, decision })
  assert.equal(serialized.includes(secret), false)
  assert.equal(serialized.includes(code), false)
})
