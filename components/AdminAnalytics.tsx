"use client";

import { useEffect, useState } from "react";
import AnalyticsChart, { type ChartBucket } from "@/components/AnalyticsChart";

type Range = "24h" | "7d" | "30d" | "90d" | "6m";
type Granularity = "hour" | "day" | "week" | "month";

const RANGES: { id: Range; label: string; defaultGranularity: Granularity }[] = [
  { id: "24h", label: "24 hours", defaultGranularity: "hour" },
  { id: "7d", label: "7 days", defaultGranularity: "day" },
  { id: "30d", label: "30 days", defaultGranularity: "day" },
  { id: "90d", label: "90 days", defaultGranularity: "week" },
  { id: "6m", label: "6 months", defaultGranularity: "month" },
];

const GRANULARITIES: { id: Granularity; label: string }[] = [
  { id: "hour", label: "Hourly" },
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
];

interface PageRow {
  path: string;
  views: number;
  totalSeconds: number;
  avgSeconds: number;
}

interface AnalyticsData {
  rangeLabel: string;
  granularity: Granularity;
  truncated: boolean;
  buckets: ChartBucket[];
  totals: {
    sessions: number;
    humanSessions: number;
    botSessions: number;
    views: number;
    humanViews: number;
    botViews: number;
  };
  sessionStats: { sessions: number; avgSeconds: number; medianSeconds: number };
  pages: PageRow[];
}

export function formatSeconds(s: number): string {
  const v = Math.round(s);
  if (v < 60) return `${v}s`;
  if (v < 3600) return `${Math.floor(v / 60)}m ${v % 60}s`;
  const h = Math.floor(v / 3600);
  const m = Math.floor((v % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Analytics tab for /admin: visitors over time (humans vs bots),
 * time on site per visitor, and pages ranked by time spent.
 * Data starts when the tracker shipped (Oct 25, 2026) — there is no
 * history before that.
 */
export default function AdminAnalytics({ adminKey }: { adminKey: string }) {
  const [range, setRange] = useState<Range>("7d");
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/admin/analytics?range=${range}&granularity=${granularity}`, {
      headers: { "x-admin-key": adminKey },
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to load");
        if (!cancelled) setData(json as AnalyticsData);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, granularity, adminKey]);

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              setRange(r.id);
              setGranularity(r.defaultGranularity);
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              range === r.id ? "bg-black text-white" : "border border-line bg-white text-ink hover:border-black"
            }`}
          >
            {r.label}
          </button>
        ))}
        <span className="mx-1 hidden text-muted sm:inline">·</span>
        {GRANULARITIES.map((g) => (
          <button
            key={g.id}
            onClick={() => setGranularity(g.id)}
            className={`rounded-full px-3 py-2 font-mono text-xs font-semibold ${
              granularity === g.id
                ? "bg-black text-white"
                : "border border-line bg-white text-ink hover:border-black"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {loading && !data && <p className="text-muted">Loading analytics…</p>}
      {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="font-serif text-4xl text-ink">{data.totals.sessions}</p>
              <p className="mt-1 text-sm text-muted">Visitors</p>
              <p className="mt-1 font-mono text-xs text-muted">
                {data.totals.humanSessions} human · {data.totals.botSessions} bots
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="font-serif text-4xl text-ink">{data.totals.views}</p>
              <p className="mt-1 text-sm text-muted">Page views</p>
              <p className="mt-1 font-mono text-xs text-muted">
                {data.totals.humanViews} human · {data.totals.botViews} bots
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="font-serif text-4xl text-ink">
                {formatSeconds(data.sessionStats.avgSeconds)}
              </p>
              <p className="mt-1 text-sm text-muted">Avg time per visitor</p>
              <p className="mt-1 font-mono text-xs text-muted">
                median {formatSeconds(data.sessionStats.medianSeconds)}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="font-serif text-4xl text-ink">
                {data.totals.sessions > 0
                  ? (data.totals.views / data.totals.sessions).toFixed(1)
                  : "0"}
              </p>
              <p className="mt-1 text-sm text-muted">Pages per visit</p>
              <p className="mt-1 font-mono text-xs text-muted">{data.rangeLabel}</p>
            </div>
          </div>

          <div>
            <h3 className="font-serif text-xl text-ink">Visitors over time</h3>
            <div className="mt-3">
              <AnalyticsChart buckets={data.buckets} />
            </div>
          </div>

          <div>
            <h3 className="font-serif text-xl text-ink">Pages by time spent</h3>
            <p className="mt-1 text-sm text-muted">
              Human visitors only — this is what people actually do on the site.
            </p>
            {data.pages.length === 0 ? (
              <p className="mt-3 text-muted">No human page views in this range yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line font-mono text-xs uppercase tracking-wide text-muted">
                      <th className="px-4 py-3 font-semibold">Page</th>
                      <th className="px-4 py-3 text-right font-semibold">Views</th>
                      <th className="px-4 py-3 text-right font-semibold">Total time</th>
                      <th className="px-4 py-3 text-right font-semibold">Avg per view</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pages.map((p) => (
                      <tr key={p.path} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 font-mono text-[13px] text-ink">{p.path}</td>
                        <td className="px-4 py-3 text-right font-mono text-ink">{p.views}</td>
                        <td className="px-4 py-3 text-right font-mono text-ink">
                          {formatSeconds(p.totalSeconds)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-ink">
                          {formatSeconds(p.avgSeconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-sm text-muted">
            Tracking started Oct 25, 2026 — visits before that aren&apos;t counted.
            Time on a page counts only while the tab is visible, and a single
            page view is capped at 30 minutes.
          </p>
        </>
      )}
    </div>
  );
}
