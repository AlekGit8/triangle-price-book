import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, clientIp, utcDay } from "@/lib/rate-limit";
import { isPreviewDeploymentHost } from "@/lib/preview-host";

/**
 * TEMPORARY coming-soon gate — while Longsite Labs LLC is pending state approval.
 * All public traffic sees the coming-soon page. /admin and /api stay
 * reachable so the owner can keep working behind the scenes.
 *
 * This middleware ALSO enforces:
 *  - per-IP rate limits on /api/* (abuse / cost protection — see lib/rate-limit.ts)
 *  - baseline security headers on every response
 *
 * LAUNCH: delete ONLY the `if (gateApplies)` block in section 2 below
 * (the rewrite — not this whole file). The rate limits and security
 * headers in this file stay: requests then fall through to the
 * passthrough in section 3, which still applies the security headers.
 * The header/footer nav returns automatically: the rewrite is what
 * sets the `x-tpb-coming-soon` header that lib/coming-soon-gate.ts
 * reads, so once the rewrite is gone the header is no longer set and
 * the nav shows again. (Direct /coming-soon requests also set the
 * header via the passthrough in section 3 — delete the /coming-soon
 * route and its entry in `gateApplies` at launch too.)
 *
 * PREVIEW DEPLOYMENTS (beta workflow): the gate does NOT apply to
 * Cloudflare Workers preview hostnames (pattern
 * `*-triangle-price-book.longsitelabsllc.workers.dev` — see
 * lib/preview-host.ts), so the `beta` branch's previews show the
 * full site instead of the coming-soon page. Production (custom
 * domains and the production workers.dev host) stays gated. Rate
 * limits and security headers still apply on preview hosts — only
 * the rewrite is skipped.
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
  // /api/notify writes signup rows (list-bombing / DB bloat vector).
  { prefix: "/api/notify", limit: 10, windowMs: HOUR },
  // Public read API; generous, but not unlimited (full-table scans).
  { prefix: "/api/check-quote", limit: 120, windowMs: HOUR },
  // Slow down ADMIN_KEY guessing. The key must still be long and random.
  { prefix: "/api/admin/", limit: 30, windowMs: HOUR },
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

  // 1. Rate-limit API routes before anything else.
  if (pathname.startsWith("/api/")) {
    const limited = checkApiRateLimit(request);
    if (limited) return withSecurityHeaders(limited);
  }

  // 2. Coming-soon gate (temporary — see file header).
  //    LAUNCH: delete this `if (gateApplies)` block and nothing else.
  //    Requests then fall through to the passthrough in section 3,
  //    which keeps the security headers.
  //    Preview deployments bypass the gate (see lib/preview-host.ts):
  //    their hostnames are workers.dev with a prefix, and they show
  //    the full site so changes can be reviewed before merging.
  const gateApplies =
    !isPreviewDeploymentHost(request.nextUrl.hostname) &&
    pathname !== "/coming-soon" &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") &&
    pathname !== "/favicon.ico" &&
    pathname !== "/icon.svg" &&
    pathname !== "/logo.svg" &&
    pathname !== "/robots.txt" &&
    pathname !== "/sitemap.xml";
  if (gateApplies) {
    // Everyone else gets the coming-soon page (URL stays as typed).
    // The dedicated header tells server components (via headers())
    // that this request was rewritten to the coming-soon page — see
    // lib/coming-soon-gate.ts. Next.js copies middleware response
    // headers onto the request headers visible to server components
    // (except `x-middleware-rewrite`, which is response-only).
    const rewriteRes = NextResponse.rewrite(new URL("/coming-soon", request.url));
    rewriteRes.headers.set("x-tpb-coming-soon", "1");
    return withSecurityHeaders(rewriteRes);
  }

  // 3. Passthrough with security headers for everything the gate
  //    doesn't rewrite: /coming-soon itself, /admin, /api, and static
  //    assets. A direct request for the coming-soon page itself also
  //    hides the header/footer nav (the page shares the root layout);
  //    /admin and /api deliberately do NOT get the gate header.
  const res = NextResponse.next();
  if (pathname === "/coming-soon") {
    res.headers.set("x-tpb-coming-soon", "1");
  }
  return withSecurityHeaders(res);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
