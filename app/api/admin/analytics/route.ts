import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";

function authorized(req: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  return !!expected && req.headers.get("x-admin-key") === expected;
}

const TZ = "America/New_York";
const MAX_ROWS = 50000;
const MAX_VIEW_SECONDS = 1800; // 30 min cap per page view

type Range = "24h" | "7d" | "30d" | "90d" | "12m";
type Granularity = "hour" | "day" | "week" | "month";

const RANGES: Record<Range, { ms: number; label: string; defaultGranularity: Granularity }> = {
  "24h": { ms: 24 * 3600 * 1000, label: "Last 24 hours", defaultGranularity: "hour" },
  "7d": { ms: 7 * 24 * 3600 * 1000, label: "Last 7 days", defaultGranularity: "day" },
  "30d": { ms: 30 * 24 * 3600 * 1000, label: "Last 30 days", defaultGranularity: "day" },
  "90d": { ms: 90 * 24 * 3600 * 1000, label: "Last 90 days", defaultGranularity: "week" },
  "12m": { ms: 365 * 24 * 3600 * 1000, label: "Last 12 months", defaultGranularity: "month" },
};

function isRange(v: string | null): v is Range {
  return v === "24h" || v === "7d" || v === "30d" || v === "90d" || v === "12m";
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

interface Row {
  session_id: string;
  path: string;
  is_bot: boolean;
  duration_seconds: number;
  entered_at: string;
}

/**
 * GET /api/admin/analytics?range=7d&granularity=day — aggregated
 * first-party analytics for the admin dashboard, gated by ADMIN_KEY.
 * Visitors are sessions; a session counts in the bucket of its first
 * page view. Duration stats cover human sessions only. Pages are
 * ranked by total human time spent.
 */
export async function GET(req: Request) {
  if (!authorized(req))
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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
    const { data, error } = await sb
      .from("analytics_page_views")
      .select("session_id, path, is_bot, duration_seconds, entered_at")
      .gte("entered_at", start.toISOString())
      .order("entered_at", { ascending: true })
      .limit(MAX_ROWS);
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    const truncated = rows.length >= MAX_ROWS;

    // Sessions: first view decides the bucket and the bot flag.
    const sessions = new Map<string, { firstSeen: Date; bot: boolean; seconds: number }>();
    for (const r of rows) {
      const entered = new Date(r.entered_at);
      const s = sessions.get(r.session_id);
      const dur = Math.max(0, Math.min(MAX_VIEW_SECONDS, r.duration_seconds || 0));
      if (!s) {
        sessions.set(r.session_id, { firstSeen: entered, bot: r.is_bot, seconds: dur });
      } else {
        if (entered < s.firstSeen) s.firstSeen = entered;
        if (!r.is_bot) s.bot = false;
        s.seconds += dur;
      }
    }

    const keys = bucketSequence(start, end, granularity);
    const buckets = keys.map((k) => ({
      key: k,
      label: "",
      human: 0,
      bots: 0,
      views: 0,
    }));
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const r of rows) {
      const b = byKey.get(bucketKey(new Date(r.entered_at), granularity));
      if (b) {
        b.views += 1;
      }
    }
    for (const s of sessions.values()) {
      const b = byKey.get(bucketKey(s.firstSeen, granularity));
      if (b) {
        if (s.bot) b.bots += 1;
        else b.human += 1;
      }
    }
    for (const b of buckets) {
      b.label = bucketLabel(b.key, granularity);
    }

    const humanSessions = [...sessions.values()].filter((s) => !s.bot);
    const durations = humanSessions.map((s) => s.seconds).sort((a, b) => a - b);
    const avgSeconds =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const medianSeconds =
      durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0;

    const pagesMap = new Map<string, { views: number; totalSeconds: number }>();
    for (const r of rows) {
      if (r.is_bot) continue;
      const p = pagesMap.get(r.path) ?? { views: 0, totalSeconds: 0 };
      p.views += 1;
      p.totalSeconds += Math.max(0, Math.min(MAX_VIEW_SECONDS, r.duration_seconds || 0));
      pagesMap.set(r.path, p);
    }
    const pages = [...pagesMap.entries()]
      .map(([path, v]) => ({
        path,
        views: v.views,
        totalSeconds: v.totalSeconds,
        avgSeconds: v.views > 0 ? v.totalSeconds / v.views : 0,
      }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds)
      .slice(0, 25);

    const botSessions = sessions.size - humanSessions.length;
    const humanViews = rows.filter((r) => !r.is_bot).length;

    return NextResponse.json({
      ok: true,
      range,
      rangeLabel: RANGES[range].label,
      granularity,
      truncated,
      buckets: buckets.map(({ key, label, human, bots, views }) => ({ key, label, human, bots, views })),
      totals: {
        sessions: sessions.size,
        humanSessions: humanSessions.length,
        botSessions,
        views: rows.length,
        humanViews,
        botViews: rows.length - humanViews,
      },
      sessionStats: {
        sessions: humanSessions.length,
        avgSeconds: Math.round(avgSeconds),
        medianSeconds,
      },
      pages,
    });
  } catch (err) {
    console.error("admin analytics error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load analytics." }, { status: 500 });
  }
}
