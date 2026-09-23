import assert from "node:assert/strict"
import test from "node:test"

import { NextRequest, NextResponse } from "next/server.js"

import {
  clearOAuthStateCookie,
  createOAuthInitiationResponse,
  getOAuthStateCookieName,
} from "../lib/oauth.ts"

const request = new NextRequest(
  "https://shadownodebureau.netlify.app/api/auth/oauth/google",
)

test("OAuth initiation response carries a secure provider-specific state cookie", () => {
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  const state = "test-state-value-never-log"
  const logged = []
  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  }

  console.log = (...values) => logged.push(values)
  console.warn = (...values) => logged.push(values)
  console.error = (...values) => logged.push(values)

  let response
  try {
    response = createOAuthInitiationResponse(
      request,
      "google",
      authorizationUrl,
      state,
    )
  } finally {
    console.log = original.log
    console.warn = original.warn
    console.error = original.error
  }

  assert.equal(response.status, 302)
  assert.equal(response.headers.get("location"), authorizationUrl.toString())
  assert.equal(
    response.headers.get("cache-control"),
    "no-store, no-cache, must-revalidate, private",
  )
  assert.equal(response.headers.get("pragma"), "no-cache")
  assert.equal(response.headers.get("expires"), "0")

  const setCookie = response.headers.get("set-cookie") ?? ""
  assert.match(setCookie, /shadownode_oauth_state_google=/)
  assert.match(setCookie, /HttpOnly/i)
  assert.match(setCookie, /Secure/i)
  assert.match(setCookie, /SameSite=Lax/i)
  assert.match(setCookie, /Path=\//i)
  assert.match(setCookie, /Max-Age=600/i)
  assert.doesNotMatch(setCookie, /Domain=/i)
  assert.notEqual(
    getOAuthStateCookieName("google"),
    getOAuthStateCookieName("github"),
  )
  assert.equal(JSON.stringify(logged).includes(state), false)
})

test("OAuth state-cookie deletion preserves security and path attributes", () => {
  const response = clearOAuthStateCookie(
    new NextResponse(null),
    request,
    "google",
  )
  const setCookie = response.headers.get("set-cookie") ?? ""

  assert.match(setCookie, /shadownode_oauth_state_google=/)
  assert.match(setCookie, /HttpOnly/i)
  assert.match(setCookie, /Secure/i)
  assert.match(setCookie, /SameSite=Lax/i)
  assert.match(setCookie, /Path=\//i)
  assert.match(setCookie, /Max-Age=0/i)
  assert.doesNotMatch(setCookie, /Domain=/i)
})
