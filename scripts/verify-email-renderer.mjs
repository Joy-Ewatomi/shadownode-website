import assert from "node:assert/strict"
import test from "node:test"

import {
  createEmailActionUrl,
  renderShadowNodeEmail,
} from "../lib/email-template.ts"

process.env.NETLIFY = "true"
process.env.URL = "https://shadownodebureau.netlify.app"

test("renderer escapes user-controlled content and supports a missing name", () => {
  const rendered = renderShadowNodeEmail({
    preheader: "Update",
    category: "Case update",
    heading: '<script>alert("heading")</script>',
    paragraphs: ['Client <img src=x onerror="bad">'],
  })

  assert.doesNotMatch(rendered.html, /<script>|<img/i)
  assert.match(rendered.html, /&lt;script&gt;/)
  assert.match(rendered.html, /Hello,/)
  assert.match(rendered.text, /Client <img src=x onerror="bad">/)
})

test("verification template has an absolute production action and plain text", () => {
  const token = "verification-token-never-log"
  const url = createEmailActionUrl("/api/auth/verify-email", { token })
  assert.equal(
    url,
    "https://shadownodebureau.netlify.app/api/auth/verify-email?token=verification-token-never-log",
  )

  const logged = []
  const original = console.log
  console.log = (...values) => logged.push(values)
  let rendered
  try {
    rendered = renderShadowNodeEmail({
      preheader: "Complete your email verification to secure your ShadowNode account.",
      category: "Account security",
      heading: "Verify your email address",
      recipientName: "Amina",
      paragraphs: [
        "Thank you for creating a ShadowNode account.",
        "Email verification is required before you can access protected ShadowNode services.",
      ],
      cta: { label: "Verify email address", url, showFallbackUrl: true },
      expiryNotice: "This verification link expires in 24 hours.",
    })
  } finally {
    console.log = original
  }

  assert.match(rendered.html, /Dear Amina,/)
  assert.match(rendered.text, /Verify email address: https:\/\//)
  assert.match(rendered.text, /expires in 24 hours/)
  assert.equal(JSON.stringify(logged).includes(token), false)
})

test("password reset content states one-time 15-minute expiry", () => {
  const url = createEmailActionUrl("/reset-password", { token: "reset-token" })
  const rendered = renderShadowNodeEmail({
    preheader: "A secure password-reset request was made for your ShadowNode account.",
    category: "Account security",
    heading: "Reset your password",
    paragraphs: ["We received a request to reset the password for your ShadowNode account."],
    cta: { label: "Reset password", url, showFallbackUrl: true },
    expiryNotice: "This secure link expires in 15 minutes and can only be used once.",
    securityNotice: "If you did not request this reset, ignore this email and consider reviewing your account security.",
  })

  assert.match(rendered.html, /Reset password/)
  assert.match(rendered.text, /15 minutes and can only be used once/)
  assert.throws(
    () => renderShadowNodeEmail({
      preheader: "Unsafe",
      category: "Security",
      heading: "Unsafe",
      paragraphs: ["Unsafe"],
      cta: { label: "Open", url: "https://example.com/token" },
    }),
    /configured application origin/,
  )
})
