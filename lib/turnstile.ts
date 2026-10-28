/**
 * Shared Cloudflare Turnstile verification for API routes.
 * Verification is enforced whenever TURNSTILE_SECRET_KEY is configured,
 * and FAILS CLOSED in production when it is missing: a deleted secret
 * must never silently disable spam protection (in local dev, with no
 * secret, verification is skipped so the forms still work). When
 * enforced, requires success === true, the expected action, and a
 * hostname on the allowlist (TURNSTILE_HOSTNAMES, defaulting to the known
 * production hosts). The allowlist must cover every host that serves the
 * site — custom domains AND the Workers hosts — or verification fails
 * there and /api/submit + /api/extract reject every request with
 * "Spam check failed". (The old pages.dev entry was dropped when the
 * Cloudflare Pages project was deleted Oct 24, 2026.)
 */
export async function verifyTurnstile(
  token: string,
  ip: string | null,
  expectedAction?: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Fail closed in production; pass through only in local dev.
    return process.env.NODE_ENV !== "production";
  }
  if (!token) return false;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
          remoteip: ip ?? "",
        }),
      }
    );
    const json = await res.json();
    if (json.success !== true) return false;
    if (expectedAction && json.action !== expectedAction) return false;
    const allowedHostnames = (
      process.env.TURNSTILE_HOSTNAMES ??
      "trianglepricebook.com,www.trianglepricebook.com,triangle-price-book.longsitelabsllc.workers.dev,beta-triangle-price-book.longsitelabsllc.workers.dev"
    )
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    if (!allowedHostnames.includes(json.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}
