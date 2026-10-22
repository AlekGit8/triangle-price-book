"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { siteConfig, categorySlugs } from "@/lib/site-config";
import type { ServiceAggregate, Report } from "@/lib/data";
import StatsStrip from "@/components/StatsStrip";
import ReportCard from "@/components/ReportCard";

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

/** Every word in the query (plural-insensitive) must appear in the service name, category, or town. */
function matchesReport(
  report: { service_name: string; category: string; town: string },
  query: string
): boolean {
  const tokens = normalize(query).split(" ").filter(Boolean).map(singularize);
  if (tokens.length === 0) return true;
  const haystack = normalize(`${report.service_name} ${report.category} ${report.town}`);
  return tokens.every((t) => haystack.includes(t));
}

export default function HomepageBody({
  aggregates,
  recentReports,
}: {
  aggregates: ServiceAggregate[];
  recentReports: Report[];
}) {
  const [query, setQuery] = useState("");
  const resultsRef = useRef<HTMLElement>(null);

  const isFiltering = normalize(query).length > 0;
  const filtered = useMemo(
    () => recentReports.filter((r) => matchesReport(r, query)),
    [recentReports, query]
  );

  function scrollToResults(e: React.FormEvent) {
    e.preventDefault();
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="py-10">
      {/* Hero */}
      <section className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-brand-900 leading-tight">
          {siteConfig.tagline}
        </h1>
        <p className="mt-4 text-lg text-stone-600">{siteConfig.subTagline}</p>

        {/* Search */}
        <form onSubmit={scrollToResults} className="mt-6 text-left" role="search">
          <label
            htmlFor="price-search"
            className="block text-sm font-semibold text-stone-800"
          >
            What prices are you searching for?
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="price-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Try "water heater" or "fence"'
              autoComplete="off"
              className="w-full rounded-full border border-stone-300 bg-white px-5 py-3 text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            {isFiltering && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 rounded-full border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-600 hover:border-stone-400 hover:text-stone-800"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {siteConfig.categories.map((c) => (
            <Link
              key={c}
              href={`/${categorySlugs[c]}`}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-brand-600 hover:text-brand-800"
            >
              {c}
            </Link>
          ))}
        </div>
        <div className="mt-6">
          <Link
            href="/submit"
            className="inline-block rounded-full bg-accent-500 px-6 py-3 font-bold text-white hover:bg-accent-600"
          >
            Share what you paid, anonymously
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="mt-10">
        <StatsStrip aggregates={aggregates} />
      </section>

      {/* Why this exists */}
      <section className="mt-10 rounded-2xl border-2 border-accent-400 bg-amber-50 p-6">
        <p className="text-sm font-bold uppercase tracking-wide text-accent-600">
          Why this exists
        </p>
        <p className="mt-2 text-stone-600">
          The idea is simple: when everyone can see what things actually cost
          around here, we all make more informed decisions &mdash; and nobody
          overpays. The more that people contribute, the more useful this
          becomes.
        </p>
      </section>

      {/* Recently reported */}
      <section ref={resultsRef} className="mt-10 scroll-mt-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-bold text-brand-900">
            {isFiltering ? (
              <>
                Results for &ldquo;{query.trim()}&rdquo;
              </>
            ) : (
              "Recently reported services"
            )}
          </h2>
          <Link href="/browse" className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">
            Browse all reports →
          </Link>
        </div>
        {isFiltering && (
          <p className="mt-2 text-sm text-stone-500">
            {filtered.length} report{filtered.length === 1 ? "" : "s"} found
          </p>
        )}
        {filtered.length === 0 ? (
          <p className="mt-4 text-stone-600">
            {isFiltering ? (
              <>
                No reports for &ldquo;{query.trim()}&rdquo; yet. Be the first to{" "}
                <Link href="/submit" className="font-semibold text-brand-700 hover:underline">
                  share what you paid
                </Link>
                .
              </>
            ) : (
              <>
                No reports yet. Be the first to{" "}
                <Link href="/submit" className="font-semibold text-brand-700 hover:underline">
                  share what you paid
                </Link>
                .
              </>
            )}
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {filtered.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </section>

      {/* How it works teaser */}
      <section className="mt-12 rounded-2xl bg-brand-900 p-8 text-white">
        <h2 className="text-2xl font-bold">How it works</h2>
        <ol className="mt-4 space-y-3 text-brand-100">
          <li><strong className="text-white">1.</strong> Neighbors submit what they paid or were quoted — optionally with an invoice.</li>
          <li><strong className="text-white">2.</strong> Entries publish instantly and anonymously.</li>
          <li><strong className="text-white">3.</strong> Everyone sees real local prices before hiring.</li>
        </ol>
        <Link
          href="/how-it-works"
          className="mt-6 inline-block rounded-full bg-white px-5 py-2.5 font-semibold text-brand-900 hover:bg-brand-50"
        >
          Full transparency page
        </Link>
      </section>
    </div>
  );
}
