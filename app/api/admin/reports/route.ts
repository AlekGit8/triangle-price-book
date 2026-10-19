import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";

function authorized(req: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  return !!expected && req.headers.get("x-admin-key") === expected;
}

/**
 * GET /api/admin/reports — moderation queue: unmoderated reports,
 * newest first, with any linked invoice paths. Gated by ADMIN_KEY.
 */
export async function GET(req: Request) {
  if (!authorized(req))
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from("reports")
      .select(
        `id, service_name, category, amount_cents, amount_note, report_type, town,
         service_date, notes, verification_status, submitter_email, created_at,
         verifications ( id, invoice_path, created_at )`
      )
      .is("moderated_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ ok: true, reports: data });
  } catch (err) {
    console.error("admin reports error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load queue." }, { status: 500 });
  }
}
