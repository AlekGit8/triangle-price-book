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
        `id, service_name, category, amount_cents, report_type, town,
         service_date, notes, verification_status, created_at,
         verifications ( id, invoice_path, created_at ),
         report_contacts ( email )`
      )
      // Newest submission first (created_at desc): a quote submitted today
      // tops the list even if the job itself is years old. Service date
      // only breaks ties — the 21 seed rows share one created_at (single
      // migration insert), so without it they read as insertion order.
      .order("created_at", { ascending: false })
      .order("service_date", { ascending: false, nullsFirst: false })
      .limit(100);
    if (scope === "published") {
      q = q.not("moderated_at", "is", null).neq("verification_status", "rejected");
    } else {
      q = q.is("moderated_at", null);
    }
    const { data, error } = await q;
    if (error) throw error;
    // Flatten the private contact email onto the shape the admin UI expects.
    const reports = ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
      const { report_contacts: _contacts, ...rest } = r;
      const contacts = _contacts as { email?: string } | null;
      return { ...rest, submitter_email: contacts?.email ?? null };
    });
    return NextResponse.json({ ok: true, reports });
  } catch (err) {
    console.error("admin reports error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load queue." }, { status: 500 });
  }
}
