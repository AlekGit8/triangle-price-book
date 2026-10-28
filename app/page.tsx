import { getServiceAggregates, getApprovedReports, sortReportsByEffectiveDate } from "@/lib/data";
import HomepageBody from "@/components/HomepageBody";
import JsonLd from "@/components/JsonLd";
import { faqJsonLd } from "@/lib/seo";
import { FAQ } from "@/lib/faq";


// Cached for 5 minutes (LCP, Oct 28, 2026): this page only reads public
// report data, which changes only when a report is published or taken
// down — so a fresh render per request was pure overhead. Replacing the
// old force-dynamic: new reports and takedowns now appear within 5 min.
export const revalidate = 300;

export default async function HomePage() {
  const [aggregates, reports] = await Promise.all([
    getServiceAggregates(),
    getApprovedReports(),
  ]);
  // The "Recently reported" marquee scrolls the 15 most recent approved
  // reports, newest first — trimmed from 30 for page weight (LCP, Oct 28,
  // 2026): the marquee renders three copies, so 30 reports meant 90 cards
  // in the HTML plus the RSC payload.
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
