/**
 * Shared Cloudflare Turnstile verification for API routes.
 * Verification is only enforced when TURNSTILE_SECRET_KEY is configured;
 * otherwise it passes through (spam protection disabled).
 * When enforced, requires success === true, the expected action, and a
 * hostname on the allowlist (TURNSTILE_HOSTNAMES, defaulting to the known
 * production hosts).
 */
export async function verifyTurnstile(
  token: string,
  ip: string | null,
  expectedAction?: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Turnstile not configured -> skip verification
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
      "trianglepricebook.com,www.trianglepricebook.com,triangle-price-book.pages.dev"
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
