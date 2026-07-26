import { NextRequest, NextResponse } from "next/server";
import { attachSession, clearSession, clearTwoFactorChallenge, createSession, decryptSecret, getTwoFactorChallenge, verifyTotp } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  const challenge = await getTwoFactorChallenge();
  const { code } = await request.json();
  if (!challenge || typeof code !== "string") return clearSession(NextResponse.json({ error: "Your sign-in challenge expired" }, { status: 401 }));
  const { rows } = await query<{ id: string; username: string; email: string; role: string; email_verified_at: string | null; totp_enabled: boolean; totp_secret_encrypted: string | null }>(
    "SELECT id, username, email, role, email_verified_at, totp_enabled, totp_secret_encrypted FROM app_users WHERE id = $1 LIMIT 1",
    [challenge.userId],
  );
  const user = rows[0];
  if (!user?.totp_enabled || !user.totp_secret_encrypted || !verifyTotp(decryptSecret(user.totp_secret_encrypted), code)) return NextResponse.json({ error: "Invalid authentication code" }, { status: 401 });
  const token = await createSession(user, request);
  return clearTwoFactorChallenge(attachSession(NextResponse.json({ message: "Login successful", user: { id: user.id, username: user.username, email: user.email, role: user.role } }), token));
}
