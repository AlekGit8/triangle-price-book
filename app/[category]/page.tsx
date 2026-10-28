import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  siteConfig,
  categoryFromSlug,
} from "@/lib/site-config";
import {
  getServiceAggregates,
  getApprovedReports,
  sortReportsByEffectiveDate,
} from "@/lib/data";
import { formatCents } from "@/lib/format";
import ReportCard from "@/components/ReportCard";


export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = categoryFromSlug(slug);
  if (!category) return {};
  return {
    title: `${category} Prices in Raleigh-Durham, NC | ${siteConfig.siteName}`,
    description: `Real ${category.toLowerCase()} prices reported by Triangle homeowners — see the price range, median, and individual reports before you hire. Crowdsourced and anonymous.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = categoryFromSlug(slug);
  if (!category) notFound();

  const aggregates = (await getServiceAggregates()).filter(
    (a) => a.category === category
  );
  // Individual reports: ALL published entries in this category, verified
  // and unverified — the header summary counts are verified-only by
  // design, so an unverified-only service needs this list to be visible.
  const reports = sortReportsByEffectiveDate(
    await getApprovedReports(category)
  );
  // "Prices reported" counts every published report in this category, same
  // as the homepage stat; the verified count still comes from aggregates.
  const totalReports = reports.length;
  const verifiedReports = aggregates.reduce((n, a) => n + a.verified_count, 0);
  const low =
    aggregates.length > 0
      ? Math.min(...aggregates.map((a) => a.min_cents))
      : 0;
  const high =
    aggregates.length > 0
      ? Math.max(...aggregates.map((a) => a.max_cents))
      : 0;

  return (
    <div className="py-10">
      {/* Header */}
      <section className="max-w-2xl">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          {siteConfig.regionLongName}
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-tight text-ink sm:text-5xl">
          {category} Prices in Raleigh-Durham, NC
        </h1>
        <p className="mt-4 text-lg text-muted">
          What does {category.toLowerCase()} work actually cost around here?
          These are real prices reported by homeowners across Raleigh, Durham,
          Cary, Apex, Fuquay-Varina, and surrounding Triangle towns — what
          neighbors paid or were quoted, not national averages.
        </p>
        {totalReports > 0 && (
          <p className="mt-3 font-mono text-xs text-muted">
            {totalReports} price{totalReports === 1 ? "" : "s"} reported
            {verifiedReports > 0 &&
              ` · ${verifiedReports} verified`}
            {aggregates.length > 1 &&
              ` · range ${formatCents(low)} – ${formatCents(high)}`}
          </p>
        )}
      </section>

      {/* Empty state — only when nothing has been reported in this
          category at all. The per-service aggregate cards used to live
          here; they were removed so the page goes straight from the
          summary line to the individual reports. */}
      {reports.length === 0 && (
        <section className="mt-8">
          <div className="rounded-2xl border-2 border-dashed border-line bg-white p-8 text-center">
            <p className="text-muted">
              No {category.toLowerCase()} prices reported yet.
            </p>
            <Link
              href="/submit"
              className="mt-4 inline-block rounded-[10px] bg-black px-6 py-3 font-semibold text-white hover:bg-neutral-800 dark:hover:bg-neutral-200"
            >
              Be the first — share what you paid, anonymously
            </Link>
          </div>
        </section>
      )}

      {/* Individual reports — every published entry in this category,
          verified and unverified. */}
      {reports.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-3xl text-ink sm:text-4xl">
            Individual {category.toLowerCase()} reports
          </h2>
          <p className="mt-2 text-muted">
            Every published {category.toLowerCase()} price — verified entries
            and unverified community reports.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mt-12 rounded-[24px] bg-pitch p-8 text-white sm:p-10">
        <h2 className="font-serif text-3xl">
          Had {category.toLowerCase()} work done?
        </h2>
        <p className="mt-2 text-white/70">
          Add your price in under a minute — anonymously — and help your
          neighbors avoid overpaying.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/submit"
            className="inline-block rounded-[10px] bg-white px-6 py-3 font-semibold text-ink hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Share what you paid, anonymously
          </Link>
          <Link
            href={`/browse?category=${encodeURIComponent(category)}`}
            className="inline-block rounded-[10px] border border-white/40 px-6 py-3 font-semibold text-white hover:bg-white/10"
          >
            Browse all {category.toLowerCase()} reports →
          </Link>
        </div>
      </section>
    </div>
  );
}
