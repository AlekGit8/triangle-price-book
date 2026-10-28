import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin-auth";
import { pruneOldAnalyticsRows } from "@/lib/retention";
import { activeSponsor, outreachLinks } from "@/lib/site-config";

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
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const url = new URL(req.url);

    // Summary view (?view=summary): one row per outreach link (plus the
    // active sponsor, if any) with all-time clicks — total, human, bot,
    // last click — so the Sponsors tab can show every link at once
    // instead of loading one slug at a time. Zero-click links are
    // included with zeros. No date filter: outreach links have no
    // flight, and the table is small. Aggregated in Postgres
    // (migration 0019) — the old code pulled up to 50,000 rows and was
    // silently capped at 1,000 by the API max-rows setting.
    if (url.searchParams.get("view") === "summary") {
      const sb = getServiceSupabase();
      // Prune rows older than the 180-day retention window (lib/retention).
      await pruneOldAnalyticsRows(sb);
      let bySlug = new Map<
        string,
        { total: number; human: number; bot: number; lastClicked: string | null }
      >();
      let tableMissing = false;
      let totalClicks = 0;
      const { data, error } = await sb.rpc("admin_sponsor_summary");
      if (error) {
        tableMissing = true;
      } else {
        const rows = (data ?? []) as Array<{
          slug: string;
          total: number;
          human: number;
          bot: number;
          last_clicked: string | null;
        }>;
        for (const r of rows) {
          bySlug.set(r.slug, {
            total: r.total,
            human: r.human,
            bot: r.bot,
            lastClicked: r.last_clicked,
          });
          totalClicks += r.total;
        }
      }
      const rows = [
        ...(activeSponsor
          ? [{ slug: activeSponsor.slug, company: activeSponsor.name, group: "sponsor" as const }]
          : []),
        ...Object.entries(outreachLinks).map(([slug, link]) => ({
          slug,
          company: link.company,
          group: link.group,
        })),
      ].map(({ slug, company, group }) => ({
        slug,
        company,
        group,
        ...(bySlug.get(slug) ?? { total: 0, human: 0, bot: 0, lastClicked: null }),
      }));
      return NextResponse.json({
        ok: true,
        view: "summary",
        rows,
        totalClicks,
        tableMissing,
        // No row cap anymore — Postgres aggregates the whole table.
        truncated: false,
      });
    }

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
    // Aggregated in Postgres (migration 0019, admin_sponsor_report) —
    // the old code pulled up to 50,000 views + 50,000 clicks and
    // aggregated in JS, silently capped at 1,000 rows by the API
    // max-rows setting.
    interface SponsorReport {
      impressions: { total: number; human: number };
      clicks: { total: number; human: number; bot: number };
      daily: Array<{ date: string; human_views: number; total_views: number; human_clicks: number; total_clicks: number }>;
      top_referrers: Array<{ path: string; clicks: number }>;
    }
    let report: SponsorReport | null = null;
    let tableMissing = false;
    const { data, error } = await sb.rpc("admin_sponsor_report", {
      p_slug: slug,
      p_start: startIso,
      p_end: endIso,
    });
    if (error) {
      // The migration hasn't landed yet: report zero clicks and flag it
      // instead of failing the whole tab.
      tableMissing = true;
    } else {
      report = data as SponsorReport;
    }
    const impressions = report?.impressions ?? { total: 0, human: 0 };
    const clicks = report?.clicks ?? { total: 0, human: 0, bot: 0 };
    // Outreach links have no banner flight, so site-wide page views are
    // not their impressions — report clicks only (M12). Only the active
    // sponsor's flight gets impressions/CTR. Daily view counts are
    // zeroed for outreach slugs for the same reason.
    const isActiveSponsor = !!activeSponsor && activeSponsor.slug === slug;
    const days: string[] = [];
    for (let d = startParam; d < endParam; d = addDays(d, 1)) days.push(d);
    const byDate = new Map(
      (report?.daily ?? []).map((d) => [d.date, d])
    );
    const daily = days.map((date) => {
      const d = byDate.get(date);
      return {
        date,
        humanViews: isActiveSponsor ? d?.human_views ?? 0 : 0,
        totalViews: isActiveSponsor ? d?.total_views ?? 0 : 0,
        clicks: d?.total_clicks ?? 0,
        humanClicks: d?.human_clicks ?? 0,
      };
    });

    const sponsor =
      activeSponsor && activeSponsor.slug === slug ? activeSponsor : null;

    return NextResponse.json({
      ok: true,
      slug,
      sponsor,
      start: startParam,
      end: endParam,
      // null for outreach/past-sponsor slugs: site-wide views are not
      // their impressions, and a CTR against them is meaningless.
      impressions: isActiveSponsor ? impressions : null,
      clicks,
      ctrHuman: isActiveSponsor
        ? impressions.human > 0
          ? clicks.human / impressions.human
          : 0
        : null,
      daily,
      topReferrers: report?.top_referrers ?? [],
      tableMissing,
      // No row cap anymore — Postgres aggregates the whole range.
      truncated: false,
    });
  } catch (err) {
    console.error("admin sponsors error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load sponsor report." }, { status: 500 });
  }
}
