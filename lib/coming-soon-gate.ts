import { headers } from "next/headers";

/**
 * Is the temporary coming-soon gate active for this request?
 *
 * The signal is a dedicated header, `x-tpb-coming-soon: 1`, set by
 * middleware.ts on the rewrite response (and on direct /coming-soon
 * requests, which share the root layout's header/footer). Next.js
 * copies middleware response headers onto the request headers visible
 * via `headers()` in server components — verified behaviorally in
 * `next dev`: the header appears for a rewritten "/" request and for
 * a direct "/coming-soon" request, and is absent for /admin.
 *
 * Why a dedicated header, not a proxy: the previous check keyed off
 * `x-frame-options`, a security header middleware sets on EVERY
 * response. That meant the gate looked active whenever middleware
 * existed — including after launch, when the rewrite is removed but
 * the rate limits and security headers stay. The dedicated header is
 * only set when the coming-soon page is actually being served, so the
 * check tracks the rewrite, not middleware presence.
 *
 * LAUNCH: remove ONLY the rewrite block in middleware.ts — the
 * `if (gateApplies)` block in section 2 (the rate limits and
 * security headers stay). The header/footer nav returns
 * automatically because the rewrite header is no longer set.
 *
 * PREVIEW DEPLOYMENTS: middleware skips the rewrite entirely on
 * Cloudflare Workers preview hostnames (see lib/preview-host.ts),
 * so the `beta` branch's previews show the full site — and this
 * check correctly reports the gate as inactive there, because the
 * header is never set on a preview host.
 */
export async function isComingSoonGateActive(): Promise<boolean> {
  const h = await headers();
  // Direct signal, if any runtime ever exposes it (none observed in
  // Next 15.5 — kept as a first check for future-proofing).
  if (h.get("x-middleware-rewrite")?.includes("/coming-soon")) return true;
  // Dedicated signal from middleware (see above).
  return h.get("x-tpb-coming-soon") === "1";
}
