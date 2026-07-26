import { NextRequest, NextResponse } from "next/server";
import { auditLog, decryptSecret, getCurrentUser, verifyTotp } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const { code } = await request.json();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await query<{ totp_secret_encrypted: string | null }>("SELECT totp_secret_encrypted FROM app_users WHERE id = $1", [user.id]);
  const data = rows[0];
  if (!data?.totp_secret_encrypted || typeof code !== "string" || !verifyTotp(decryptSecret(data.totp_secret_encrypted), code)) return NextResponse.json({ error: "Invalid authentication code" }, { status: 400 });
  await query("UPDATE app_users SET totp_enabled = true, updated_at = NOW() WHERE id = $1", [user.id]);
  await auditLog(user.id, "two_factor_enabled", request);
  return NextResponse.json({ message: "Two-factor authentication enabled" });
}
