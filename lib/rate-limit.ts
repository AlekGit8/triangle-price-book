/**
 * Tiny in-memory rate limiter for the Workers runtime.
 *
 * NOTE on the $0-cost architecture: this is per edge isolate, not global —
 * Cloudflare runs many isolates, so a distributed attacker can get roughly
 * (limit × isolates) requests through. It still kills casual abuse, script
 * loops from one machine, and accidental retry storms, which is the threat
 * that matters for Gemini quota and DB spam. True global limiting needs
 * Cloudflare's Rate Limiting rules (dashboard) or Turnstile keys — both are
 * documented as user action items, not code.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

function prune(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
    if (buckets.size <= MAX_BUCKETS * 0.8) break;
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Milliseconds until the window resets (0 when ok). */
  retryAfterMs: number;
}

/**
 * Fixed-window check-and-increment. Returns ok=false once `limit` hits have
 * been recorded for `key` inside `windowMs`.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  prune(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (b.count < limit) {
    b.count += 1;
    return { ok: true, retryAfterMs: 0 };
  }
  return { ok: false, retryAfterMs: Math.max(0, b.resetAt - now) };
}

/**
 * Best-effort client IP. On Cloudflare, cf-connecting-ip is set by the
 * edge and cannot be spoofed by the client; x-forwarded-for's first entry is
 * client-controlled, so it is only a fallback (e.g. local dev).
 */
export function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

/** YYYY-MM-DD in UTC, for daily quota bucket keys. */
export function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}
