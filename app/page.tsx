import { getServiceAggregates, getApprovedReports } from "@/lib/data";
import HomepageBody from "@/components/HomepageBody";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [aggregates, reports] = await Promise.all([
    getServiceAggregates(),
    getApprovedReports(),
  ]);
  return <HomepageBody aggregates={aggregates} recentReports={reports.slice(0, 6)} />;
}
