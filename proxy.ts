import { NextRequest, NextResponse } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/profile",
  "/security",
  "/messages",
  "/cases",
  "/payments",
  "/reports",
  "/admin",
];

const authCookie = "shadownode_session";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtected) return NextResponse.next();

  if (!request.cookies.get(authCookie)?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/security/:path*",
    "/messages/:path*",
    "/cases/:path*",
    "/payments/:path*",
    "/reports/:path*",
    "/admin/:path*",
  ],
};