import { NextRequest, NextResponse } from "next/server";
import { attachSession, clearSession, clearTwoFactorChallenge, createSession, decryptSecret, getTwoFactorChallenge, isAuthRole, verifyTotp } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  AppUser
} from "@/lib/auth"

export async function POST(request: NextRequest) {
  const challenge = await getTwoFactorChallenge();
  const { code } = await request.json();
  if (!challenge || typeof code !== "string") return clearSession(NextResponse.json({ error: "Your sign-in challenge expired" }, { status: 401 }));
 const { rows } = await query<
  AppUser & {
    totp_secret_encrypted: string | null
  }
>(
  `
    SELECT
      id,
      username,
      email,
      role,
      email_verified_at,
      totp_enabled,
      totp_secret_encrypted
    FROM app_users
    WHERE id = $1
    LIMIT 1
  `,
  [challenge.userId]
)
  const user = rows[0];
  if (!user || !isAuthRole(user.role)) {
  return NextResponse.json(
    {
      error: "Invalid user role",
    },
    {
      status: 403,
    }
  )
}
  const token = await createSession(user, request);
  return clearTwoFactorChallenge(attachSession(NextResponse.json({ message: "Login successful", user: { id: user.id, username: user.username, email: user.email, role: user.role } }), token));
}
