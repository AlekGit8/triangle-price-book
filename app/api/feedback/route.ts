import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";

// 300 characters, matching the form. A short note, not an essay.
const MAX_MESSAGE = 300;

/**
 * POST /api/feedback — anonymous visitor feature request / feedback.
 * Body: { message: string }
 * Stored in the `feedback` table (service-role only; RLS has no public
 * policies). Read back via GET /api/admin/feedback with ADMIN_KEY.
 * Rate-limited in middleware (10/hr per IP, same as /api/notify).
 */
export async function POST(req: Request) {
  try {
    // A 300-char note fits in a tiny body — reject anything bigger early.
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 8 * 1024) {
      return NextResponse.json(
        { ok: false, error: "Please keep your message under 300 characters." },
        { status: 413 }
      );
    }
    const body = await req.json().catch(() => ({}));
    const message = String(body.message ?? "").trim();

    if (!message) {
      return NextResponse.json(
        { ok: false, error: "Please write a message first." },
        { status: 400 }
      );
    }
    if (message.length > MAX_MESSAGE) {
      return NextResponse.json(
        { ok: false, error: "Please keep your message under 300 characters." },
        { status: 400 }
      );
    }

    const sb = getServiceSupabase();
    const { error } = await sb.from("feedback").insert({ message });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("feedback error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
