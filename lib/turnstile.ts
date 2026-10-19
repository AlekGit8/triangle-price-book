/**
 * Shared Cloudflare Turnstile verification for API routes.
 * Verification is only enforced when TURNSTILE_SECRET_KEY is configured;
 * otherwise it passes through (spam protection disabled).
 */
export async function verifyTurnstile(
  token: string,
  ip: string | null
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
    return json.success === true;
  } catch {
    return false;
  }
}
