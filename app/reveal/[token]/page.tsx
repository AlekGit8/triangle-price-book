import Link from "next/link";
import { formatCents, formatMonthYear } from "@/lib/format";
import { getServiceSupabase } from "@/lib/supabase-server";
import { getBusinessName, getPurchaseByToken } from "@/lib/reveal";
import RevealPassActivator from "@/components/RevealPassActivator";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your reveal — Triangle Price Book",
  robots: { index: false, follow: false },
};

/**
 * The bookmark link from a paid reveal (/reveal/<token>).
 * Private by obscurity (256-bit token, never linked publicly, noindex):
 * a single token shows that job's business name; a day-pass token
 * re-activates the pass in this browser. Invoices are never shown here.
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

  if (purchase.type === "day") {
    const expired =
      !purchase.expires_at || purchase.expires_at <= new Date().toISOString();
    if (expired) {
      return (
        <div className="py-16 max-w-3xl mx-auto">
          <h1 className="font-serif text-3xl text-ink">This day pass has expired</h1>
          <p className="mt-3 text-muted">
            Day passes last 24 hours from purchase.{" "}
            <Link href="/browse" className="font-semibold text-ink underline underline-offset-4">Browse prices</Link> to
            start a new one.
          </p>
        </div>
      );
    }
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-ink">Your day pass</h1>
        <p className="mt-3 text-muted">
          Good until {new Date(purchase.expires_at as string).toLocaleString()}.
          Use the button below to turn on business names on all verified
          listings in this browser.
        </p>
        <RevealPassActivator token={token} />
        <p className="mt-4 text-sm text-muted">
          Bookmark this page — this link re-activates your pass in any browser
          until it expires.
        </p>
      </div>
    );
  }

  // Single reveal: show the name + the (already public) job details.
  if (!purchase.report_id) {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-ink">This link isn&rsquo;t valid</h1>
        <p className="mt-3 text-muted">
          <Link href="/browse" className="font-semibold text-ink underline underline-offset-4">Browse prices</Link> to
          start a new reveal.
        </p>
      </div>
    );
  }
  const sb = getServiceSupabase();
  const { data: report } = await sb
    .from("reports")
    .select("service_name, category, amount_cents, town, service_date")
    .eq("id", purchase.report_id)
    .maybeSingle();
  const name = await getBusinessName(purchase.report_id);
  if (!report || !name) {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-ink">This reveal is no longer available</h1>
        <p className="mt-3 text-muted">
          The business name was removed from this listing.{" "}
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
        Performed by <span className="font-semibold">{name}</span>
      </p>
      <p className="mt-4 text-sm text-muted">
        Bookmark this page — this link re-opens this reveal any time. The
        invoice behind this job is never shown.
      </p>
    </div>
  );
}
