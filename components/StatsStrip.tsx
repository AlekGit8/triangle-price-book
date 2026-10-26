import { formatCents } from "@/lib/format";
import type { ServiceAggregate } from "@/lib/data";

export default function StatsStrip({
  aggregates,
  totalReports,
}: {
  aggregates: ServiceAggregate[];
  // Total published reports (verified + unverified community reports).
  // The aggregates only cover verified entries, so this comes from the
  // full approved-reports list instead — otherwise "Prices reported" and
  // "Verified" would show the same number.
  totalReports: number;
}) {
  const verified = aggregates.reduce((n, a) => n + a.verified_count, 0);
  const low = aggregates.length ? Math.min(...aggregates.map((a) => a.min_cents)) : 0;
  const high = aggregates.length ? Math.max(...aggregates.map((a) => a.max_cents)) : 0;

  const stats: Array<[string, string]> = [
    ["Prices reported", String(totalReports)],
    ["Verified (source document provided)", String(verified)],
    ["Price range", totalReports ? `${formatCents(low)} – ${formatCents(high)}` : "—"],
  ];

  return (
    <div className="grid grid-cols-1 divide-y divide-line rounded-2xl border border-line bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {stats.map(([label, value]) => (
        <div key={label} className="px-5 py-5 text-center sm:text-left">
          <p className="font-serif text-3xl text-ink sm:text-4xl">{value}</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted">{label}</p>
        </div>
      ))}
    </div>
  );
}
