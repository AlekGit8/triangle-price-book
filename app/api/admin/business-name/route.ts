import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin-auth";

/** GET /api/admin/business-name?report_id=… — current stored name (admin only). */
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const reportId = new URL(req.url).searchParams.get("report_id") ?? "";
  if (!reportId) {
    return NextResponse.json({ ok: false, error: "Missing report id." }, { status: 400 });
  }
  const sb = getServiceSupabase();
  const { data } = await sb
    .from("report_business_names")
    .select("business_name")
    .eq("report_id", reportId)
    .maybeSingle();
  return NextResponse.json({ ok: true, business_name: (data?.business_name as string | undefined) ?? null });
}

/**
 * POST /api/admin/business-name — set or clear the contractor name for
 * a verified report (gated by ADMIN_KEY). The name is stored in
 * report_business_names (service-role only, never publicly readable);
 * the reveal button renders exactly when a name row exists — there is
 * no flag column to keep in sync. An empty name clears the row (the
 * business dispute path — used when a listing is found inaccurate).
 * Storing "NA" marks the contractor as unknown (the documentation did
 * not list one): the button then shows an informational message
 * instead of a payment, and checkout refuses a single reveal for it.
 * See isUnknownBusinessName in lib/reveal.ts.
 */
export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const body = (await req.json()) as { report_id?: unknown; business_name?: unknown };
    const reportId = typeof body.report_id === "string" ? body.report_id : "";
    const name = typeof body.business_name === "string" ? body.business_name.trim() : "";
    if (!reportId) {
      return NextResponse.json({ ok: false, error: "Missing report id." }, { status: 400 });
    }
    if (name.length > 200) {
      return NextResponse.json({ ok: false, error: "Business name is too long." }, { status: 400 });
    }
    const sb = getServiceSupabase();
    const { data: report, error: reportErr } = await sb
      .from("reports")
      .select("id, verification_status")
      .eq("id", reportId)
      .maybeSingle();
    if (reportErr || !report) {
      return NextResponse.json({ ok: false, error: "Report not found." }, { status: 404 });
    }
    if (report.verification_status !== "verified") {
      return NextResponse.json(
        { ok: false, error: "Business names are only stored for verified reports." },
        { status: 400 }
      );
    }
    if (name === "") {
      await sb.from("report_business_names").delete().eq("report_id", reportId);
      return NextResponse.json({ ok: true, business_name: null });
    }
    const { error: upsertErr } = await sb
      .from("report_business_names")
      .upsert({ report_id: reportId, business_name: name, updated_at: new Date().toISOString() });
    if (upsertErr) throw upsertErr;
    return NextResponse.json({ ok: true, business_name: name });
  } catch (err) {
    console.error("admin business-name error:", err);
    return NextResponse.json({ ok: false, error: "Could not save the business name." }, { status: 500 });
  }
}
