import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";

export const runtime = 'edge';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/notify — coming-soon email signup (two-step consent).
 * Body: { email: string, wants_updates?: boolean }
 * - Step 1: { email } → creates the signup (launch notification consent).
 * - Step 2: { email, wants_updates: true } → opts into ongoing updates.
 * Idempotent and never downgrades an existing updates opt-in.
 */
export async function POST(req: Request) {
  try {
    // A signup is an email address, not a novel — reject giant bodies early.
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 8 * 1024) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address." },
        { status: 413 }
      );
    }
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const wantsUpdates = body.wants_updates === true;

    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const sb = getServiceSupabase();

    const { data: existing, error: fetchError } = await sb
      .from("launch_signups")
      .select("wants_updates")
      .eq("email", email)
      .maybeSingle();
    if (fetchError) throw fetchError;

    const finalWantsUpdates = wantsUpdates || existing?.wants_updates === true;

    const { error: upsertError } = await sb.from("launch_signups").upsert(
      { email, wants_updates: finalWantsUpdates },
      { onConflict: "email" }
    );
    if (upsertError) throw upsertError;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("notify signup error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
