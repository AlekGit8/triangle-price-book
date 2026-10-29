import { NextResponse } from "next/server";
import {
  DAY_CENTS,
  REVEAL_COOKIE,
  SINGLE_CENTS,
  getBusinessName,
  getCheckoutSession,
  parseRevealTokens,
  recordPurchase,
  serializeRevealTokens,
  type RevealType,
} from "@/lib/reveal";

/**
 * POST /api/reveal/activate — the success page calls this with the
 * Stripe session id from the redirect URL. Verifies the session is
 * actually paid (no trusting the URL alone), records the purchase
 * idempotently, and sets the tpb_reveals cookie so the name shows on
 * the listing. Returns the name for single reveals; day passes unlock
 * via the cookie + status endpoint instead.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { session_id?: unknown };
    const sessionId = typeof body.session_id === "string" ? body.session_id : "";
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Missing session id." }, { status: 400 });
    }
    const session = await getCheckoutSession(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ ok: false, error: "Payment not complete yet." }, { status: 402 });
    }
    const type = session.metadata.reveal_type as RevealType;
    if (type !== "single" && type !== "day") {
      return NextResponse.json({ ok: false, error: "Unknown purchase." }, { status: 400 });
    }
    const purchase = await recordPurchase({
      type,
      reportId: session.metadata.report_id ?? null,
      sessionId: session.id,
      amountCents: session.amount_total > 0 ? session.amount_total : type === "single" ? SINGLE_CENTS : DAY_CENTS,
    });
    const tokens = parseRevealTokens(req);
    if (!tokens.includes(purchase.token)) tokens.push(purchase.token);
    const res = NextResponse.json({
      ok: true,
      type: purchase.type,
      report_id: purchase.report_id,
      token: purchase.token,
      bookmark_url: `/reveal/${purchase.token}`,
      expires_at: purchase.expires_at,
      business_name:
        purchase.type === "single" && purchase.report_id
          ? await getBusinessName(purchase.report_id)
          : null,
    });
    res.cookies.set(REVEAL_COOKIE, serializeRevealTokens(tokens), {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
      secure: true,
    });
    return res;
  } catch (err) {
    console.error("reveal activate error:", err);
    return NextResponse.json(
      { ok: false, error: "Could not confirm your payment. Please try again." },
      { status: 500 }
    );
  }
}
