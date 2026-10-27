import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";

function authorized(req: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  return !!expected && req.headers.get("x-admin-key") === expected;
}

/**
 * GET /api/admin/feedback — visitor feature requests / feedback, newest
 * first, gated by ADMIN_KEY. Submitted via POST /api/feedback.
 */
export async function GET(req: Request) {
  if (!authorized(req))
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from("feedback")
      .select("id, message, email, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return NextResponse.json({ ok: true, total: data.length, feedback: data });
  } catch (err) {
    console.error("admin feedback error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load feedback." }, { status: 500 });
  }
}
