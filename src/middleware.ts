import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = ["/ai", "/profile", "/usage", "/security", "/subscriptions"];

// Routes that should redirect to /ai if already logged in
const AUTH_ROUTES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for access token in cookies or localStorage isn't available in middleware,
  // so we check for a lightweight "logged_in" cookie set by the frontend
  const isLoggedIn = request.cookies.get("logged_in")?.value === "true";

  // Protect authenticated routes
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from auth pages
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/ai", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/ai/:path*",
    "/profile/:path*",
    "/usage/:path*",
    "/security/:path*",
    "/subscriptions/:path*",
    "/login",
    "/register",
  ],
};
