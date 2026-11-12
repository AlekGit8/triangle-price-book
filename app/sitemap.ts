import type { MetadataRoute } from "next";
import {
  siteConfig,
  categorySlugs,
  MIN_CATEGORY_REPORTS_FOR_INDEXING,
} from "@/lib/site-config";
import { getApprovedReports, getCategoryReportCount } from "@/lib/data";

/**
 * Sitemap with HONEST lastModified dates (Oct 28, 2026 SEO fix).
 *
 * The old version stamped every URL with the request time, so every
 * crawl was told everything had just changed — Google stops trusting
 * a lastmod that lies. Now each content page carries the date its
 * newest visible report was published (created_at), and pages with
 * no reports carry no lastModified at all. Static pages (terms,
 * privacy, etc.) also carry none — there is no honest per-request
 * date for them, and omitting the field beats inventing one.
 *
 * Thin-page cleanup (Nov 12, 2026): category pages below
 * MIN_CATEGORY_REPORTS_FOR_INDEXING published reports are left out
 * of the sitemap, matching their noindex metadata — a sitemap
 * should not advertise pages we ask search engines not to index.
 * A null count (DB unreachable) fails open: the category stays in.
 * /check-quote was also added here — it was indexable but missing
 * from the sitemap entirely.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.siteUrl;

  const reports = await getApprovedReports().catch(() => []);
  const latestByCategory = new Map<string, Date>();
  let latestOverall: Date | null = null;
  for (const r of reports) {
    const d = new Date(r.created_at);
    if (!latestOverall || d > latestOverall) latestOverall = d;
    const prev = latestByCategory.get(r.category);
    if (!prev || d > prev) latestByCategory.set(r.category, d);
  }

  const staticPages: Array<{
    path: string;
    priority: number;
    lastModified?: Date;
  }> = [
    { path: "", priority: 1.0, lastModified: latestOverall ?? undefined },
    { path: "/browse", priority: 0.7, lastModified: latestOverall ?? undefined },
    { path: "/how-it-works", priority: 0.5 },
    { path: "/about", priority: 0.5 },
    { path: "/contact", priority: 0.3 },
    { path: "/submit", priority: 0.7 },
    { path: "/check-quote", priority: 0.7 },
    { path: "/donate", priority: 0.5 },
    { path: "/terms", priority: 0.3 },
    { path: "/privacy", priority: 0.3 },
  ];

  const categoryCounts = await Promise.all(
    Object.entries(categorySlugs).map(async ([category, slug]) => ({
      category,
      slug,
      count: await getCategoryReportCount(category),
    }))
  );
  const categoryPages = categoryCounts
    .filter(
      ({ count }) =>
        count === null || count >= MIN_CATEGORY_REPORTS_FOR_INDEXING
    )
    .map(({ category, slug }) => ({
      path: `/${slug}`,
      priority: 0.8,
      lastModified: latestByCategory.get(category),
    }));

  return [...staticPages, ...categoryPages].map(
    ({ path, priority, lastModified }) => ({
      url: `${base}${path}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "weekly" as const,
      priority,
    })
  );
}
