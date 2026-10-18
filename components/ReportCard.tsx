import { formatCents, formatMonthYear } from "@/lib/format";
import type { Report } from "@/lib/data";

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "amber" | "stone";
}) {
  const tones = {
    green: "bg-brand-100 text-brand-800",
    amber: "bg-amber-100 text-amber-800",
    stone: "bg-stone-100 text-stone-600",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * One anonymized price entry. Never renders a business name —
 * attribution is always "a verified homeowner in {town}".
 */
export default function ReportCard({ report }: { report: Report }) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            {report.category}
          </p>
          <h3 className="mt-1 font-semibold text-stone-900">{report.service_name}</h3>
        </div>
        <p className="text-2xl font-bold text-brand-800 whitespace-nowrap">
          {formatCents(report.amount_cents)}
          {report.amount_note && (
            <span className="text-sm font-medium text-stone-500"> {report.amount_note}</span>
          )}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={report.report_type === "paid" ? "green" : "amber"}>
          {report.report_type === "paid" ? "Paid" : "Quote"}
        </Badge>
        {report.verification_status === "verified" ? (
          <Badge tone="green">Verified</Badge>
        ) : (
          <Badge tone="stone">Unverified report</Badge>
        )}
        <span className="text-xs text-stone-500">
          {report.town}
          {report.service_date ? ` · ${formatMonthYear(report.service_date)}` : ""}
        </span>
      </div>
      {report.notes && (
        <p className="mt-3 text-sm text-stone-600">{report.notes}</p>
      )}
      <p className="mt-3 text-xs italic text-stone-400">
        Reported by {report.verification_status === "verified" ? "a verified" : "a"}{" "}
        homeowner in {report.town}
      </p>
    </article>
  );
}
