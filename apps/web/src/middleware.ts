import { NextRequest, NextResponse } from "next/server";
import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "@cloudsourcehrm/db/schema";

// Protected routes that require authentication
const protectedPaths = ["/dashboard", "/contacts", "/employer-contacts", "/campaigns", "/hotlists", "/jobs", "/settings", "/admin"];

// Admin-only routes
const adminPaths = ["/admin"];

// Auth routes that should redirect to dashboard if already logged in
const authPaths = ["/login", "/register", "/forgot-password", "/reset-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting for public signup routes
  if (pathname.startsWith("/api/public/signup/")) {
    // Simple IP-based rate limiting (in production, use Vercel Edge Config or Redis)
    // For now, just pass through — production would use Cloudflare or similar
  }

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAdminPath = adminPaths.some((p) => pathname.startsWith(p));
  const isAuthPath = authPaths.some((p) => pathname.startsWith(p));

  if (!isProtected && !isAuthPath) {
    return NextResponse.next();
  }

  // Get session from Better Auth
  const session = await betterFetch<{ session: Session; user: { role: string } }>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: { cookie: request.headers.get("cookie") ?? "" },
    }
  );

  const user = session.data?.user;

  // Redirect logged-in users away from auth pages
  if (isAuthPath && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users to login
  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin gate
  if (isAdminPath && user?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|api/public|api/webhooks|api/unsubscribe|api/track|api/cron|_next/static|_next/image|favicon.ico|employers|candidates).*)",
  ],
};
