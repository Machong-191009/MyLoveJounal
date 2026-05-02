import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Note: In Next.js 16, middleware.ts is renamed to proxy.ts
// with the export name "proxy" instead of "middleware"
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicPaths = [
    "/login",
    "/register",
    "/api/auth",
    "/api/register",
    "/api/network-info",
    "/api/mobile-upload",
    "/api/travel-info",
    "/upload",
  ];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (isPublic) {
    return NextResponse.next();
  }

  // Check for auth session cookie (NextAuth v5 uses authjs.session-token)
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!sessionToken && pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
