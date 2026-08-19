import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAccountRoute = pathname.startsWith("/account");
  const isCheckoutRoute = pathname.startsWith("/checkout");

  if (isAdminRoute) {
    if (!session?.user || session.user.role !== "admin") {
      const url = new URL("/admin/login", req.url);
      return NextResponse.redirect(url);
    }
  }

  if ((isAccountRoute || isCheckoutRoute) && !session?.user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/checkout/:path*"],
};
