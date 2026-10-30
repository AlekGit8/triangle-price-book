import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
import { getReportById } from "@/lib/data";
import { formatCents } from "@/lib/format";
import { canonicalUrl } from "@/lib/seo";
import ReportCard from "@/components/ReportCard";

// Same 5-minute cache as the homepage and category pages: a fresh render
// per request was pure overhead for data that only changes when a report
// is published or taken down.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const report = await getReportById(id);
  if (!report) return {};
  const title = `${report.service_name} — ${formatCents(report.amount_cents)} in ${report.town} | ${siteConfig.siteName}`;
  const description = `A ${report.verification_status === "verified" ? "verified " : ""}${report.report_type} price for ${report.service_name} in ${report.town}, reported by a Triangle homeowner. Crowdsourced and anonymous.`;
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl(`/report/${id}`) },
    openGraph: {
      title,
      description,
      url: canonicalUrl(`/report/${id}`),
      type: "website",
    },
  };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getReportById(id);
  if (!report) notFound();

  return (
    <div className="py-10">
      <Link
        href="/browse"
        className="font-mono text-[13px] font-semibold text-ink hover:underline"
      >
        ← Browse all prices
      </Link>
      <div className="mt-6 max-w-2xl">
        <ReportCard report={report} />
      </div>
    </div>
  );
}
