import { formatCents } from "@/lib/format";
import type { ServiceAggregate } from "@/lib/data";

export default function StatsStrip({ aggregates }: { aggregates: ServiceAggregate[] }) {
  const totalReports = aggregates.reduce((n, a) => n + a.report_count, 0);
  const verified = aggregates.reduce((n, a) => n + a.verified_count, 0);
  const low = aggregates.length ? Math.min(...aggregates.map((a) => a.min_cents)) : 0;
  const high = aggregates.length ? Math.max(...aggregates.map((a) => a.max_cents)) : 0;

  const stats: Array<[string, string]> = [
    ["Prices reported", String(totalReports)],
    ["Verified (source document provided)", String(verified)],
    ["Price range", totalReports ? `${formatCents(low)} – ${formatCents(high)}` : "—"],
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {stats.map(([label, value]) => (
        <div
          key={label}
          className="rounded-xl bg-brand-900 px-4 py-3 text-white"
        >
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-brand-100">{label}</p>
        </div>
      ))}
    </div>
  );
}
