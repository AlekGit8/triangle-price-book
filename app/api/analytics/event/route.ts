import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { isBotUserAgent } from "@/lib/bot-detect";

const MAX_BODY_BYTES = 8 * 1024;
const MAX_PATH_LEN = 200;
const MAX_SESSION_LEN = 64;
const MAX_DURATION_SECONDS = 1800; // 30 min per page view

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * POST /api/analytics/event — first-party anonymous analytics ingest.
 * No auth (public site traffic reports itself); bounded by the
 * middleware rate limit (600/hr per IP) and a tiny body cap.
 *
 * Body: { type: "view" | "heartbeat", session_id, path,
 *         view_id?, active_seconds?, referrer_host?, webdriver? }
 * - "view": inserts one analytics_page_views row, returns { view_id }.
 * - "heartbeat": updates last_seen_at + duration_seconds for view_id.
 *
 * is_bot is decided server-side from the request user agent.
 * No IP address is stored; country comes from Cloudflare's
 * cf-ipcountry header when present.
 */
export async function POST(req: Request) {
  try {
    const len = req.headers.get("content-length");
    if (len && Number(len) > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "Request too large." }, { status: 413 });
    }
    const body: unknown = await req.json().catch(() => null);
    if (!isPlainObject(body)) {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }
    const type = body.type;
    if (type !== "view" && type !== "heartbeat") {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }
    const sessionId =
      typeof body.session_id === "string" ? body.session_id.slice(0, MAX_SESSION_LEN) : "";
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }
    const sb = getServiceSupabase();

    if (type === "view") {
      const rawPath = typeof body.path === "string" ? body.path.slice(0, MAX_PATH_LEN) : "/";
      const path = rawPath.startsWith("/") ? rawPath : "/";
      const referrerHost =
        typeof body.referrer_host === "string" ? body.referrer_host.slice(0, 128) : null;
      const ua = req.headers.get("user-agent");
      const webdriver = body.webdriver === true;
      const country = req.headers.get("cf-ipcountry") ?? null;
      const { data, error } = await sb
        .from("analytics_page_views")
        .insert({
          session_id: sessionId,
          path,
          referrer_host: referrerHost,
          user_agent: ua ? ua.slice(0, 512) : null,
          is_bot: isBotUserAgent(ua, webdriver),
          country,
        })
        .select("id")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, view_id: data.id });
    }

    // heartbeat
    const viewId = typeof body.view_id === "string" ? body.view_id : "";
    const activeSeconds =
      typeof body.active_seconds === "number" && Number.isFinite(body.active_seconds)
        ? Math.max(0, Math.min(MAX_DURATION_SECONDS, Math.floor(body.active_seconds)))
        : 0;
    if (!viewId) {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }
    const { error } = await sb
      .from("analytics_page_views")
      .update({ last_seen_at: new Date().toISOString(), duration_seconds: activeSeconds })
      .eq("id", viewId)
      .eq("session_id", sessionId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("analytics event error:", err);
    return NextResponse.json({ ok: false, error: "Failed to record." }, { status: 500 });
  }
}
