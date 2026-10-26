"use client";

import { useEffect, useState } from "react";
import { outreachLinks } from "@/lib/site-config";

interface SponsorConfig {
  slug: string;
  name: string;
  headline: string;
  destinationUrl: string;
  startsAt: string;
  endsAt: string;
}

interface DayRow {
  date: string;
  humanViews: number;
  totalViews: number;
  clicks: number;
  humanClicks: number;
}

interface ReportData {
  slug: string;
  sponsor: SponsorConfig | null;
  start: string;
  end: string;
  impressions: { total: number; human: number };
  clicks: { total: number; human: number; bot: number };
  ctrHuman: number;
  daily: DayRow[];
  topReferrers: Array<{ path: string; clicks: number }>;
  tableMissing: boolean;
  truncated: boolean;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateShort(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Sponsors tab for /admin: the current banner config, the flight
 * report (human impressions, human/bot clicks, CTR, daily breakdown),
 * and a copy-ready end-of-flight report for the sponsor email.
 *
 * Impressions are human page views site-wide while the banner is
 * live (the banner sits on every page). Clicks are counted by the
 * /go/<slug> redirect. Bots are excluded from the human numbers but
 * shown, so the report is honest about what the counts include.
 */
export default function AdminSponsors({ adminKey }: { adminKey: string }) {
  const [slug, setSlug] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function load(s?: string, st?: string, en?: string) {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      if ((s ?? slug).trim()) q.set("slug", (s ?? slug).trim());
      if ((st ?? start).trim()) q.set("start", (st ?? start).trim());
      if ((en ?? end).trim()) q.set("end", (en ?? end).trim());
      const res = await fetch(`/api/admin/sponsors?${q.toString()}`, {
        headers: { "x-admin-key": adminKey },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to load");
      setData(json as ReportData);
      setStart(json.start ?? "");
      setEnd(json.end ?? "");
      setSlug(json.slug ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Load once on mount; refreshes are manual, like the other tabs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey]);

  const reportText = data
    ? [
        `Sponsor report — ${data.sponsor?.name ?? (data.slug || "Triangle Price Book sponsor")}`,
        `Flight: ${fmtDateShort(data.start)} – ${fmtDateShort(data.end)} (dates in UTC; end date exclusive)`,
        ``,
        `Your banner appeared on ${data.impressions.human.toLocaleString()} human page views (${data.impressions.total.toLocaleString()} total page views including bots) and received ${data.clicks.human} human clicks (${data.clicks.total} total clicks including bots).`,
        `Human click-through rate: ${(data.ctrHuman * 100).toFixed(2)}%.`,
        ``,
        `Clicks are counted when a visitor clicks the Sponsored banner and is sent to your site; impressions are counted from our own first-party analytics, which excludes bots from the human numbers. Thank you for being a founding sponsor — your support keeps the site free for Triangle homeowners.`,
      ].join("\n")
    : "";

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Couldn't copy — select the text manually.");
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-2xl border border-line bg-white p-5">
        <h3 className="font-serif text-xl text-ink">Current sponsor</h3>
        {data?.sponsor ? (
          <div className="mt-3 space-y-1 text-sm text-ink">
            <p>
              <strong>{data.sponsor.name}</strong> — {data.sponsor.headline}
            </p>
            <p className="font-mono text-[13px] text-muted">
              /go/{data.sponsor.slug} → {data.sponsor.destinationUrl}
            </p>
            <p className="text-muted">
              Flight: {fmtDate(data.sponsor.startsAt)} – {fmtDate(data.sponsor.endsAt)}
            </p>
            <p className="text-muted">
              The banner shows on every page while the flight is live. To change
              the sponsor, edit <code className="font-mono text-[13px]">activeSponsor</code> in{" "}
              <code className="font-mono text-[13px]">lib/site-config.ts</code> and redeploy.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">
            No active sponsor — the banner is hidden. Set{" "}
            <code className="font-mono text-[13px]">activeSponsor</code> in{" "}
            <code className="font-mono text-[13px]">lib/site-config.ts</code> to start a flight.
            Past flights can still be reported below by entering their slug and dates.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-white p-5">
        <h3 className="font-serif text-xl text-ink">Outreach links</h3>
        <p className="mt-1 text-sm text-muted">
          One tracked link per company in the sponsorship cold-outreach emails.
          Clicks go to the homepage and are logged under the slug — load one
          to see how many times that company clicked through.
        </p>
        <div className="mt-3 space-y-2">
          {Object.entries(outreachLinks).map(([slug, link]) => (
            <div
              key={slug}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line px-4 py-2.5"
            >
              <span className="text-sm text-ink">
                {link.company}{" "}
                <span className="font-mono text-[13px] text-muted">/go/{slug}</span>
              </span>
              <button
                onClick={() => load(slug)}
                disabled={loading}
                className="whitespace-nowrap rounded-full border border-line bg-white px-4 py-1.5 text-sm font-semibold text-ink hover:border-black disabled:opacity-50"
              >
                Load clicks
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5">
        <h3 className="font-serif text-xl text-ink">Flight report</h3>
        <form
          className="mt-3 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <label className="text-sm">
            <span className="block font-semibold text-ink">Sponsor slug</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. blaze-heating"
              className="mt-1 rounded-[10px] border border-line px-3 py-2 font-mono text-sm text-ink placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </label>
          <label className="text-sm">
            <span className="block font-semibold text-ink">Start</span>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1 rounded-[10px] border border-line px-3 py-2 font-mono text-sm text-ink focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </label>
          <label className="text-sm">
            <span className="block font-semibold text-ink">End (exclusive)</span>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1 rounded-[10px] border border-line px-3 py-2 font-mono text-sm text-ink focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-[10px] bg-black px-4 py-2 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? "…" : "Load report"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        {data?.tableMissing && (
          <p className="mt-3 text-sm text-amber-700">
            Click tracking table isn&apos;t in the database yet — run migration
            0012_sponsor_clicks.sql in Supabase. Impressions below are still accurate.
          </p>
        )}
      </div>

      {loading && !data && <p className="text-muted">Loading report…</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="font-serif text-4xl text-ink">{data.impressions.human.toLocaleString()}</p>
              <p className="mt-1 text-sm text-muted">Human impressions</p>
              <p className="mt-1 font-mono text-xs text-muted">
                {data.impressions.total.toLocaleString()} total views
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="font-serif text-4xl text-ink">{data.clicks.human}</p>
              <p className="mt-1 text-sm text-muted">Human clicks</p>
              <p className="mt-1 font-mono text-xs text-muted">
                {data.clicks.total} total · {data.clicks.bot} bots
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="font-serif text-4xl text-ink">{(data.ctrHuman * 100).toFixed(2)}%</p>
              <p className="mt-1 text-sm text-muted">Human click-through</p>
              <p className="mt-1 font-mono text-xs text-muted">
                {fmtDateShort(data.start)} – {fmtDateShort(data.end)}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="font-serif text-4xl text-ink">{data.daily.length}</p>
              <p className="mt-1 text-sm text-muted">Days in flight</p>
              <p className="mt-1 font-mono text-xs text-muted">UTC dates</p>
            </div>
          </div>

          <div>
            <h3 className="font-serif text-xl text-ink">By day</h3>
            {data.daily.length === 0 ? (
              <p className="mt-3 text-muted">No days in this range.</p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line font-mono text-xs uppercase tracking-wide text-muted">
                      <th className="px-4 py-3 font-semibold">Day</th>
                      <th className="px-4 py-3 text-right font-semibold">Human views</th>
                      <th className="px-4 py-3 text-right font-semibold">Total views</th>
                      <th className="px-4 py-3 text-right font-semibold">Human clicks</th>
                      <th className="px-4 py-3 text-right font-semibold">Total clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((d) => (
                      <tr key={d.date} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 font-mono text-[13px] text-ink">{fmtDateShort(d.date)}</td>
                        <td className="px-4 py-3 text-right font-mono text-ink">{d.humanViews}</td>
                        <td className="px-4 py-3 text-right font-mono text-ink">{d.totalViews}</td>
                        <td className="px-4 py-3 text-right font-mono text-ink">{d.humanClicks}</td>
                        <td className="px-4 py-3 text-right font-mono text-ink">{d.clicks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.truncated && (
              <p className="mt-2 text-sm text-muted">
                Showing the first 50,000 views/clicks in this range — the tail is cut off.
              </p>
            )}
          </div>

          {data.topReferrers.length > 0 && (
            <div>
              <h3 className="font-serif text-xl text-ink">Where clicks came from</h3>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line font-mono text-xs uppercase tracking-wide text-muted">
                      <th className="px-4 py-3 font-semibold">Page</th>
                      <th className="px-4 py-3 text-right font-semibold">Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topReferrers.map((r) => (
                      <tr key={r.path} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 font-mono text-[13px] text-ink">{r.path}</td>
                        <td className="px-4 py-3 text-right font-mono text-ink">{r.clicks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-serif text-xl text-ink">Report to send the sponsor</h3>
              <button
                onClick={copyReport}
                className="whitespace-nowrap rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-black"
              >
                {copied ? "Copied ✓" : "Copy text"}
              </button>
            </div>
            <pre className="mt-3 whitespace-pre-wrap rounded-[10px] bg-card p-4 font-sans text-sm leading-relaxed text-ink">
              {reportText}
            </pre>
          </div>

          <p className="text-sm text-muted">
            Impressions count every human page view while the banner is live — the
            banner sits on every page, so that&apos;s the honest impression count.
            Clicks count only through the /go redirect. A handful of clicks over
            two weeks is the expected outcome at current traffic; the pitch is
            founding support plus a high-intent local audience, not a performance
            guarantee.
          </p>
        </>
      )}
    </div>
  );
}
