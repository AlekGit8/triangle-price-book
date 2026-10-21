import { formatCents } from "@/lib/format";
import type { ServiceAggregate } from "@/lib/data";

/**
 * Per-service aggregate card: range, median, report counts.
 * No business names appear anywhere on this card.
 */
export default function AggregateCard({ agg }: { agg: ServiceAggregate }) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {agg.category}
      </p>
      <h3 className="mt-1 font-semibold text-stone-900">{agg.service_name}</h3>
      <div className="mt-4 flex items-end justify-between">
        {agg.report_count > 1 ? (
          <>
            <div>
              <p className="text-xs text-stone-500">Range</p>
              <p className="font-bold text-stone-900">
                {formatCents(agg.min_cents)} – {formatCents(agg.max_cents)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-500">Median</p>
              <p className="text-xl font-bold text-brand-800">
                {formatCents(agg.median_cents)}
              </p>
            </div>
          </>
        ) : (
          <div>
            <p className="text-xs text-stone-500">Price</p>
            <p className="font-bold text-stone-900">
              {formatCents(agg.min_cents)}
            </p>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-stone-500">
        {agg.verified_count} verified report{agg.verified_count === 1 ? "" : "s"} ·{" "}
        {agg.paid_count} paid · {agg.quote_count} quote{agg.quote_count === 1 ? "" : "s"}
      </p>
    </article>
  );
}
