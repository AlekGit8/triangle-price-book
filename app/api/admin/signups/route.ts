import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";

function authorized(req: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  return !!expected && req.headers.get("x-admin-key") === expected;
}

/**
 * GET /api/admin/signups — launch notification signup stats, gated by ADMIN_KEY.
 * Returns total count, updates-opt-in count, and recent signups.
 */
export async function GET(req: Request) {
  if (!authorized(req))
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from("launch_signups")
      .select("email, wants_updates, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    const total = data.length;
    const updatesOptIn = data.filter((r) => r.wants_updates).length;
    return NextResponse.json({ ok: true, total, updatesOptIn, signups: data });
  } catch (err) {
    console.error("admin signups error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load signups." }, { status: 500 });
  }
}
