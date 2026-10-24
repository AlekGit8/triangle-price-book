import { getServiceAggregates, getApprovedReports, sortReportsByEffectiveDate } from "@/lib/data";
import HomepageBody from "@/components/HomepageBody";

export const runtime = 'edge';

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [aggregates, reports] = await Promise.all([
    getServiceAggregates(),
    getApprovedReports(),
  ]);
  const recentReports = sortReportsByEffectiveDate(reports).slice(0, 6);
  return <HomepageBody aggregates={aggregates} recentReports={recentReports} />;
}
