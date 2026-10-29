import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/signups — launch notification signup stats, gated by ADMIN_KEY.
 * Returns total count, updates-opt-in count, and recent signups.
 */
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from("launch_signups")
      .select("email, wants_updates, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    const rows = data ?? [];
    const total = rows.length;
    const updatesOptIn = rows.filter((r) => r.wants_updates).length;
    return NextResponse.json({ ok: true, total, updatesOptIn, signups: rows });
  } catch (err) {
    console.error("admin signups error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load signups." }, { status: 500 });
  }
}
