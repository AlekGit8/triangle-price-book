import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { activeSponsor } from "@/lib/site-config";

function authorized(req: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  return !!expected && req.headers.get("x-admin-key") === expected;
}

const MAX_ROWS = 50000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** UTC calendar date (YYYY-MM-DD) of an instant. */
function utcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * GET /api/admin/sponsors?slug=&start=YYYY-MM-DD&end=YYYY-MM-DD
 * — sponsor flight report for /admin (ADMIN_KEY-gated).
 *
 * Impressions = page views in the range from the existing
 * analytics_page_views table (the banner is site-wide, so every
 * page view while it is live is an impression); human/bot split
 * comes from that table's server-side bot flag. Clicks = rows in
 * sponsor_clicks logged by /go/<slug>. The default range is the
 * active sponsor's flight, or the last 14 days when there is no
 * active sponsor. `end` is exclusive.
 *
 * `slug` may name a past sponsor: stats still work after the flight
 * ends and the config is cleared, so the report stays available for
 * the end-of-flight email.
 */
export async function GET(req: Request) {
  if (!authorized(req))
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug")?.trim() || activeSponsor?.slug || "";
    if (!slug) {
      return NextResponse.json({
        ok: true,
        slug: "",
        sponsor: null,
        start: "",
        end: "",
        impressions: { total: 0, human: 0 },
        clicks: { total: 0, human: 0, bot: 0 },
        ctrHuman: 0,
        daily: [],
        topReferrers: [],
        tableMissing: false,
        truncated: false,
      });
    }

    const today = utcDate(new Date());
    // Default range = the flight's own UTC calendar dates, so the
    // report covers exactly [startsAt, endsAt) — the same window the
    // banner is live. (Deriving them in Eastern time shifted the
    // range a day: a flight starting midnight UTC Oct 26 reads as
    // Oct 25 in ET.)
    const defaultStart = activeSponsor
      ? utcDate(new Date(activeSponsor.startsAt))
      : addDays(today, -13);
    const defaultEnd = activeSponsor
      ? utcDate(new Date(activeSponsor.endsAt))
      : addDays(today, 1);
    const startParam = url.searchParams.get("start")?.trim() || defaultStart;
    const endParam = url.searchParams.get("end")?.trim() || defaultEnd;
    if (!DATE_RE.test(startParam) || !DATE_RE.test(endParam) || startParam >= endParam) {
      return NextResponse.json(
        { ok: false, error: "Invalid date range. Use start/end as YYYY-MM-DD with start before end." },
        { status: 400 }
      );
    }
    // Cap the range at a year so a typo can't trigger a huge scan.
    if (addDays(startParam, 366) < endParam) {
      return NextResponse.json(
        { ok: false, error: "Date range is too long (max 366 days)." },
        { status: 400 }
      );
    }
    const startIso = `${startParam}T00:00:00.000Z`;
    const endIso = `${endParam}T00:00:00.000Z`;

    const sb = getServiceSupabase();
    const viewsRes = await sb
      .from("analytics_page_views")
      .select("is_bot, entered_at")
      .gte("entered_at", startIso)
      .lt("entered_at", endIso)
      .order("entered_at", { ascending: true })
      .limit(MAX_ROWS);
    if (viewsRes.error) throw viewsRes.error;
    const views = (viewsRes.data ?? []) as Array<{ is_bot: boolean; entered_at: string }>;

    let clickRows: Array<{ is_bot: boolean; clicked_at: string; referrer_path: string | null }> = [];
    let tableMissing = false;
    const clicksRes = await sb
      .from("sponsor_clicks")
      .select("is_bot, clicked_at, referrer_path")
      .eq("sponsor_slug", slug)
      .gte("clicked_at", startIso)
      .lt("clicked_at", endIso)
      .order("clicked_at", { ascending: true })
      .limit(MAX_ROWS);
    if (clicksRes.error) {
      // The migration hasn't landed yet: report views, zero clicks,
      // and flag it instead of failing the whole tab.
      tableMissing = true;
    } else {
      clickRows = (clicksRes.data ?? []) as typeof clickRows;
    }

    const humanViews = views.filter((v) => !v.is_bot).length;
    const humanClicks = clickRows.filter((c) => !c.is_bot).length;

    // Daily buckets in UTC, covering [start, end).
    const days: string[] = [];
    for (let d = startParam; d < endParam; d = addDays(d, 1)) days.push(d);
    const dailyMap = new Map(
      days.map((date) => [date, { date, humanViews: 0, totalViews: 0, clicks: 0, humanClicks: 0 }])
    );
    for (const v of views) {
      const row = dailyMap.get(utcDate(new Date(v.entered_at)));
      if (!row) continue;
      row.totalViews += 1;
      if (!v.is_bot) row.humanViews += 1;
    }
    for (const c of clickRows) {
      const row = dailyMap.get(utcDate(new Date(c.clicked_at)));
      if (!row) continue;
      row.clicks += 1;
      if (!c.is_bot) row.humanClicks += 1;
    }

    const refMap = new Map<string, number>();
    for (const c of clickRows) {
      const key = c.referrer_path || "(direct / unknown)";
      refMap.set(key, (refMap.get(key) ?? 0) + 1);
    }
    const topReferrers = [...refMap.entries()]
      .map(([path, clicks]) => ({ path, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    const sponsor =
      activeSponsor && activeSponsor.slug === slug ? activeSponsor : null;

    return NextResponse.json({
      ok: true,
      slug,
      sponsor,
      start: startParam,
      end: endParam,
      impressions: { total: views.length, human: humanViews },
      clicks: { total: clickRows.length, human: humanClicks, bot: clickRows.length - humanClicks },
      ctrHuman: humanViews > 0 ? humanClicks / humanViews : 0,
      daily: [...dailyMap.values()],
      topReferrers,
      tableMissing,
      truncated: views.length >= MAX_ROWS || clickRows.length >= MAX_ROWS,
    });
  } catch (err) {
    console.error("admin sponsors error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load sponsor report." }, { status: 500 });
  }
}
