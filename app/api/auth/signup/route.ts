import { NextResponse } from "next/server";
import { auditLog, hashPassword, hashToken, newToken, validateUsername } from "@/lib/auth";
import { evaluatePassword } from "@/lib/password-policy";
import { sendVerificationEmail } from "@/lib/email";
import { isDatabaseConfigurationError, isDatabaseNetworkError, query } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { username: rawUsername, email: rawEmail, password, confirmPassword } = await req.json();
    const username = typeof rawUsername === "string" ? rawUsername.trim() : "";
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    if (!validateUsername(username) || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== "string") {
      return NextResponse.json({ error: "Use a valid email and a 4-30 character username." }, { status: 400 });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    const passwordPolicy = evaluatePassword(password);
    if (!passwordPolicy.valid) return NextResponse.json({ error: passwordPolicy.message }, { status: 400 });
const password_hash = await hashPassword(password);

const { rows } = await query<{
  id: string;
  username: string;
  email: string;
}>(
  `
  INSERT INTO app_users
    (username, email, password_hash, status, role)
  VALUES
    ($1, $2, $3, 'pending', 'client')
  RETURNING id, username, email
  `,
  [username, email, password_hash],
).catch((error) => {
  if (error?.code === "23505") {
    return { rows: [] };
  }

  throw error;
});

const user = rows[0];

if (!user) {
  return NextResponse.json(
    { error: "An account with those details already exists" },
    { status: 409 },
  );
}

// Create the client profile.
await query(
  `
  INSERT INTO user_profiles
    (id, user_id, full_name, is_anonymous)
  VALUES
    ($1, $1, $2, false)
  ON CONFLICT (user_id) DO NOTHING
  `,
  [user.id, username],
);

// Create email verification token.
const verificationToken = newToken();

await query(
  `
  INSERT INTO email_verifications
    (user_id, token_hash, expires_at)
  VALUES
    ($1, $2, $3)
  `,
  [
    user.id,
    hashToken(verificationToken),
    new Date(Date.now() + 86400_000).toISOString(),
  ],
);

// Assign client role.
await query(
  `
  INSERT INTO user_roles
    (user_id, role_id)
  SELECT $1, id
  FROM roles
  WHERE name = 'client'
  ON CONFLICT DO NOTHING
  `,
  [user.id],
).catch(() => undefined);

await auditLog(
  user.id,
  "registration",
  req,
  { email },
);

const emailSent = await sendVerificationEmail(
  email,
  verificationToken,
);
    return NextResponse.json({ message: emailSent ? "Account created. Check your email to verify it." : "Account created. Configure Resend to enable email verification.", requiresEmailVerification: true }, { status: 201 });
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    if (isDatabaseConfigurationError(error)) {
      return NextResponse.json({ error: "PostgreSQL is not configured. Set DATABASE_URL, POSTGRES_URL, or SUPABASE_DB_URL to your database connection string." }, { status: 503 });
    }
    if (isDatabaseNetworkError(error)) {
      return NextResponse.json({ error: "Could not reach PostgreSQL from this machine. If you use Supabase, use the Transaction Pooler connection string, which is IPv4-compatible, or connect from a network with IPv6 support." }, { status: 503 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
