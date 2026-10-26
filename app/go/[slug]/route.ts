import { NextResponse } from "next/server";
import { activeSponsor } from "@/lib/site-config";
import { getServiceSupabase } from "@/lib/supabase-server";
import { isBotUserAgent } from "@/lib/bot-detect";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_PATH_LEN = 200;

/**
 * GET /go/<sponsor-slug> — sponsor banner click redirect (Oct 26, 2026).
 * Logs one anonymous click to sponsor_clicks, then 302-redirects to
 * the sponsor's site. The click log is the click half of the
 * end-of-flight sponsor report; impressions come from the existing
 * analytics_page_views table (human page views while the banner is
 * live).
 *
 * - The slug must match the currently configured `activeSponsor` AND
 *   today must be inside its flight; anything else is a 404, so a
 *   stale or guessed link never credits clicks to anyone.
 * - Logging is best-effort: if the insert fails (e.g. the table
 *   isn't migrated yet), the visitor still reaches the sponsor —
 *   a logging failure must never break the sponsor's link.
 * - No IP address is stored. is_bot is decided server-side from the
 *   user agent, so bot/crawler clicks can be excluded from the
 *   human-click count in the report.
 * - Rate-limited to 60 clicks/hour per IP (same in-memory limiter
 *   as the rest of the site — per edge isolate, kills casual abuse
 *   and retry loops, not a distributed attack).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const sponsor =
    activeSponsor && activeSponsor.slug === slug ? activeSponsor : null;
  if (!sponsor) {
    return NextResponse.json(
      { ok: false, error: "Unknown sponsor." },
      { status: 404 }
    );
  }

  const now = new Date();
  if (now < new Date(sponsor.startsAt) || now >= new Date(sponsor.endsAt)) {
    return NextResponse.json(
      { ok: false, error: "Sponsorship has ended." },
      { status: 404 }
    );
  }

  const ip = clientIp(req);
  const limited = checkRateLimit(`rl:/go:${slug}:${ip}`, 60, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please slow down and try again." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  try {
    const sb = getServiceSupabase();
    const ua = req.headers.get("user-agent");
    let referrerPath: string | null = null;
    const referer = req.headers.get("referer");
    if (referer) {
      try {
        referrerPath = new URL(referer).pathname.slice(0, MAX_PATH_LEN);
      } catch {
        referrerPath = null;
      }
    }
    const { error } = await sb.from("sponsor_clicks").insert({
      sponsor_slug: slug,
      referrer_path: referrerPath,
      user_agent: ua ? ua.slice(0, 512) : null,
      is_bot: isBotUserAgent(ua),
      country: req.headers.get("cf-ipcountry") ?? null,
    });
    if (error) throw error;
  } catch (err) {
    // Never break the sponsor's link over a logging failure.
    console.error("sponsor click log error:", err);
  }

  return NextResponse.redirect(sponsor.destinationUrl, 302);
}
