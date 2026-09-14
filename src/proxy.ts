import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Extract actual domain host dynamically from request headers to prevent redirecting to localhost on live site
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAccountRoute = pathname.startsWith("/account");
  const isCheckoutRoute = pathname.startsWith("/checkout");

  if (isAdminRoute) {
    if (!session?.user || session.user.role !== "admin") {
      const url = new URL("/admin/login", origin);
      return NextResponse.redirect(url);
    }
  }

  if ((isAccountRoute || isCheckoutRoute) && !session?.user) {
    const url = new URL("/login", origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/checkout/:path*"],
};
