import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { siteConfig, categorySlugs } from "@/lib/site-config";
import {
  createRevealCheckout,
  type RevealType,
} from "@/lib/reveal";

/**
 * POST /api/reveal/checkout — start a Stripe Checkout session for a
 * business-name reveal. Body: { type: "single" | "day", report_id? }.
 * Single requires a verified report that actually has a name stored.
 * Returns { url } — the buyer is redirected to Stripe.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { type?: unknown; report_id?: unknown };
    const type = body.type as RevealType;
    if (type !== "single" && type !== "day") {
      return NextResponse.json({ ok: false, error: "Invalid reveal type." }, { status: 400 });
    }
    const reportId = typeof body.report_id === "string" ? body.report_id : null;

    let reportLabel = "day pass";
    let cancelUrl: string;
    const origin =
      req.headers.get("origin") ?? siteConfig.siteUrl;

    if (type === "single") {
      if (!reportId) {
        return NextResponse.json({ ok: false, error: "A report is required for a single reveal." }, { status: 400 });
      }
      const sb = getServiceSupabase();
      const { data: report, error } = await sb
        .from("reports")
        .select("id, service_name, category, verification_status")
        .eq("id", reportId)
        .maybeSingle();
      if (error || !report) {
        return NextResponse.json({ ok: false, error: "Report not found." }, { status: 404 });
      }
      if (report.verification_status !== "verified") {
        return NextResponse.json(
          { ok: false, error: "Business names are only revealed for verified reports." },
          { status: 400 }
        );
      }
      // The names table is the single source of truth — no flag column
      // to drift out of sync. (Before migration 0020 this lookup fails
      // and the buyer gets a clean "not available" instead of a charge.)
      const { data: nameRow } = await sb
        .from("report_business_names")
        .select("report_id")
        .eq("report_id", reportId)
        .maybeSingle();
      if (!nameRow) {
        return NextResponse.json(
          { ok: false, error: "This report has no business name available." },
          { status: 400 }
        );
      }
      reportLabel = `${report.service_name} (${report.category})`;
      const slug = (categorySlugs as Record<string, string>)[report.category] ?? "browse";
      cancelUrl = `${origin}/${slug}`;
    } else {
      cancelUrl = `${origin}/browse`;
    }

    const session = await createRevealCheckout({
      origin,
      type,
      reportId,
      reportLabel,
      cancelUrl,
    });
    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("reveal checkout error:", err);
    const message =
      err instanceof Error && /STRIPE_SECRET_KEY/.test(err.message)
        ? "Payments are not configured yet. Please try again later."
        : "Could not start checkout. Please try again.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
