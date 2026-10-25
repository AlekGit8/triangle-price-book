import { headers } from "next/headers";

/**
 * Is the temporary coming-soon gate active for this request?
 *
 * Why this is a proxy, not a direct check: Next.js does NOT expose a
 * middleware rewrite to server components. The `x-middleware-rewrite`
 * header is set on the RESPONSE only — Next.js explicitly excludes it
 * from the request headers passed to the page (see `resolve-routes.js`
 * in Next 15.5: `x-middleware-rewrite` is skipped when middleware
 * response headers are copied onto `req.headers`). Verified
 * behaviorally in `next dev`: `headers()` inside SiteHeader shows no
 * rewrite header for a rewritten "/" request, and the header sets for
 * a rewritten "/" and a direct "/coming-soon" are identical.
 *
 * What the component CAN see: Next.js copies the middleware's own
 * response headers onto the request headers visible via `headers()`.
 * While middleware.ts exists it sets security headers (e.g.
 * `x-frame-options: DENY`) on every response, so their presence here
 * means middleware ran — and the gate lives in middleware.ts, so
 * middleware present means gate active.
 *
 * LAUNCH REQUIREMENT: at launch, middleware.ts must be DELETED
 * ENTIRELY (not just the rewrite block). If only the rewrite block is
 * removed, the security headers remain, this keeps returning true, and
 * the nav stays hidden forever. The gate and this check are removed
 * together when middleware.ts is deleted.
 */
export async function isComingSoonGateActive(): Promise<boolean> {
  const h = await headers();
  // Direct signal, if any runtime ever exposes it (none observed in
  // Next 15.5 — kept as a first check for future-proofing).
  if (h.get("x-middleware-rewrite")?.includes("/coming-soon")) return true;
  // Proxy: middleware ran (and therefore the gate is in place).
  // `x-frame-options` is a response-only header by spec — a browser
  // never sends it, so its presence here can only come from middleware.
  return h.has("x-frame-options");
}
