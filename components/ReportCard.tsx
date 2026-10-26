import { formatCents, formatMonthYear } from "@/lib/format";
import type { Report } from "@/lib/data";

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "yellow" | "grey";
}) {
  const tones = {
    green: "bg-green-100 text-green-800",
    yellow: "bg-[#FEF3C7] text-[#92400E]",
    grey: "bg-neutral-100 text-neutral-600",
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * Owner seed markers ("Owner seed data…") are internal bookkeeping from the
 * site's initial data load. Strip any sentence carrying one so visitors never
 * see it, keeping the rest of the note. Shared with the Browse table, which
 * shows the same public note under the service name.
 */
export function publicNote(notes: string | null): string | null {
  if (!notes) return null;
  const kept = notes
    .split(/(?<=[.!?])\s+/)
    .filter((s) => !(/owner/i.test(s) && /seed/i.test(s)));
  const cleaned = kept.join(" ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned : null;
}

/**
 * One anonymized price entry. Never renders a business name —
 * attribution is always "a verified homeowner in {town}".
 * `compact` (marquee mode) shows the note truncated to two lines and hides
 * the attribution line so ticker cards stay roughly uniform.
 */
export default function ReportCard({
  report,
  compact = false,
}: {
  report: Report;
  compact?: boolean;
}) {
  const note = publicNote(report.notes);
  return (
    <article className="h-full rounded-2xl border border-line bg-white p-5">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
        {report.category}
      </p>
      <h3 className="mt-1 font-semibold text-ink">{report.service_name}</h3>
      <p className="mt-3 font-mono text-2xl font-bold text-ink whitespace-nowrap">
        {formatCents(report.amount_cents)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={report.report_type === "paid" ? "green" : "yellow"}>
          {report.report_type === "paid" ? "Paid" : "Quote"}
        </Badge>
        {report.verification_status === "verified" ? (
          <Badge tone="green">Verified</Badge>
        ) : (
          <Badge tone="grey">Unverified report</Badge>
        )}
        <span className="font-mono text-xs text-muted">
          {report.town} · {formatMonthYear(report.service_date ?? report.created_at)}
        </span>
      </div>
      {note && (
        <p className={compact ? "mt-3 text-sm text-muted line-clamp-2" : "mt-3 text-sm text-muted"}>{note}</p>
      )}
      {!compact && (
        <p className="mt-3 text-xs italic text-neutral-400">
          Reported by {report.verification_status === "verified" ? "a verified" : "a"}{" "}
          homeowner in {report.town}
        </p>
      )}
    </article>
  );
}
