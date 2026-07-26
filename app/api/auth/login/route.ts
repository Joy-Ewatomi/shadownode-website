import { NextRequest, NextResponse } from "next/server";
import { attachSession, attachTwoFactorChallenge, createSession, getIp, verifyPassword } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    const identifier = typeof username === "string" ? username.trim().toLowerCase() : "";
    if (!identifier || typeof password !== "string") return NextResponse.json({ error: "Email or username and password are required" }, { status: 400 });
    const lookup = identifier.includes("@") ? "email" : "username";
    const { rows } = await query<{ id: string; username: string; email: string; password_hash: string; role: string; email_verified_at: string | null; totp_enabled: boolean }>(
      `SELECT id, username, email, password_hash, role, email_verified_at, totp_enabled FROM app_users WHERE ${lookup} = $1 LIMIT 1`,
      [identifier],
    );
    const user = rows[0];
    const valid = user ? await verifyPassword(password, user.password_hash) : false;
    await query(
      `INSERT INTO login_history (user_id, identifier, ip, user_agent, success, failure_reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user?.id ?? null, identifier, getIp(request), request.headers.get("user-agent"), valid, valid ? null : "invalid_credentials"],
    );
    if (!user || !valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    if (!user.email_verified_at) return NextResponse.json({ error: "Verify your email before signing in" }, { status: 403 });
    if (user.totp_enabled) return attachTwoFactorChallenge(NextResponse.json({ requiresTwoFactor: true }), user.id);
    const token = await createSession(user, request);
    return attachSession(NextResponse.json({ message: "Login successful", user: { id: user.id, username: user.username, email: user.email, role: user.role } }), token);
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
