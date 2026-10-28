import { getServiceAggregates, getApprovedReports, sortReportsByEffectiveDate } from "@/lib/data";
import HomepageBody from "@/components/HomepageBody";
import JsonLd from "@/components/JsonLd";
import { faqJsonLd } from "@/lib/seo";
import { FAQ } from "@/lib/faq";


export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [aggregates, reports] = await Promise.all([
    getServiceAggregates(),
    getApprovedReports(),
  ]);
  // The "Recently reported" marquee scrolls every approved report,
  // newest first — not just the six most recent.
  const allReports = sortReportsByEffectiveDate(reports);
  return (
    <>
      {/* FAQPage JSON-LD, generated from the same FAQ data the page
          shows (lib/faq.ts) — see lib/seo.ts. */}
      <JsonLd data={faqJsonLd(FAQ)} />
      <HomepageBody aggregates={aggregates} allReports={allReports} />
    </>
  );
}
