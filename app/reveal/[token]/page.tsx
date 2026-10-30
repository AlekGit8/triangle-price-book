import Link from "next/link";
import { formatCents, formatMonthYear } from "@/lib/format";
import { getServiceSupabase } from "@/lib/supabase-server";
import { getBusinessName, getPurchaseByToken, isUnknownBusinessName, UNKNOWN_CONTRACTOR_MESSAGE } from "@/lib/reveal";
import { sortReportsByEffectiveDate, type Report } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your reveal — Triangle Price Book",
  robots: { index: false, follow: false },
};

/**
 * The private list page from a paid reveal (/reveal/<token>).
 * Private by obscurity (256-bit token, never linked publicly, noindex):
 * a single token lists that one job and its business; an "all" token
 * lists every verified listing that has a stored business name,
 * generated live on each load — so newly verified listings show up
 * automatically. No cookies, no email, no expiry: the link IS the list.
 * Invoices are never shown here.
 */
export default async function RevealPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const purchase = await getPurchaseByToken(token);

  if (!purchase) {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-ink">This link isn&rsquo;t valid</h1>
        <p className="mt-3 text-muted">
          It may have been typed wrong, or the purchase it came from no longer
          exists. <Link href="/browse" className="font-semibold text-ink underline underline-offset-4">Browse prices</Link> to
          start a new reveal.
        </p>
      </div>
    );
  }

  const bookmarkNote = (
    <p className="mt-4 text-sm text-muted">
      Bookmark this page — this link opens your list any time, in any
      browser. If you lose the link, the list is gone and you&rsquo;d need
      to buy it again. The invoice behind a job is never shown.
    </p>
  );

  // Single reveal: that one job + its business.
  if (purchase.type === "single") {
    const sb = getServiceSupabase();
    const { data: report } = await sb
      .from("reports")
      .select("service_name, category, amount_cents, report_type, town, service_date")
      .eq("id", purchase.report_id ?? "")
      .maybeSingle();
    const name = purchase.report_id ? await getBusinessName(purchase.report_id) : null;
    const unknown = isUnknownBusinessName(name);
    if (!report || (!name && !unknown)) {
      return (
        <div className="py-16 max-w-3xl mx-auto">
          <h1 className="font-serif text-3xl text-ink">This reveal is no longer available</h1>
          <p className="mt-3 text-muted">
            The listing or its business name is no longer available.{" "}
            <Link href="/contact" className="font-semibold text-ink underline underline-offset-4">Contact us</Link> if
            you need help with your purchase.
          </p>
        </div>
      );
    }
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
          {report.category}
        </p>
        <h1 className="mt-1 font-serif text-3xl text-ink">{report.service_name}</h1>
        <p className="mt-2 font-mono text-2xl font-bold text-ink">
          {formatCents(report.amount_cents)}
        </p>
        <p className="mt-2 text-sm text-muted">
          {report.town} · {formatMonthYear(report.service_date)}
        </p>
        <p className="mt-6 rounded-2xl border border-line bg-white p-5 text-ink">
          {unknown ? (
            UNKNOWN_CONTRACTOR_MESSAGE
          ) : (
            <>
              {report.report_type === "quote" ? "Quoted by" : "Performed by"}{" "}
              <span className="font-semibold">{name}</span>
            </>
          )}
        </p>
        <p className="mt-4">
          <Link href={`/report/${purchase.report_id}`} className="font-semibold text-ink underline underline-offset-4">
            View the listing →
          </Link>
        </p>
        {bookmarkNote}
      </div>
    );
  }

  // "All" reveal: every verified listing with a stored business name,
  // generated live on each load.
  const sb = getServiceSupabase();
  const { data: nameRows } = await sb
    .from("report_business_names")
    .select("report_id, business_name");
  const names = new Map<string, string>(
    (nameRows ?? []).map((r) => [r.report_id as string, r.business_name as string])
  );
  const { data: reports } = await sb
    .from("reports")
    .select("id, service_name, category, amount_cents, report_type, town, service_date, notes, verification_status, created_at")
    .in("id", [...names.keys()])
    .eq("verification_status", "verified");
  // Unknown-contractor rows stay in the list with the note instead of
  // a name — the buyer paid for all verified listings, and silently
  // dropping one (or showing "Performed by NA") would be dishonest.
  const rows = sortReportsByEffectiveDate((reports ?? []) as Report[])
    .map((r) => ({ report: r, name: names.get(r.id) ?? "", unknown: isUnknownBusinessName(names.get(r.id)) }))
    .filter((row) => row.name);

  if (rows.length === 0) {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-ink">No business names are currently available</h1>
        <p className="mt-3 text-muted">
          The names on this list may have been removed from their listings.{" "}
          <Link href="/contact" className="font-semibold text-ink underline underline-offset-4">Contact us</Link> if
          you need help with your purchase.
        </p>
      </div>
    );
  }

  return (
    <div className="py-16 max-w-3xl mx-auto">
      <h1 className="font-serif text-3xl text-ink">Who did the work</h1>
      <p className="mt-3 text-muted">
        {rows.length} verified {rows.length === 1 ? "listing" : "listings"} — the business behind each one, where the submitted documentation listed one.
      </p>
      <ul className="mt-6 space-y-3">
        {rows.map(({ report, name, unknown }) => (
          <li key={report.id} className="rounded-2xl border border-line bg-white p-5">
            <Link href={`/report/${report.id}`} className="font-semibold text-ink hover:underline">
              {report.service_name}
            </Link>
            <p className="mt-1 text-sm text-muted">
              {report.town} · {formatMonthYear(report.service_date)} · {formatCents(report.amount_cents)}
            </p>
            <p className="mt-2 text-ink">
              {unknown ? (
                UNKNOWN_CONTRACTOR_MESSAGE
              ) : (
                <>
                  {report.report_type === "quote" ? "Quoted by" : "Performed by"}{" "}
                  <span className="font-semibold">{name}</span>
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
      {bookmarkNote}
      <p className="mt-2 text-sm text-muted">
        A business that believes a listing is inaccurate can{" "}
        <Link href="/contact" className="font-semibold text-ink underline underline-offset-4">contact us</Link> to
        dispute it.
      </p>
    </div>
  );
}
