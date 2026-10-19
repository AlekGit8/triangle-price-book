import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";

function authorized(req: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  return !!expected && req.headers.get("x-admin-key") === expected;
}

/**
 * GET /api/admin/reports — moderation views, gated by ADMIN_KEY.
 * ?scope=queue (default): unmoderated reports, newest first.
 * ?scope=published: recently published reports, newest first (for takedowns).
 */
export async function GET(req: Request) {
  if (!authorized(req))
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const scope = new URL(req.url).searchParams.get("scope") ?? "queue";
    const sb = getServiceSupabase();
    let q = sb
      .from("reports")
      .select(
        `id, service_name, category, amount_cents, amount_note, report_type, town,
         service_date, notes, verification_status, submitter_email, created_at,
         verifications ( id, invoice_path, created_at )`
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (scope === "published") {
      q = q.not("moderated_at", "is", null).neq("verification_status", "rejected");
    } else {
      q = q.is("moderated_at", null);
    }
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ ok: true, reports: data });
  } catch (err) {
    console.error("admin reports error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load queue." }, { status: 500 });
  }
}
