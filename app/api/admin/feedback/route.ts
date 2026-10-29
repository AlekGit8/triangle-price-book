import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/feedback — visitor feature requests / feedback, newest
 * first, gated by ADMIN_KEY. Submitted via POST /api/feedback.
 */
export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from("feedback")
      .select("id, message, email, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    const rows = data ?? [];
    return NextResponse.json({ ok: true, total: rows.length, feedback: rows });
  } catch (err) {
    console.error("admin feedback error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load feedback." }, { status: 500 });
  }
}
