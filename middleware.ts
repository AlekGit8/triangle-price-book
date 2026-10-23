import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * TEMPORARY — while Longsite Labs LLC is pending state approval.
 * All public traffic sees the coming-soon page. /admin and /api stay
 * reachable so the owner can keep working behind the scenes.
 * Remove this file to restore the full site.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let these through untouched.
  if (
    pathname === "/coming-soon" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg" ||
    pathname === "/logo.svg" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  // Everyone else gets the coming-soon page (URL stays as typed).
  return NextResponse.rewrite(new URL("/coming-soon", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
