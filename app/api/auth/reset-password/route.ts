import { NextRequest, NextResponse } from "next/server";
import { auditLog, hashPassword, hashToken, validatePassword } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { token: rawToken, password, confirmPassword } = await request.json();
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  if (!token || typeof password !== "string") return NextResponse.json({ error: "Reset link is missing or invalid. Please request a new reset link." }, { status: 400 });
  if (confirmPassword !== undefined && confirmPassword !== password) return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  if (!validatePassword(password)) return NextResponse.json({ error: "Password must be 12+ characters and include uppercase, lowercase, number, and symbol." }, { status: 400 });

  const { rows } = await query<{ id: string; user_id: string; expires_at: string }>(
    "SELECT id, user_id, expires_at FROM password_resets WHERE token_hash = $1 AND used_at IS NULL LIMIT 1",
    [hashToken(token)],
  );
  const reset = rows[0];
  if (!reset || new Date(reset.expires_at) < new Date()) return NextResponse.json({ error: "Reset link is invalid or expired. Please request a new reset link." }, { status: 400 });

  await query("UPDATE app_users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [await hashPassword(password), reset.user_id]);
  await query("UPDATE password_resets SET used_at = NOW() WHERE id = $1", [reset.id]);
  await query("DELETE FROM sessions WHERE user_id = $1", [reset.user_id]);
  await auditLog(reset.user_id, "password_change", request);
  return NextResponse.json({ message: "Password reset successfully. Please sign in again." });
}
