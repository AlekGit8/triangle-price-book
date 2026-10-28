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
import { canonicalUrl, breadcrumbJsonLd } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
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
  const title = `${category} Prices in Raleigh-Durham, NC | ${siteConfig.siteName}`;
  const description = `Real ${category.toLowerCase()} prices reported by Triangle homeowners — see the price range, median, and individual reports before you hire. Crowdsourced and anonymous.`;
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl(`/${slug}`) },
    openGraph: {
      title,
      description,
      url: canonicalUrl(`/${slug}`),
      type: "website",
    },
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

  // Both fetches run in parallel (P4 — they were sequential), and the
  // aggregates query is narrowed to this category at the DB.
  const [aggregates, reports] = await Promise.all([
    getServiceAggregates(category),
    getApprovedReports(category).then(sortReportsByEffectiveDate),
  ]);
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
      {/* Breadcrumb structured data — Home → this category. */}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: siteConfig.siteUrl },
          {
            name: `${category} Prices in Raleigh-Durham, NC`,
            url: canonicalUrl(`/${slug}`),
          },
        ])}
      />
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

      {/* About this category — qualitative only, no price claims; the
          numbers come from the reports below. Gives empty categories
          substance before their first report (Oct 28, 2026 SEO). */}
      <section className="mt-8 max-w-2xl rounded-2xl border border-line bg-white p-6">
        <p className="text-muted">{siteConfig.categoryIntros[category].about}</p>
        <p className="mt-3 text-sm text-muted">
          <span className="font-semibold text-ink">What drives the price: </span>
          {siteConfig.categoryIntros[category].drivers}
        </p>
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
