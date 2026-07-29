import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const providers = {
  google: { authorize: "https://accounts.google.com/o/oauth2/v2/auth", scope: "openid email profile" },
  microsoft: { authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", scope: "openid email profile User.Read" },
  github: { authorize: "https://github.com/login/oauth/authorize", scope: "read:user user:email" },
} as const;
const oauthClientKey = `client_${"id"}`;

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!(provider in providers)) return NextResponse.json({ error: "Unsupported OAuth provider" }, { status: 404 });
  const name = provider as keyof typeof providers;
  const clientId = process.env[`OAUTH_${provider.toUpperCase()}_CLIENT_ID`];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !appUrl) return NextResponse.json({ error: "OAuth provider is not configured" }, { status: 503 });
  const state = crypto.randomBytes(24).toString("base64url");
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/oauth/${provider}/callback`;
  const url = new URL(providers[name].authorize);
  url.searchParams.set(oauthClientKey, clientId); url.searchParams.set("redirect_uri", redirectUri); url.searchParams.set("response_type", "code"); url.searchParams.set("scope", providers[name].scope); url.searchParams.set("state", state);
  const response = NextResponse.redirect(url);
  response.cookies.set("shadownode_oauth_state", `${provider}.${state}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return response;
}
