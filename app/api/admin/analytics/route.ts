import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin-auth";
import { pruneOldAnalyticsRows } from "@/lib/retention";

const TZ = "America/New_York";

type Range = "24h" | "7d" | "30d" | "90d" | "6m";
type Granularity = "hour" | "day" | "week" | "month";

const RANGES: Record<Range, { ms: number; label: string; defaultGranularity: Granularity }> = {
  "24h": { ms: 24 * 3600 * 1000, label: "Last 24 hours", defaultGranularity: "hour" },
  "7d": { ms: 7 * 24 * 3600 * 1000, label: "Last 7 days", defaultGranularity: "day" },
  "30d": { ms: 30 * 24 * 3600 * 1000, label: "Last 30 days", defaultGranularity: "day" },
  "90d": { ms: 90 * 24 * 3600 * 1000, label: "Last 90 days", defaultGranularity: "week" },
  // 6 months, not 12: retention (lib/retention.ts) prunes rows older
  // than 180 days, so a 12-month range would show a half-empty chart.
  "6m": { ms: 180 * 24 * 3600 * 1000, label: "Last 6 months", defaultGranularity: "month" },
};

function isRange(v: string | null): v is Range {
  return v === "24h" || v === "7d" || v === "30d" || v === "90d" || v === "6m";
}
function isGranularity(v: string | null): v is Granularity {
  return v === "hour" || v === "day" || v === "week" || v === "month";
}

interface LocalParts {
  y: number;
  m: number;
  d: number;
  h: number;
}

function localParts(d: Date): LocalParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour) };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function bucketKey(d: Date, g: Granularity): string {
  const p = localParts(d);
  if (g === "hour") return `${p.y}-${pad(p.m)}-${pad(p.d)} ${pad(p.h)}:00`;
  if (g === "day") return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
  if (g === "month") return `${p.y}-${pad(p.m)}`;
  // week: Monday of the local week
  const noon = Date.UTC(p.y, p.m - 1, p.d, 12);
  const dow = new Date(noon).getUTCDay(); // 0 Sun .. 6 Sat
  const monday = new Date(noon - ((dow + 6) % 7) * 24 * 3600 * 1000);
  return `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function hour12(h: number): string {
  const ap = h < 12 ? "AM" : "PM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${ap}`;
}

/**
 * Label derived from the bucket key itself (already America/New_York wall
 * time), NOT from the first view in the bucket: empty buckets have no
 * first view, and formatting the range start made every empty bucket
 * show the same label (e.g. all "Oct 24, 8 PM" on an hourly chart).
 */
function bucketLabel(key: string, g: Granularity): string {
  if (g === "hour") {
    // key: "YYYY-MM-DD HH:00"
    const [date, time] = key.split(" ");
    const [, m, d] = date.split("-").map(Number);
    const h = Number(time.split(":")[0]);
    return `${MONTHS[m - 1]} ${d}, ${hour12(h)}`;
  }
  if (g === "day") {
    // key: "YYYY-MM-DD"
    const [, m, d] = key.split("-").map(Number);
    return `${MONTHS[m - 1]} ${d}`;
  }
  if (g === "week") return `Week of ${key.slice(5)}`;
  // key: "YYYY-MM"
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** Bucket keys covering [start, now] in local time, in order. */
function bucketSequence(start: Date, end: Date, g: Granularity): string[] {
  const keys: string[] = [];
  const step = new Date(start);
  while (step <= end) {
    const k = bucketKey(step, g);
    if (keys[keys.length - 1] !== k) keys.push(k);
    if (g === "hour") step.setTime(step.getTime() + 3600 * 1000);
    else if (g === "day") step.setTime(step.getTime() + 24 * 3600 * 1000);
    else if (g === "week") step.setTime(step.getTime() + 7 * 24 * 3600 * 1000);
    else step.setUTCMonth(step.getUTCMonth() + 1);
  }
  return keys;
}

/**
 * GET /api/admin/analytics?range=7d&granularity=day — aggregated
 * first-party analytics for the admin dashboard, gated by ADMIN_KEY.
 * Visitors are sessions; a session counts in the bucket of its first
 * page view. Duration stats cover human sessions only. Pages are
 * ranked by total human time spent.
 *
 * Aggregation runs in Postgres (migration 0019, admin_analytics) — the
 * route used to pull up to 50,000 raw rows and aggregate in JS, which
 * was the heaviest query on the site and the likely source of the
 * Oct 25 CPU-time (1102) errors. Buckets arrive keyed in
 * America/New_York; this route only fills empty buckets and labels them.
 */
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const url = new URL(req.url);
    const rangeParam = url.searchParams.get("range");
    const range: Range = isRange(rangeParam) ? rangeParam : "7d";
    const granParam = url.searchParams.get("granularity");
    const granularity: Granularity = isGranularity(granParam)
      ? granParam
      : RANGES[range].defaultGranularity;

    const end = new Date();
    const start = new Date(end.getTime() - RANGES[range].ms);

    const sb = getServiceSupabase();
    // Prune rows older than the 180-day retention window before
    // aggregating, so the longest range ("6 months") is complete.
    await pruneOldAnalyticsRows(sb);
    const { data, error } = await sb.rpc("admin_analytics", {
      p_start: start.toISOString(),
      p_end: end.toISOString(),
      p_granularity: granularity,
    });
    if (error) throw error;
    const agg = (data ?? {}) as {
      totals?: { sessions: number; human_sessions: number; bot_sessions: number; views: number; human_views: number; bot_views: number };
      session_stats?: { sessions: number; avg_seconds: number; median_seconds: number };
      buckets?: Array<{ key: string; views: number; human: number; bots: number }>;
      pages?: Array<{ path: string; views: number; total_seconds: number; avg_seconds: number }>;
    };
    const totals = agg.totals ?? {
      sessions: 0, human_sessions: 0, bot_sessions: 0,
      views: 0, human_views: 0, bot_views: 0,
    };
    const sessionStats = agg.session_stats ?? { sessions: 0, avg_seconds: 0, median_seconds: 0 };

    // Fill empty buckets so the chart is continuous, then label them.
    const keys = bucketSequence(start, end, granularity);
    const byKey = new Map((agg.buckets ?? []).map((b) => [b.key, b]));
    const buckets = keys.map((k) => {
      const b = byKey.get(k);
      return {
        key: k,
        label: bucketLabel(k, granularity),
        human: b?.human ?? 0,
        bots: b?.bots ?? 0,
        views: b?.views ?? 0,
      };
    });

    return NextResponse.json({
      ok: true,
      range,
      rangeLabel: RANGES[range].label,
      granularity,
      // No row cap anymore — Postgres aggregates the whole range.
      truncated: false,
      buckets,
      totals: {
        sessions: totals.sessions,
        humanSessions: totals.human_sessions,
        botSessions: totals.bot_sessions,
        views: totals.views,
        humanViews: totals.human_views,
        botViews: totals.bot_views,
      },
      sessionStats: {
        sessions: sessionStats.sessions,
        avgSeconds: Math.round(sessionStats.avg_seconds),
        medianSeconds: sessionStats.median_seconds,
      },
      pages: (agg.pages ?? []).map((p) => ({
        path: p.path,
        views: p.views,
        totalSeconds: p.total_seconds,
        avgSeconds: p.avg_seconds,
      })),
    });
  } catch (err) {
    console.error("admin analytics error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load analytics." }, { status: 500 });
  }
}
