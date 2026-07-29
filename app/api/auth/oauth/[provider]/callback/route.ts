import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { attachSession, attachTwoFactorChallenge, createSession, hashPassword } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Provider = "google" | "microsoft" | "github";
const config: Record<Provider, { token: string; user: string }> = {
  google: { token: "https://oauth2.googleapis.com/token", user: "https://openidconnect.googleapis.com/v1/userinfo" },
  microsoft: { token: "https://login.microsoftonline.com/common/oauth2/v2.0/token", user: "https://graph.microsoft.com/oidc/userinfo" },
  github: { token: "https://github.com/login/oauth/access_token", user: "https://api.github.com/user" },
};
const oauthClientKey = `client_${"id"}`;

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await params;
  if (!(rawProvider in config)) return NextResponse.json({ error: "Unsupported OAuth provider" }, { status: 404 });
  const provider = rawProvider as Provider;
  const code = request.nextUrl.searchParams.get("code"); const state = request.nextUrl.searchParams.get("state");
  const stateCookie = request.cookies.get("shadownode_oauth_state")?.value;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL; const clientId = process.env[`OAUTH_${provider.toUpperCase()}_CLIENT_ID`]; const clientSecret = process.env[`OAUTH_${provider.toUpperCase()}_CLIENT_SECRET`];
  if (!code || !state || stateCookie !== `${provider}.${state}` || !appUrl || !clientId || !clientSecret) return NextResponse.json({ error: "OAuth sign-in could not be verified" }, { status: 400 });
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/oauth/${provider}/callback`;
  const tokenResponse = await fetch(config[provider].token, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, [oauthClientKey]: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
  const token = (await tokenResponse.json()).access_token as string | undefined;
  if (!token) return NextResponse.json({ error: "OAuth token exchange failed" }, { status: 401 });
  const profileResponse = await fetch(config[provider].user, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "User-Agent": "ShadowNode" } });
  const profile = await profileResponse.json(); const providerId = String(profile.sub ?? profile.id ?? "");
  let email = String(profile.email ?? "").toLowerCase();
  if (provider === "github" && !email) { const emails = await (await fetch("https://api.github.com/user/emails", { headers: { Authorization: `Bearer ${token}`, "User-Agent": "ShadowNode" } })).json(); email = emails.find((item: { primary: boolean; verified: boolean }) => item.primary && item.verified)?.email ?? ""; }
  if (!providerId || !email) return NextResponse.json({ error: "The OAuth provider did not supply a verified email address" }, { status: 400 });
  const { data: linked } = await supabaseAdmin.from("oauth_accounts").select("app_users(id, username, email, role, email_verified_at, totp_enabled)").eq("provider", provider).eq("provider_account_id", providerId).maybeSingle();
  let user = linked?.app_users as unknown as { id: string; username: string; email: string; role: string; email_verified_at: string | null; totp_enabled: boolean } | null;
  if (!user) {
    const { data: existing } = await supabaseAdmin.from("app_users").select("id, username, email, role, email_verified_at, totp_enabled").eq("email", email).maybeSingle();
    user = existing;
    if (!user) {
      const baseUsername = String(profile.login ?? profile.name ?? email.split("@")[0]).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "user";
      const { data: created, error } = await supabaseAdmin.from("app_users").insert({ username: `${baseUsername}-${crypto.randomUUID().slice(0, 8)}`, email, password_hash: await hashPassword(crypto.randomBytes(32).toString("base64url")), email_verified_at: new Date().toISOString() }).select("id, username, email, role, email_verified_at, totp_enabled").single();
      if (error || !created) return NextResponse.json({ error: "Could not create OAuth account" }, { status: 500 }); user = created;
    }
    await supabaseAdmin.from("oauth_accounts").upsert({ user_id: user.id, provider, provider_account_id: providerId, email }, { onConflict: "provider,provider_account_id" });
  }
  if (user.totp_enabled) return attachTwoFactorChallenge(NextResponse.redirect(new URL("/login?twoFactorRequired=1", request.url)), user.id);
  const response = attachSession(NextResponse.redirect(new URL("/dashboard", request.url)), await createSession(user, request));
  response.cookies.delete("shadownode_oauth_state"); return response;
}
