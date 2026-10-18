import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { getServiceAggregates } from "@/lib/data";
import StatsStrip from "@/components/StatsStrip";
import AggregateCard from "@/components/AggregateCard";
import { formatCents } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const aggregates = await getServiceAggregates();

  // Find the two generator-interlock quotes to power the anonymized callout.
  const interlock = aggregates.find((a) =>
    a.service_name.toLowerCase().includes("generator interlock")
  );
  const gap =
    interlock && interlock.report_count >= 2
      ? interlock.max_cents - interlock.min_cents
      : null;

  return (
    <div className="py-10">
      {/* Hero */}
      <section className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-brand-900 leading-tight">
          {siteConfig.tagline}
        </h1>
        <p className="mt-4 text-lg text-stone-600">{siteConfig.subTagline}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {siteConfig.categories.map((c) => (
            <Link
              key={c}
              href={`/browse?category=${encodeURIComponent(c)}`}
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
            Share what you paid
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="mt-10">
        <StatsStrip aggregates={aggregates} />
      </section>

      {/* Anonymized comparison callout */}
      {gap !== null && interlock && (
        <section className="mt-10 rounded-2xl border-2 border-accent-400 bg-amber-50 p-6">
          <p className="text-sm font-bold uppercase tracking-wide text-accent-600">
            Why this exists
          </p>
          <p className="mt-2 text-xl font-semibold text-stone-900">
            Same scope, two quotes, {formatCents(gap)} apart.
          </p>
          <p className="mt-2 text-stone-600">
            Two verified {interlock.category.toLowerCase()} reports from
            Fuquay-Varina for “{interlock.service_name}” — one quote of{" "}
            {formatCents(interlock.min_cents)}, another of{" "}
            {formatCents(interlock.max_cents)}. No names attached; the numbers
            speak for themselves.
          </p>
        </section>
      )}

      {/* Aggregates */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold text-brand-900">Price ranges by service</h2>
          <Link href="/browse" className="text-sm font-semibold text-brand-700 hover:underline">
            Browse all reports →
          </Link>
        </div>
        {aggregates.length === 0 ? (
          <p className="mt-4 text-stone-600">
            No approved reports yet. Be the first to{" "}
            <Link href="/submit" className="font-semibold text-brand-700 hover:underline">
              share what you paid
            </Link>
            .
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {aggregates.map((agg) => (
              <AggregateCard key={`${agg.category}-${agg.service_name}`} agg={agg} />
            ))}
          </div>
        )}
      </section>

      {/* How it works teaser */}
      <section className="mt-12 rounded-2xl bg-brand-900 p-8 text-white">
        <h2 className="text-2xl font-bold">How it works</h2>
        <ol className="mt-4 space-y-3 text-brand-100">
          <li><strong className="text-white">1.</strong> Neighbors submit what they paid or were quoted — optionally with an invoice.</li>
          <li><strong className="text-white">2.</strong> Entries are reviewed and published anonymously. Businesses are never named on individual entries.</li>
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
