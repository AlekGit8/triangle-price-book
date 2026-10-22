import { getServiceAggregates } from "@/lib/data";
import HomepageBody from "@/components/HomepageBody";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const aggregates = await getServiceAggregates();
  return <HomepageBody aggregates={aggregates} />;
}
