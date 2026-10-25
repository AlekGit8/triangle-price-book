import Link from "next/link";
import { formatCents } from "@/lib/format";
import type { ServiceAggregate } from "@/lib/data";

/**
 * Per-service aggregate card: range, median, report counts.
 * Links to the browse page filtered to this service's reports.
 * No business names appear anywhere on this card.
 */
export default function AggregateCard({ agg }: { agg: ServiceAggregate }) {
  const href = `/browse?category=${encodeURIComponent(agg.category)}&service=${encodeURIComponent(agg.service_name)}`;
  return (
    <Link
      href={href}
      aria-label={`See all ${agg.service_name} price reports`}
      className="block rounded-2xl border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:border-black hover:shadow-md"
    >
      <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
        {agg.category}
      </p>
      <h3 className="mt-1 font-semibold text-ink">{agg.service_name}</h3>
      <div className="mt-4 flex items-end justify-between">
        {agg.report_count > 1 ? (
          <>
            <div>
              <p className="font-mono text-[11px] text-muted">Range</p>
              <p className="font-mono font-bold text-ink">
                {formatCents(agg.min_cents)} – {formatCents(agg.max_cents)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[11px] text-muted">Median</p>
              <p className="font-mono text-xl font-bold text-ink">
                {formatCents(agg.median_cents)}
              </p>
            </div>
          </>
        ) : (
          <div>
            <p className="font-mono text-[11px] text-muted">Price</p>
            <p className="font-mono font-bold text-ink">
              {formatCents(agg.min_cents)}
            </p>
          </div>
        )}
      </div>
      <p className="mt-3 font-mono text-[11px] text-muted">
        {agg.verified_count} verified report{agg.verified_count === 1 ? "" : "s"} ·{" "}
        {agg.paid_count} paid · {agg.quote_count} quote{agg.quote_count === 1 ? "" : "s"}
      </p>
      <p className="mt-3 text-sm font-semibold text-ink">
        See reports →
      </p>
    </Link>
  );
}
