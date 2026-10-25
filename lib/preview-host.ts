/**
 * Preview-deployment hostname check for the coming-soon gate.
 *
 * Cloudflare Workers preview deployments (the `beta` branch's previews
 * for the beta/preview workflow) run on workers.dev hostnames with a
 * prefix — pattern `*-triangle-price-book.longsitelabsllc.workers.dev`
 * (e.g. `beta-triangle-price-book.longsitelabsllc.workers.dev`). The
 * production Worker is exactly
 * `triangle-price-book.longsitelabsllc.workers.dev` (no prefix), and the
 * public site is trianglepricebook.com / www.trianglepricebook.com.
 *
 * A preview hostname is therefore any host that ends with the
 * production host AND has a non-empty prefix separated by `-` or
 * `.` (e.g. `beta-triangle-price-book.longsitelabsllc.workers.dev`).
 * The separator requirement is what excludes the production host
 * itself (empty prefix) and lookalikes with no separator
 * (e.g. `xtriangle-price-book.longsitelabsllc.workers.dev`).
 *
 * This lives in its own import-free module on purpose: middleware.ts
 * imports it, and middleware cannot import lib/coming-soon-gate.ts
 * (that module imports `next/headers`, which is server-component-only).
 */
const PRODUCTION_WORKERS_HOST =
  "triangle-price-book.longsitelabsllc.workers.dev";

export function isPreviewDeploymentHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host.endsWith(PRODUCTION_WORKERS_HOST)) return false;
  const prefix = host.slice(0, -PRODUCTION_WORKERS_HOST.length);
  return prefix.length > 0 && (prefix.endsWith("-") || prefix.endsWith("."));
}
