import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import {
  getBusinessName,
  getRevealNameState,
  isUnknownBusinessName,
} from "@/lib/reveal";

type Sb = ReturnType<typeof getServiceSupabase>;

/** The already-claimed name for a grant's report (or its unavailable
 *  state when the listing or name has since vanished — same honesty
 *  rule as the paid token pages). */
async function claimedResponse(sb: Sb, reportId: string) {
  const { data: report } = await sb
    .from("reports")
    .select("service_name, category, amount_cents, report_type, town, service_date")
    .eq("id", reportId)
    .maybeSingle();
  const name = await getBusinessName(reportId);
  if (!report || !name || isUnknownBusinessName(name)) {
    return NextResponse.json({ ok: true, claimed: true, unavailable: true });
  }
  return NextResponse.json({ ok: true, claimed: true, business_name: name, report });
}

/**
 * POST /api/reveal/free/claim — spend one free-reveal grant on one
 * verified listing. Single-use, enforced atomically: the UPDATE only
 * matches an unclaimed grant, so a double-submit or race claims once
 * and the second call reads back the already-claimed name instead of
 * erroring. The picked listing must be verified with a real business
 * name on file — same bar as the paid checkout — and a bad pick never
 * consumes the grant, because validation runs before the claim.
 */
export async function POST(req: Request) {
  try {
    const { token, report_id } = (await req.json()) as {
      token?: unknown;
      report_id?: unknown;
    };
    if (
      typeof token !== "string" ||
      !token ||
      typeof report_id !== "string" ||
      !report_id
    ) {
      return NextResponse.json(
        { ok: false, error: "Missing token or listing." },
        { status: 400 }
      );
    }
    const sb = getServiceSupabase();
    const { data: grant, error: grantErr } = await sb
      .from("free_reveal_grants")
      .select("id, claimed_report_id, claimed_at")
      .eq("token", token)
      .maybeSingle();
    if (grantErr || !grant) {
      return NextResponse.json(
        { ok: false, error: "This free reveal link isn't valid." },
        { status: 404 }
      );
    }
    // Already claimed (double-submit, revisit): return the claimed
    // name instead of failing — the grant was already spent on it.
    if (grant.claimed_at && grant.claimed_report_id) {
      return claimedResponse(sb, grant.claimed_report_id);
    }
    // Validate the pick before spending anything.
    const { data: report, error: repErr } = await sb
      .from("reports")
      .select(
        "id, service_name, category, amount_cents, report_type, town, service_date, verification_status"
      )
      .eq("id", report_id)
      .maybeSingle();
    if (repErr || !report || report.verification_status !== "verified") {
      return NextResponse.json(
        { ok: false, error: "That listing is no longer available. Please pick another." },
        { status: 400 }
      );
    }
    const { state, name } = await getRevealNameState(report_id);
    if (state !== "name" || !name) {
      return NextResponse.json(
        {
          ok: false,
          error: "That listing no longer has a business name available. Please pick another.",
        },
        { status: 400 }
      );
    }
    // Atomic single-use claim: only an unclaimed grant matches.
    const { data: claimed, error: claimErr } = await sb
      .from("free_reveal_grants")
      .update({
        claimed_report_id: report_id,
        claimed_at: new Date().toISOString(),
      })
      .eq("token", token)
      .is("claimed_at", null)
      .select("claimed_report_id")
      .maybeSingle();
    if (claimErr || !claimed) {
      // Lost a race: re-read; if it is now claimed, return that name.
      const { data: reread } = await sb
        .from("free_reveal_grants")
        .select("claimed_report_id, claimed_at")
        .eq("token", token)
        .maybeSingle();
      if (reread?.claimed_at && reread.claimed_report_id) {
        return claimedResponse(sb, reread.claimed_report_id);
      }
      return NextResponse.json(
        { ok: false, error: "This free reveal was already used." },
        { status: 409 }
      );
    }
    return NextResponse.json({
      ok: true,
      business_name: name,
      report: {
        service_name: report.service_name,
        category: report.category,
        amount_cents: report.amount_cents,
        report_type: report.report_type,
        town: report.town,
        service_date: report.service_date,
      },
    });
  } catch (err) {
    console.error("free reveal claim error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
