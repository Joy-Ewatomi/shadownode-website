import crypto from "crypto"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import {
  isAdminLikeRole,
  normalizePermanentRole,
} from "@/lib/role-access"

const SESSION_COOKIE = "shadownode_session"
const TWO_FACTOR_COOKIE = "shadownode_2fa"

const SESSION_DAYS = 7
const TWO_FACTOR_MINUTES = 10

// ===============================
// TYPES
// ===============================

export type AuthRole =
  | "client"
  | "staff"
  | "investigator"
  | "analyst"
  | "administrator"
  | "super_administrator"
  | "super-administrator"

export type AppUser = {
  id: string
  username: string
  email: string
  role: AuthRole
  email_verified_at: string | null
  totp_enabled: boolean
}

// ===============================
// ROLE VALIDATION
// ===============================

export function isAuthRole(
  role: string | null | undefined
): role is AuthRole {
  return normalizePermanentRole(role) !== null
}

// ===============================
// TOKEN FUNCTIONS
// ===============================

export function hashToken(value: string) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex")
}

export function newToken(bytes = 32) {
  return crypto
    .randomBytes(bytes)
    .toString("base64url")
}

// ===============================
// PASSWORD
// ===============================

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  hash: string
) {
  return bcrypt.compare(password, hash)
}

// ===============================
// COOKIE
// ===============================

export function sessionCookieOptions(
  maxAge = SESSION_DAYS * 24 * 60 * 60
) {
  return {
    httpOnly: true,

    secure:
      process.env.NODE_ENV === "production",

    sameSite: "lax" as const,

    path: "/",

    maxAge,
  }
}

// ===============================
// CREATE SESSION
// ===============================

export async function createSession(
  user: AppUser,
  request?: NextRequest
) {
  const token = newToken()

  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 86400000
  ).toISOString()

  await query(
    `
      INSERT INTO sessions
      (
        user_id,
        token,
        ip,
        user_agent,
        expires_at,
        last_activity
      )
      VALUES
      ($1, $2, $3, $4, $5, NOW())
    `,
    [
      user.id,
      hashToken(token),
      getIp(request),
      request?.headers.get("user-agent") ?? null,
      expiresAt,
    ]
  )

  await auditLog(
    user.id,
    "login",
    request,
    {
      success: true,
    }
  )

  return token
}

// ===============================
// ATTACH SESSION COOKIE
// ===============================

export function attachSession(
  response: NextResponse,
  token: string
) {
  response.cookies.set(
    SESSION_COOKIE,
    token,
    sessionCookieOptions()
  )

  return response
}

// ===============================
// GET CURRENT USER
// ===============================

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies()

  const token =
    cookieStore.get(SESSION_COOKIE)?.value

  if (!token) {
    return null
  }

  const hashed = hashToken(token)

  const { rows } = await query<
    AppUser & {
      expires_at: string
      last_activity: string | null
    }
  >(
    `
      SELECT
        u.id,
        u.username,
        u.email,
        u.role,
        u.email_verified_at,
        u.totp_enabled,
        s.expires_at,
        s.last_activity
      FROM sessions s
      JOIN app_users u
        ON u.id = s.user_id
      WHERE s.token = $1
      LIMIT 1
    `,
    [hashed]
  )

  const sessionUser = rows[0]

  if (!sessionUser) {
    return null
  }

  // ===============================
  // SESSION EXPIRATION
  // ===============================

  if (
    new Date(sessionUser.expires_at) <= new Date()
  ) {
    await query(
      `
        DELETE FROM sessions
        WHERE token = $1
      `,
      [hashed]
    )

    return null
  }

  // ===============================
  // VALIDATE ROLE
  // ===============================

  if (!isAuthRole(sessionUser.role)) {
    console.error(
      "INVALID AUTH ROLE:",
      sessionUser.role,
      "USER:",
      sessionUser.id
    )

    return null
  }

  // ===============================
  // UPDATE LAST ACTIVITY
  // ===============================

  const lastActivity = sessionUser.last_activity
    ? new Date(
        sessionUser.last_activity
      ).getTime()
    : 0

  const fiveMinutes = 5 * 60 * 1000

  if (
    Date.now() - lastActivity >= fiveMinutes
  ) {
    await query(
      `
        UPDATE sessions
        SET last_activity = NOW()
        WHERE token = $1
      `,
      [hashed]
    )
  }

  // ===============================
  // RETURN USER
  // ===============================

  return {
    id: sessionUser.id,

    username: sessionUser.username,

    email: sessionUser.email,

    role: sessionUser.role,

    email_verified_at:
      sessionUser.email_verified_at,

    totp_enabled:
      sessionUser.totp_enabled,
  }
}

// ===============================
// AUTH HELPERS
// ===============================

export async function requireUser() {
  const user =
    await getCurrentUser()

  if (!user) {
    return {
      user: null,

      response:
        NextResponse.json(
          {
            error: "Unauthorized",
          },
          {
            status: 401,
          }
        ),
    }
  }

  return {
    user,

    response: null,
  }
}

export async function getCurrentSessionHash() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return token ? hashToken(token) : null
}

// ===============================
// DELETE CURRENT SESSION
// ===============================

export async function deleteCurrentSession() {
  const cookieStore =
    await cookies()

  const token =
    cookieStore.get(
      SESSION_COOKIE
    )?.value

  if (token) {
    await query(
      `
        DELETE FROM sessions
        WHERE token = $1
      `,
      [hashToken(token)]
    )
  }
}

// ===============================
// DELETE ALL USER SESSIONS
// ===============================

export async function deleteAllSessions(
  userId: string
) {
  await query(
    `
      DELETE FROM sessions
      WHERE user_id = $1
    `,
    [userId]
  )
}

// ===============================
// CLEAR SESSION
// ===============================

export function clearSession(
  response: NextResponse
) {
  response.cookies.set(
    SESSION_COOKIE,
    "",
    {
      ...sessionCookieOptions(0),
      maxAge: 0,
    }
  )

  clearTwoFactorChallenge(response)

  return response
}

// ===============================
// TWO FACTOR
// ===============================

export function clearTwoFactorChallenge(
  response: NextResponse
) {
  response.cookies.set(
    TWO_FACTOR_COOKIE,
    "",
    {
      ...sessionCookieOptions(0),
      maxAge: 0,
    }
  )

  return response
}

export async function attachTwoFactorChallenge(
  response: NextResponse,
  userId: string,
  request?: NextRequest,
  primaryAuthMethod = "password",
) {
  const token = newToken()
  const expiresAt = new Date(
    Date.now() + TWO_FACTOR_MINUTES * 60000,
  ).toISOString()

  await query(
    `
      INSERT INTO pending_two_factor_challenges (
        user_id,
        token_hash,
        primary_auth_method,
        expires_at,
        created_ip,
        created_user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      userId,
      hashToken(token),
      primaryAuthMethod,
      expiresAt,
      getIp(request),
      request?.headers.get("user-agent") ?? null,
    ],
  )

  response.cookies.set(
    TWO_FACTOR_COOKIE,
    token,
    {
      ...sessionCookieOptions(TWO_FACTOR_MINUTES * 60),
      sameSite: "strict",
    },
  )

  return response
}

export async function getTwoFactorChallenge() {
  return (await cookies()).get(TWO_FACTOR_COOKIE)?.value ?? null
}

// ===============================
// ENCRYPTION
// ===============================

function encryptionKey() {
  const secret =
    process.env.AUTH_ENCRYPTION_KEY

  if (
    !secret ||
    secret.length < 32
  ) {
    throw new Error(
      "AUTH_ENCRYPTION_KEY must be at least 32 characters"
    )
  }

  return crypto
    .createHash("sha256")
    .update(secret)
    .digest()
}

export function encryptSecret(
  value: string
) {
  const iv =
    crypto.randomBytes(12)

  const cipher =
    crypto.createCipheriv(
      "aes-256-gcm",
      encryptionKey(),
      iv
    )

  const encrypted =
    Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ])

  return [
    iv.toString("base64url"),
    cipher
      .getAuthTag()
      .toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".")
}

export function decryptSecret(
  value: string
) {
  const [
    ivEncoded,
    tagEncoded,
    encryptedEncoded,
  ] = value.split(".")

  if (
    !ivEncoded ||
    !tagEncoded ||
    !encryptedEncoded
  ) {
    throw new Error(
      "Invalid encrypted secret"
    )
  }

  const iv =
    Buffer.from(
      ivEncoded,
      "base64url"
    )

  const tag =
    Buffer.from(
      tagEncoded,
      "base64url"
    )

  const encrypted =
    Buffer.from(
      encryptedEncoded,
      "base64url"
    )

  const decipher =
    crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      iv
    )

  decipher.setAuthTag(tag)

  return Buffer
    .concat([
      decipher.update(encrypted),
      decipher.final(),
    ])
    .toString("utf8")
}

// ===============================
// TOTP
// ===============================

const BASE32 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function generateTotpSecret() {
  return Array
    .from(
      crypto.randomBytes(20)
    )
    .map(
      (byte) =>
        BASE32[byte & 31]
    )
    .join("")
}

function base32Decode(
  value: string
) {
  let bits = ""

  for (
    const char of value
      .replace(/=|\s/g, "")
      .toUpperCase()
  ) {
    const index =
      BASE32.indexOf(char)

    if (index < 0) {
      throw new Error(
        "Invalid TOTP secret"
      )
    }

    bits += index
      .toString(2)
      .padStart(5, "0")
  }

  const bytes: number[] = []

  for (
    let i = 0;
    i + 8 <= bits.length;
    i += 8
  ) {
    bytes.push(
      parseInt(
        bits.slice(i, i + 8),
        2
      )
    )
  }

  return Buffer.from(bytes)
}

function totpAt(
  secret: string,
  timestamp: number
) {
  const counter =
    Math.floor(
      timestamp / 30000
    )

  const buffer =
    Buffer.alloc(8)

  buffer.writeBigUInt64BE(
    BigInt(counter)
  )

  const digest =
    crypto
      .createHmac(
        "sha1",
        base32Decode(secret)
      )
      .update(buffer)
      .digest()

  const offset =
    digest[digest.length - 1] &
    15

  return (
    (
      digest.readUInt32BE(offset) &
      0x7fffffff
    ) % 1000000
  )
    .toString()
    .padStart(6, "0")
}

export function verifyTotp(
  secret: string,
  code: string
) {
  const trimmed =
    code.trim()

  if (
    !/^\d{6}$/.test(trimmed)
  ) {
    return false
  }

  return [-1, 0, 1].some(
    (step) =>
      crypto.timingSafeEqual(
        Buffer.from(
          totpAt(
            secret,
            Date.now() +
              step * 30000
          )
        ),
        Buffer.from(trimmed)
      )
  )
}

export function totpUri(
  email: string,
  secret: string
) {
  return `otpauth://totp/${encodeURIComponent(
    `ShadowNode:${email}`
  )}?secret=${secret}&issuer=${encodeURIComponent(
    "ShadowNode"
  )}&algorithm=SHA1&digits=6&period=30`
}

// ===============================
// VALIDATION
// ===============================

export function validateUsername(
  username: string
) {
  return /^[a-zA-Z0-9_-]{4,30}$/.test(
    username
  )
}



// ===============================
// SECURITY
// ===============================

export function getIp(
  request?: NextRequest | Request
) {
  return (
    request?.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||

    request?.headers.get(
      "x-real-ip"
    ) ||

    null
  )
}

export async function auditLog(
  userId: string | null,
  action: string,
  request?: NextRequest | Request,
  metadata: Record<
    string,
    unknown
  > = {}
) {
  await query(
    `
      INSERT INTO audit_logs
      (
        user_id,
        action,
        ip,
        user_agent,
        metadata
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5::jsonb
      )
    `,
    [
      userId,

      action,

      getIp(request),

      request?.headers.get(
        "user-agent"
      ) ?? null,

      JSON.stringify(metadata),
    ]
  )
}

// ===============================
// ADMIN ROLE
// ===============================

export function isAdminRole(
  role?: string | null
) {
  return isAdminLikeRole(role)
}
