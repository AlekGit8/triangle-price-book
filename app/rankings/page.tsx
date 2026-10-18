import { siteConfig } from "@/lib/site-config";
import { getBusinessReportCounts } from "@/lib/data";

export const dynamic = "force-dynamic";

function ProgressBar({ count, threshold }: { count: number; threshold: number }) {
  const pct = Math.min(100, Math.round((count / threshold) * 100));
  return (
    <div className="h-2.5 w-full rounded-full bg-stone-200">
      <div className="h-2.5 rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function RankingsPage() {
  const threshold = siteConfig.rankingThreshold;
  const counts = await getBusinessReportCounts();
  const qualified = counts.filter((b) => b.report_count >= threshold);
  const approaching = counts.filter((b) => b.report_count < threshold);

  return (
    <div className="py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold text-brand-900">Business rankings</h1>
      <p className="mt-3 text-stone-600">
        Which businesses tend to quote more or less? Rankings compare{" "}
        <strong>reported price ranges per business per service</strong> — never a
        single price as “what they charge.”
      </p>

      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-bold text-stone-900">The {threshold}-report rule</h2>
        <p className="mt-2 text-sm text-stone-600">
          A business appears in rankings only after <strong>{threshold} verified
          reports</strong>. This prevents a single report from defining a business
          and makes gaming the rankings expensive. Below the threshold, a business
          simply doesn’t appear.
        </p>
      </div>

      {qualified.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-brand-900">Qualified businesses</h2>
          <div className="mt-4 space-y-3">
            {qualified.map((b) => (
              <div key={b.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-stone-900">{b.name}</span>
                  <span className="text-stone-500">{b.report_count} reports</span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  Reported price ranges per service will appear here once the ranking
                  view is built out.
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-brand-900">On the way to rankings</h2>
          <p className="mt-2 text-sm text-stone-600">
            No business has reached {threshold} reports yet — rankings unlock as
            neighbors contribute.
          </p>
          <div className="mt-4 space-y-3">
            {approaching.map((b) => (
              <div key={b.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold text-stone-900">{b.name}</span>
                  <span className="text-stone-500">
                    {b.report_count} of {threshold} reports
                  </span>
                </div>
                <ProgressBar count={b.report_count} threshold={threshold} />
              </div>
            ))}
            {approaching.length === 0 && (
              <p className="text-sm text-stone-500">
                No businesses in the system yet.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Locked illustrative example */}
      <section className="mt-8 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-5 opacity-75">
        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
          Illustrative example — not real data
        </p>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between rounded-lg bg-white px-4 py-3 border border-stone-200">
            <span className="font-semibold">Business A</span>
            <span className="text-stone-600">Generator interlock: $2,200 – $2,600 (8 reports)</span>
          </div>
          <div className="flex justify-between rounded-lg bg-white px-4 py-3 border border-stone-200">
            <span className="font-semibold">Business B</span>
            <span className="text-stone-600">Generator interlock: $2,500 – $2,900 (6 reports)</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-stone-500">
          Once businesses qualify, you’ll see comparisons like this: reported ranges,
          report counts, no single price presented as fact.
        </p>
      </section>
    </div>
  );
}
