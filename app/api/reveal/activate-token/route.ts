import { NextResponse } from "next/server";
import {
  REVEAL_COOKIE,
  getPurchaseByToken,
  parseRevealTokens,
  serializeRevealTokens,
} from "@/lib/reveal";

/**
 * POST /api/reveal/activate-token — restore a purchase from its
 * bookmark link ({ token }). Used by the /reveal/[token] page's
 * "use this pass in this browser" button. Sets the cookie server-side.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token : "";
    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });
    }
    const purchase = await getPurchaseByToken(token);
    if (!purchase) {
      return NextResponse.json({ ok: false, error: "This link is not valid." }, { status: 404 });
    }
    if (purchase.type === "day" && (!purchase.expires_at || purchase.expires_at <= new Date().toISOString())) {
      return NextResponse.json({ ok: false, error: "This day pass has expired." }, { status: 410 });
    }
    const tokens = parseRevealTokens(req);
    if (!tokens.includes(token)) tokens.push(token);
    const res = NextResponse.json({ ok: true, type: purchase.type, report_id: purchase.report_id });
    res.cookies.set(REVEAL_COOKIE, serializeRevealTokens(tokens), {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
      secure: true,
    });
    return res;
  } catch (err) {
    console.error("reveal activate-token error:", err);
    return NextResponse.json({ ok: false, error: "Could not restore this link." }, { status: 500 });
  }
}
