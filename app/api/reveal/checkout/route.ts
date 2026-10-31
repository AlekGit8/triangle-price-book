import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { siteConfig, categorySlugs } from "@/lib/site-config";
import {
  createRevealCheckout,
  isPackType,
  isUnknownBusinessName,
  PACK_SIZES,
  type RevealType,
} from "@/lib/reveal";

/**
 * POST /api/reveal/checkout — start a Stripe Checkout session for a
 * business-name reveal. Body: { type, report_id?, report_ids?,
 * from_report_id? }.
 * Single requires a verified report that actually has a name stored.
 * Packs (pack3/pack5) require report_ids of exactly 3/5 verified
 * listings with real stored names — the selection the buyer confirmed
 * on /reveal/select. Returns { url } — the buyer is redirected to
 * Stripe.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      type?: unknown;
      report_id?: unknown;
      report_ids?: unknown;
      from_report_id?: unknown;
    };
    const type = body.type as RevealType;
    if (type !== "single" && !isPackType(type)) {
      return NextResponse.json({ ok: false, error: "Invalid reveal type." }, { status: 400 });
    }
    const reportId = typeof body.report_id === "string" ? body.report_id : null;
    const fromReportId = typeof body.from_report_id === "string" ? body.from_report_id : null;

    let reportLabel = "";
    let cancelUrl: string;
    let selectedReportIds: string[] | undefined;
    const origin =
      req.headers.get("origin") ?? siteConfig.siteUrl;

    if (isPackType(type)) {
      // Packs are select-then-pay: the buyer confirmed exactly N
      // entries on /reveal/select. Validate the selection here, at
      // checkout creation — activation trusts Stripe's copy of it.
      const size = PACK_SIZES[type];
      const rawIds = Array.isArray(body.report_ids) ? body.report_ids : [];
      const ids = [...new Set(rawIds.filter((x): x is string => typeof x === "string"))];
      if (ids.length !== size) {
        return NextResponse.json(
          { ok: false, error: `Select exactly ${size} verified listings.` },
          { status: 400 }
        );
      }
      const sb = getServiceSupabase();
      const { data: reports } = await sb
        .from("reports")
        .select("id, verification_status")
        .in("id", ids);
      const { data: nameRows } = await sb
        .from("report_business_names")
        .select("report_id, business_name")
        .in("id", ids);
      const allVerified =
        reports?.length === ids.length &&
        reports.every((r) => r.verification_status === "verified");
      const allNamed =
        nameRows?.length === ids.length &&
        nameRows.every((r) => !isUnknownBusinessName(r.business_name as string));
      if (!allVerified || !allNamed) {
        return NextResponse.json(
          { ok: false, error: "One of the selected listings no longer has a business name available. Please pick again." },
          { status: 400 }
        );
      }
      selectedReportIds = ids;
      reportLabel = `${size} verified listings`;
      // Cancel returns to the selection screen with the picks
      // pre-checked, so a changed mind costs a re-pick, not a redo.
      const back = new URLSearchParams({ pack: type, selected: ids.join(",") });
      if (fromReportId) back.set("from", fromReportId);
      cancelUrl = `${origin}/reveal/select?${back.toString()}`;
    } else if (type === "single") {
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
        .select("report_id, business_name")
        .eq("report_id", reportId)
        .maybeSingle();
      if (!nameRow) {
        return NextResponse.json(
          { ok: false, error: "This report has no business name available." },
          { status: 400 }
        );
      }
      // Defense in depth: the button never offers payment for an
      // unknown contractor, but a direct API call must not be able to
      // buy one either — nobody pays for a name that isn't there.
      if (isUnknownBusinessName(nameRow.business_name as string)) {
        return NextResponse.json(
          { ok: false, error: "This report's documentation did not list a contractor, so there is no business name to reveal." },
          { status: 400 }
        );
      }
      reportLabel = `${report.service_name} (${report.category})`;
      const slug = (categorySlugs as Record<string, string>)[report.category] ?? "browse";
      cancelUrl = `${origin}/${slug}`;
    } else {
      // Unreachable after the type check above, but fail closed rather
      // than sending a buyer to Stripe with no cancel target.
      return NextResponse.json({ ok: false, error: "Invalid reveal type." }, { status: 400 });
    }

    const session = await createRevealCheckout({
      origin,
      type,
      reportId,
      reportLabel,
      cancelUrl,
      selectedReportIds,
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
