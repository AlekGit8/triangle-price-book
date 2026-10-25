import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";

function authorized(req: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  return !!expected && req.headers.get("x-admin-key") === expected;
}

/**
 * GET /api/admin/seen — returns the last admin visit timestamp
 * (null if the admin has never visited).
 * POST /api/admin/seen — marks now as the last admin visit.
 * Both gated by ADMIN_KEY. Backs the "What's new since your last
 * visit" section on /admin. The marker lives in Supabase (not
 * localStorage) so it works across his devices.
 */
export async function GET(req: Request) {
  if (!authorized(req))
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from("admin_state")
      .select("last_seen_at")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ok: true, last_seen_at: data?.last_seen_at ?? null });
  } catch (err) {
    console.error("admin seen error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!authorized(req))
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const sb = getServiceSupabase();
    const now = new Date().toISOString();
    const { error } = await sb
      .from("admin_state")
      .upsert({ id: 1, last_seen_at: now, updated_at: now });
    if (error) throw error;
    return NextResponse.json({ ok: true, last_seen_at: now });
  } catch (err) {
    console.error("admin seen error:", err);
    return NextResponse.json({ ok: false, error: "Failed to save." }, { status: 500 });
  }
}
