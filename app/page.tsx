import { getServiceAggregates, getApprovedReports, sortReportsByEffectiveDate } from "@/lib/data";
import HomepageBody from "@/components/HomepageBody";


export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [aggregates, reports] = await Promise.all([
    getServiceAggregates(),
    getApprovedReports(),
  ]);
  // The "Recently reported" marquee scrolls every approved report,
  // newest first — not just the six most recent.
  const allReports = sortReportsByEffectiveDate(reports);
  return <HomepageBody aggregates={aggregates} allReports={allReports} />;
}
