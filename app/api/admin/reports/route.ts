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
      .order("created_at", { ascending: false })
      .limit(100);
    if (scope === "published") {
      q = q.not("moderated_at", "is", null).neq("verification_status", "rejected");
    } else {
      q = q.is("moderated_at", null);
    }
    const { data, error } = await q;
    if (error) throw error;
    // Newest-first by effective report date (service_date when set, else
    // created_at) — the same order the public site shows. Sorting by
    // created_at alone can't order the seed rows: all 21 were inserted in
    // one migration transaction and share a created_at, so the Published
    // tab read as insertion order instead of most-recent first.
    const effectiveDate = (r: Record<string, unknown>): string =>
      (r.service_date as string | null) ?? (r.created_at as string).slice(0, 10);
    const byEffectiveDate = (a: Record<string, unknown>, b: Record<string, unknown>): number => {
      const byDate = effectiveDate(b).localeCompare(effectiveDate(a));
      if (byDate !== 0) return byDate;
      return (b.created_at as string).localeCompare(a.created_at as string);
    };
    // Flatten the private contact email onto the shape the admin UI expects.
    const reports = ((data ?? []) as Array<Record<string, unknown>>)
      .sort(byEffectiveDate)
      .map((r) => {
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
