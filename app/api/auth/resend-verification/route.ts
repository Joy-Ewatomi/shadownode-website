import { NextRequest, NextResponse } from "next/server";
import { hashToken, newToken } from "@/lib/auth";
import { query } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const { email: rawEmail } = await request.json();
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });

  const { rows } = await query<{ id: string; email_verified_at: string | null; full_name: string | null }>("SELECT au.id, au.email_verified_at, up.full_name FROM app_users au LEFT JOIN user_profiles up ON up.user_id = au.id WHERE au.email = $1 LIMIT 1", [email]);
  const user = rows[0];
  if (!user || user.email_verified_at) return NextResponse.json({ message: "If verification is needed, a new link has been sent." });

  const token = newToken();
  await query("INSERT INTO email_verifications (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [user.id, hashToken(token), new Date(Date.now() + 86400_000).toISOString()]);
  await sendVerificationEmail(email, token, user.full_name);
  return NextResponse.json({ message: "If verification is needed, a new link has been sent." });
}
