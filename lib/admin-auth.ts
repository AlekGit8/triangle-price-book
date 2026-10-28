import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Admin gate shared by every /api/admin/* route (was copy-pasted in 7
 * route files). The key is compared by SHA-256 digest in constant time,
 * so the comparison itself leaks nothing about the key. Returns false
 * when ADMIN_KEY is not configured (fail closed).
 */

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function authorized(req: Request): Promise<boolean> {
  const expected = process.env.ADMIN_KEY;
  const provided = req.headers.get("x-admin-key");
  if (!expected || !provided) return false;
  const [a, b] = await Promise.all([
    sha256Hex(provided),
    sha256Hex(expected),
  ]);
  return timingSafeEqualHex(a, b);
}

/**
 * Use at the top of an admin route handler:
 *   const denied = await requireAdmin(req);
 *   if (denied) return denied;
 *
 * Returns null when authorized. Otherwise 401 — or 429 once an IP has
 * made 10 failed attempts in an hour (the strict brute-force bucket).
 * Legitimate use never touches that bucket: the middleware's generous
 * /api/admin/ limit covers normal admin refreshes, and only *failed*
 * auth attempts count here.
 */
export async function requireAdmin(req: Request): Promise<NextResponse | null> {
  if (await authorized(req)) return null;
  const fail = checkRateLimit(
    `rl:admin-auth-fail:${clientIp(req)}`,
    10,
    60 * 60 * 1000
  );
  if (!fail.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Too many failed admin sign-in attempts. Please slow down and try again.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil(fail.retryAfterMs / 1000))),
        },
      }
    );
  }
  return NextResponse.json(
    { ok: false, error: "Unauthorized" },
    { status: 401 }
  );
}
