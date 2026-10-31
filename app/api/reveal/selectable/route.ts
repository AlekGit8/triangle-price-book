import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { isUnknownBusinessName } from "@/lib/reveal";

/**
 * GET /api/reveal/selectable — verified listings that actually have a
 * business name on file, for the pack selection screen (/reveal/select).
 * Returns job descriptors ONLY — never names. The buyer pays before
 * seeing any name, so this endpoint must not leak them. Unknown-
 * contractor ("NA") rows and listings with no name row yet are left
 * out: nobody can spend a pack slot on a name that isn't there.
 */
export async function GET() {
  try {
    const sb = getServiceSupabase();
    const { data: nameRows, error: nameErr } = await sb
      .from("report_business_names")
      .select("report_id, business_name");
    if (nameErr) {
      return NextResponse.json({ ok: false, error: "Could not load listings." }, { status: 500 });
    }
    const ids = (nameRows ?? [])
      .filter((r) => !isUnknownBusinessName(r.business_name as string))
      .map((r) => r.report_id as string);
    if (ids.length === 0) {
      return NextResponse.json({ ok: true, reports: [] });
    }
    const { data: reports, error } = await sb
      .from("reports")
      .select("id, service_name, category, amount_cents, report_type, town, service_date, created_at")
      .in("id", ids)
      .eq("verification_status", "verified")
      .order("service_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ ok: false, error: "Could not load listings." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, reports: reports ?? [] });
  } catch (err) {
    console.error("reveal selectable error:", err);
    return NextResponse.json({ ok: false, error: "Could not load listings." }, { status: 500 });
  }
}
