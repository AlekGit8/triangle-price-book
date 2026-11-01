import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { getBusinessName, isUnknownBusinessName } from "@/lib/reveal";

/**
 * GET /api/reveal/free/status?token= — state of one free-reveal grant
 * (earned by a verified submission, Nov 1, 2026). Returns no business
 * name while unclaimed — the name is the reward. After claiming, the
 * token holder sees the claimed name: same bearer-token access model
 * as the paid token pages (the link IS the reveal).
 */
export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token") ?? "";
    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });
    }
    const sb = getServiceSupabase();
    const { data: grant, error } = await sb
      .from("free_reveal_grants")
      .select("claimed_report_id, claimed_at")
      .eq("token", token)
      .maybeSingle();
    if (error || !grant) {
      return NextResponse.json(
        { ok: false, error: "This free reveal link isn't valid." },
        { status: 404 }
      );
    }
    if (!grant.claimed_at || !grant.claimed_report_id) {
      return NextResponse.json({ ok: true, claimed: false });
    }
    const { data: report } = await sb
      .from("reports")
      .select("service_name, category, amount_cents, report_type, town, service_date")
      .eq("id", grant.claimed_report_id)
      .maybeSingle();
    const name = await getBusinessName(grant.claimed_report_id);
    if (!report || !name || isUnknownBusinessName(name)) {
      return NextResponse.json({ ok: true, claimed: true, unavailable: true });
    }
    return NextResponse.json({ ok: true, claimed: true, business_name: name, report });
  } catch (err) {
    console.error("free reveal status error:", err);
    return NextResponse.json(
      { ok: false, error: "Could not load this free reveal." },
      { status: 500 }
    );
  }
}
