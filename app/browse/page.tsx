"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-client";
import { siteConfig } from "@/lib/site-config";
import { formatCents, formatMonthYear } from "@/lib/format";
import type { Report } from "@/lib/data";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularize(w: string): string {
  return w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;
}

function BrowseInner() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("category") ?? "All";
  const initialService = searchParams.get("service") ?? "";
  const [category, setCategory] = useState(initial);
  const [service, setService] = useState(initialService);
  const [sort, setSort] = useState<"date-desc" | "date-asc" | "price-desc" | "price-asc">("date-desc");
  const [query, setQuery] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [unconfigured, setUnconfigured] = useState(false);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) {
      setUnconfigured(true);
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await sb
        .from("reports")
        .select(
          "id, service_name, category, amount_cents, report_type, town, service_date, notes, verification_status, created_at"
        )
        .neq("verification_status", "rejected")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!error && data) setReports(data as Report[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let rs = category === "All" ? reports : reports.filter((r) => r.category === category);
    if (service) rs = rs.filter((r) => r.service_name === service);
    const tokens = normalize(query).split(" ").filter(Boolean).map(singularize);
    if (tokens.length > 0) {
      rs = rs.filter((r) => {
        const haystack = normalize(`${r.service_name} ${r.category} ${r.town}`);
        return tokens.every((t) => haystack.includes(t));
      });
    }
    return rs;
  }, [reports, category, service, query]);

  const effectiveDate = (r: Report) => r.service_date ?? r.created_at.slice(0, 10);

  const sorted = useMemo(() => {
    const rs = [...filtered];
    switch (sort) {
      case "price-desc":
        rs.sort((a, b) => b.amount_cents - a.amount_cents);
        break;
      case "price-asc":
        rs.sort((a, b) => a.amount_cents - b.amount_cents);
        break;
      case "date-asc":
        rs.sort(
          (a, b) =>
            effectiveDate(a).localeCompare(effectiveDate(b)) ||
            a.created_at.localeCompare(b.created_at)
        );
        break;
      case "date-desc":
      default:
        rs.sort(
          (a, b) =>
            effectiveDate(b).localeCompare(effectiveDate(a)) ||
            b.created_at.localeCompare(a.created_at)
        );
        break;
    }
    return rs;
  }, [filtered, sort]);

  function pickCategory(c: string) {
    setCategory(c);
    setService("");
  }

  const chips = ["All", ...siteConfig.categories];

  return (
    <div className="py-10">
      <h1 className="font-serif text-4xl text-ink sm:text-5xl">Browse prices</h1>
      <p className="mt-2 text-muted">
        Every entry is anonymous.
      </p>

      <form
        className="mt-6"
        role="search"
        onSubmit={(e) => e.preventDefault()}
      >
        <label htmlFor="browse-search" className="font-mono text-xs font-semibold uppercase tracking-wide text-muted">
          What prices are you searching for?
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="browse-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "water heater" or "roof"'
            autoComplete="off"
            className="w-full rounded-full border border-line bg-white px-5 py-3 text-ink placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="shrink-0 rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-muted hover:border-black hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => pickCategory(c)}
            className={`rounded-full px-4 py-2 text-sm font-medium border ${
              category === c
                ? "bg-black text-white border-black"
                : "bg-white text-ink border-line hover:border-black"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {service && (
        <div className="mt-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium text-ink">
            {service}
            <button
              onClick={() => setService("")}
              aria-label="Clear service filter"
              className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-ink hover:bg-neutral-300"
            >
              ×
            </button>
          </span>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-muted" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "report" : "reports"}
        </p>
        <label className="flex items-center gap-2 text-sm text-muted">
          Sort by
          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value as "date-desc" | "date-asc" | "price-desc" | "price-asc")
            }
            className="rounded-[10px] border border-line bg-white px-3 py-2 text-sm font-medium text-ink"
          >
            <option value="date-desc">Date: newest to oldest</option>
            <option value="date-asc">Date: oldest to newest</option>
            <option value="price-desc">Price: high to low</option>
            <option value="price-asc">Price: low to high</option>
          </select>
        </label>
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : unconfigured ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
            <p className="font-semibold">Database not connected yet.</p>
            <p className="mt-1 text-sm">
              Add your Supabase keys to <code>.env.local</code> (see README.md) and
              redeploy to see live reports here.
            </p>
          </div>
        ) : filtered.length === 0 ? (          <p className="text-muted">
            {query ? (
              <>
                No reports match &ldquo;{query}&rdquo;.{" "}
              </>
            ) : service ? (
              <>
                No reports for &ldquo;{service}&rdquo; yet.{" "}
              </>
            ) : (
              <>No reports in this category yet.{" "}</>
            )}
            <a href="/submit" className="font-semibold text-ink hover:underline">
              Be the first to share one.
            </a>
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="border-b border-line font-mono text-[11px] uppercase tracking-wider text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">Service</th>
                  <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">Category</th>
                  <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Town</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Price</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{r.service_name}</p>
                      {r.verification_status === "verified" ? (
                        <span className="mt-1 inline-block rounded bg-green-100 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-green-800">
                          Verified
                        </span>
                      ) : (
                        <span className="mt-1 inline-block rounded bg-neutral-100 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
                          Unverified report
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-muted sm:table-cell">{r.category}</td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-muted md:table-cell">{r.town}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                      {formatMonthYear(r.service_date ?? r.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {r.report_type === "paid" ? (
                        <span className="inline-block rounded bg-green-100 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-green-800">
                          Paid
                        </span>
                      ) : (
                        <span className="inline-block rounded bg-[#FEF3C7] px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-[#92400E]">
                          Quote
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-base font-bold text-ink">
                      {formatCents(r.amount_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<p className="py-10 text-stone-500">Loading…</p>}>
      <BrowseInner />
    </Suspense>
  );
}
