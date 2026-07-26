import { NextResponse } from "next/server";
import { encryptSecret, generateTotpSecret, getCurrentUser, totpUri } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const secret = generateTotpSecret();
  await query("UPDATE app_users SET totp_secret_encrypted = $1, totp_enabled = false, updated_at = NOW() WHERE id = $2", [encryptSecret(secret), user.id]);
  return NextResponse.json({ secret, otpauthUrl: totpUri(user.email, secret) });
}
