import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, clientIp, utcDay } from "@/lib/rate-limit";

/**
 * LAUNCHED Oct 25, 2026 — the coming-soon gate was removed: all public
 * traffic now sees the real site. The coming-soon page and /api/notify
 * were deleted Oct 27, 2026 (the launch is over; the signup form was an
 * unauthenticated write vector with no Turnstile/double opt-in).
 *
 * This middleware enforces:
 *  - canonical host: the apex domain 301-redirects to www (Oct 28,
 *    2026 SEO — the sitemap, OG URLs, and canonical tags all use www;
 *    without this, Google sees two copies of every page)
 *  - per-IP rate limits on /api/* (abuse / cost protection — see lib/rate-limit.ts)
 *  - baseline security headers on every response
 */

interface ApiLimit {
  prefix: string;
  /** Max requests per windowMs. */
  limit: number;
  windowMs: number;
  /** Optional additional daily cap (used for the paid Gemini endpoint). */
  dayLimit?: number;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const API_LIMITS: ApiLimit[] = [
  // /api/extract burns Gemini API quota on every call — the tightest limits.
  { prefix: "/api/extract", limit: 10, windowMs: HOUR, dayLimit: 30 },
  // /api/submit writes to the DB (spam vector).
  { prefix: "/api/submit", limit: 30, windowMs: HOUR },
  // Public read API; generous, but not unlimited (full-table scans).
  // 120/hr let one IP burn 120 Gemini calls an hour — 30/hr with a
  // 60/day cap is plenty for a human checking quotes, and the estimate
  // cache (migration 0018) means repeat checks of the same job cost
  // nothing at all.
  { prefix: "/api/check-quote", limit: 30, windowMs: HOUR, dayLimit: 60 },
  // Analytics ingest: page views + a heartbeat every 30s while the
  // tab is visible — one active visitor is ~120/hr, so 600 leaves
  // headroom for a shared IP while still bounding DB bloat.
  { prefix: "/api/analytics/event", limit: 600, windowMs: HOUR },
  // Admin: generous per-IP limit for legitimate use (one unlock + one
  // refresh fires ~5 requests, so 30/hr locked the admin out after a
  // few refreshes). Brute-force guessing is throttled separately, in
  // route: lib/admin-auth.ts counts only *failed* auth attempts
  // (10/hr per IP) and 429s after that. The key must still be long
  // and random.
  { prefix: "/api/admin/", limit: 300, windowMs: HOUR },
];

function tooMany(retryAfterMs: number): NextResponse {
  const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return NextResponse.json(
    { ok: false, error: "Too many requests. Please slow down and try again." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}

function checkApiRateLimit(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const rule = API_LIMITS.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return null;
  const ip = clientIp(request);
  const hourly = checkRateLimit(
    `rl:${rule.prefix}:${ip}`,
    rule.limit,
    rule.windowMs
  );
  if (!hourly.ok) return tooMany(hourly.retryAfterMs);
  if (rule.dayLimit) {
    const daily = checkRateLimit(
      `rl:${rule.prefix}:${ip}:day:${utcDay()}`,
      rule.dayLimit,
      DAY
    );
    if (!daily.ok) return tooMany(daily.retryAfterMs);
  }
  return null;
}

function withSecurityHeaders(res: NextResponse): NextResponse {
  // Baseline headers. (A full Content-Security-Policy is intentionally not
  // set here: Next.js inline scripts + the Turnstile widget need
  // 'unsafe-inline', which would make a CSP mostly theater. Revisit if the
  // site ever renders untrusted HTML.)
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  res.headers.set("X-DNS-Prefetch-Control", "off");
  return res;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Canonical host: the apex domain 301-redirects to www. Only the
  //    exact apex hostname redirects — Workers dev hostnames and
  //    localhost are untouched, so beta and local dev keep working.
  if (request.nextUrl.hostname === "trianglepricebook.com") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.hostname = "www.trianglepricebook.com";
    return withSecurityHeaders(NextResponse.redirect(url, 301));
  }

  // 1. Rate-limit API routes before anything else.
  if (pathname.startsWith("/api/")) {
    const limited = checkApiRateLimit(request);
    if (limited) return withSecurityHeaders(limited);
  }

  // 2. Passthrough with security headers for everything: public pages,
  //    /admin, /api, and static assets.
  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
