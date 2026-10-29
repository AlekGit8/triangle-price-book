"use client";

import Link from "next/link";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { siteConfig, categorySlugs } from "@/lib/site-config";
import { normalizeText as normalize, singularize } from "@/lib/search";
import type { ServiceAggregate, Report } from "@/lib/data";
import StatsStrip from "@/components/StatsStrip";
import ReportCard from "@/components/ReportCard";
import Marquee, { MarqueeCopyContext } from "@/components/Marquee";

/** One ticker card. Clicking opens the full detail card; dragging (or a
    swipe) still scrolls instead — a click is ignored when the pointer
    moved more than a few pixels between press and release, and the
    marquee itself swallows drag-end clicks. Only the first tiled copy
    is keyboard-focusable; the aria-hidden duplicates stay
    pointer-clickable but out of the tab order. */
function MarqueeCard({
  report,
  onOpen,
}: {
  report: Report;
  onOpen: (report: Report) => void;
}) {
  const copy = useContext(MarqueeCopyContext);
  const firstCopy = copy === 0;
  const downPos = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className="w-[300px] shrink-0 cursor-pointer sm:w-[340px]"
      role="button"
      tabIndex={firstCopy ? 0 : -1}
      aria-label={`${report.service_name}, ${report.town}, details`}
      onPointerDown={(e) => {
        downPos.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={(e) => {
        const down = downPos.current;
        if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
          return;
        }
        onOpen(report);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(report);
        }
      }}
    >
      <ReportCard
        report={report}
        compact
        revealTabIndex={firstCopy ? undefined : -1}
      />
    </div>
  );
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

import { FAQ } from "@/lib/faq";

export default function HomepageBody({
  aggregates,
  allReports,
}: {
  aggregates: ServiceAggregate[];
  allReports: Report[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Report | null>(null);
  const resultsRef = useRef<HTMLElement>(null);

  // Close the detail card with Escape.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  // Pills ordered by total published reports in each category, most to
  // least; ties keep the site-config order. Categories with no reports
  // sort last.
  const categoriesByReports = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of allReports) {
      counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    }
    return [...siteConfig.categories].sort((a, b) => {
      const diff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
      if (diff !== 0) return diff;
      return siteConfig.categories.indexOf(a) - siteConfig.categories.indexOf(b);
    });
  }, [allReports]);

  const isFiltering = normalize(query).length > 0;
  const filtered = useMemo(
    () => allReports.filter((r) => matchesReport(r, query)),
    [allReports, query]
  );

  function scrollToResults(e: React.FormEvent) {
    e.preventDefault();
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="py-10">
      {/* Hero */}
      <section className="dot-grid -mx-4 px-4 pb-12 pt-14 text-center sm:pt-20">
        <p className="inline-block rounded-full border border-line bg-white px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-muted">
          Crowdsourced anonymous data · No accounts
        </p>
        <h1 className="mx-auto mt-6 max-w-3xl font-serif text-5xl leading-[1.05] text-ink sm:text-6xl">
          {siteConfig.tagline}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">{siteConfig.subTagline}</p>

        {/* Search */}
        <form onSubmit={scrollToResults} className="mx-auto mt-8 max-w-xl text-left" role="search">
          <label
            htmlFor="price-search"
            className="block text-sm font-semibold text-ink"
          >
            What prices are you searching for?
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="price-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='try "heat pump" or "water heater"'
              autoComplete="off"
              className="w-full rounded-full border border-line bg-white px-5 py-3 text-ink placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            />
            {isFiltering && (
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

        <div className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
          {categoriesByReports.map((c) => (
            <Link
              key={c}
              href={`/${categorySlugs[c]}`}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:border-black"
            >
              {c}
            </Link>
          ))}
        </div>
        <div className="mt-8">
          <Link
            href="/submit"
            className="inline-block rounded-[10px] bg-black px-6 py-3 font-semibold text-white hover:bg-neutral-800 dark:hover:bg-neutral-200"
          >
            Share what you paid, anonymously →
          </Link>
          <p className="mt-4">
            <Link href="/check-quote" className="font-semibold text-ink hover:underline">
              Got a quote? Check if it&rsquo;s fair →
            </Link>
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="mt-4">
        <StatsStrip aggregates={aggregates} totalReports={allReports.length} />
      </section>

      {/* Recently reported */}
      <section ref={resultsRef} className="mt-16 scroll-mt-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-3xl text-ink sm:text-4xl">
            {isFiltering ? (
              <>
                Results for &ldquo;{query.trim()}&rdquo;
              </>
            ) : (
              "Recently reported services"
            )}
          </h2>
          <Link href="/browse" className="shrink-0 font-mono text-[13px] font-semibold text-ink hover:underline">
            Browse all reports →
          </Link>
        </div>
        {isFiltering && (
          <p className="mt-2 font-mono text-xs text-muted">
            {filtered.length} report{filtered.length === 1 ? "" : "s"} found
          </p>
        )}
        {filtered.length === 0 ? (
          <p className="mt-4 text-muted">
            {isFiltering ? (
              <>
                No reports for &ldquo;{query.trim()}&rdquo; yet. Be the first to{" "}
                <Link href="/submit" className="font-semibold text-ink hover:underline">
                  share what you paid
                </Link>
                .
              </>
            ) : (
              <>
                No reports yet. Be the first to{" "}
                <Link href="/submit" className="font-semibold text-ink hover:underline">
                  share what you paid
                </Link>
                .
              </>
            )}
          </p>
        ) : isFiltering ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {filtered.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        ) : (
          <Marquee
            ariaLabel="Recently reported services — swipe or drag to scroll"
            className="mt-6"
            durationMs={150_000}
          >
            {allReports.slice(0, 15).map((report) => (
              <MarqueeCard key={report.id} report={report} onOpen={setSelected} />
            ))}
          </Marquee>
        )}
      </section>

      {/* Why this exists */}
      <section className="mx-auto mt-20 max-w-2xl text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d="M12 3l9 8h-3v9h-4v-6h-4v6H6v-9H3l9-8z" />
          </svg>
        </span>
        <p className="mt-5 font-mono text-xs font-semibold uppercase tracking-widest text-muted">
          Why this exists
        </p>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          The idea is simple: when everyone can see what things actually cost
          around here, we all make more informed decisions &mdash; and nobody
          overpays. The more that people contribute, the more useful this
          becomes.
        </p>
        <p className="mt-5 font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
          Built by a local Triangle homeowner to make all our lives easier.
        </p>
      </section>

      {/* How it works teaser */}
      <section className="mt-20 rounded-[24px] bg-pitch p-8 text-white sm:p-10">
        <h2 className="font-serif text-3xl sm:text-4xl">How it works</h2>
        <ol className="mt-5 space-y-3 text-white/70">
          <li><strong className="text-white">1.</strong> Neighbors submit what they paid or were quoted — optionally with an invoice.</li>
          <li><strong className="text-white">2.</strong> Entries publish instantly and anonymously.</li>
          <li><strong className="text-white">3.</strong> Everyone sees real local prices before hiring.</li>
        </ol>
        <Link
          href="/how-it-works"
          className="mt-7 inline-block rounded-[10px] bg-white px-5 py-2.5 font-semibold text-ink hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Full transparency page
        </Link>
      </section>

      {/* Quick answers */}
      <section className="mx-auto mt-20 max-w-2xl">
        <h2 className="text-center font-serif text-3xl text-ink sm:text-4xl">Quick answers</h2>
        <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-white">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {q}
                <span className="font-mono text-lg text-muted transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-2 text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Detail card: click a ticker card to see the full entry. The
          overlay scrolls (instead of centering a possibly taller-than-
          viewport card with no way to reach the cut-off top on phones). */}
      {selected && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[#000]/50"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${selected.service_name} details`}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <ReportCard report={selected} />
              <button
                onClick={() => setSelected(null)}
                aria-label="Close details"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-card text-lg leading-none text-ink hover:bg-line"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final call to action */}
      <section className="mt-20 rounded-3xl bg-card p-8 text-center sm:p-12">
        <h2 className="mx-auto max-w-2xl font-serif text-3xl leading-tight text-ink sm:text-4xl">
          Real prices paid by your neighbors — not national averages, not sponsored estimates.
        </h2>
        <Link
          href="/submit"
          className="mt-7 inline-block rounded-[10px] bg-black px-6 py-3 font-semibold text-white hover:bg-neutral-800 dark:hover:bg-neutral-200"
        >
          Share what you paid, anonymously →
        </Link>
      </section>
    </div>
  );
}
