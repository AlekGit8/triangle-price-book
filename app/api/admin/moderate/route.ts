import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";


function authorized(req: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  return !!expected && req.headers.get("x-admin-key") === expected;
}

type Action = "verify" | "publish_unverified" | "reject";

/**
 * POST /api/admin/moderate { id, action }
 * - verify: mark verified + publish (visible publicly, "Verified" badge)
 * - publish_unverified: publish without verification ("Unverified report" badge)
 * - reject: remove from queue, never published
 * Gated by ADMIN_KEY.
 */
export async function POST(req: Request) {
  if (!authorized(req))
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    // A moderation action is two small fields — reject giant bodies early,
    // like the other routes do.
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 8 * 1024) {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 413 });
    }
    const { id, action } = (await req.json()) as { id?: string; action?: Action };
    if (!id || !["verify", "publish_unverified", "reject"].includes(action ?? ""))
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });

    const sb = getServiceSupabase();
    const patch =
      action === "verify"
        ? { verification_status: "verified", moderated_at: new Date().toISOString() }
        : action === "publish_unverified"
          ? { verification_status: "unverified", moderated_at: new Date().toISOString() }
          : { verification_status: "rejected", moderated_at: new Date().toISOString() };

    const { error } = await sb.from("reports").update(patch).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin moderate error:", err);
    return NextResponse.json({ ok: false, error: "Moderation failed." }, { status: 500 });
  }
}
