import { NextRequest, NextResponse } from "next/server";
import { hashToken, newToken } from "@/lib/auth";
import { query } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const { email: rawEmail } = await request.json();
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });

  const { rows } = await query<{ id: string; full_name: string | null }>("SELECT au.id, up.full_name FROM app_users au LEFT JOIN user_profiles up ON up.user_id = au.id WHERE au.email = $1 LIMIT 1", [email]);
  const user = rows[0];
  if (user) {
    const token = newToken();
    await query("DELETE FROM password_resets WHERE user_id = $1 AND used_at IS NULL", [user.id]);
    await query("INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [user.id, hashToken(token), new Date(Date.now() + 15 * 60_000).toISOString()]);
    await sendPasswordResetEmail(email, token, user.full_name);
  }

  return NextResponse.json({ message: "If that account exists, a reset link has been sent." });
}
