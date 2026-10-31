import { NextResponse } from "next/server";
import {
  PACK3_CENTS,
  PACK5_CENTS,
  SINGLE_CENTS,
  getCheckoutSession,
  isPackType,
  recordPurchase,
  type RevealType,
} from "@/lib/reveal";

/**
 * POST /api/reveal/activate — the success page calls this with the
 * Stripe session id from the redirect URL. Verifies the session is
 * actually paid (no trusting the URL alone), records the purchase
 * idempotently, and returns the buyer's private list-page URL. No
 * cookies, no email: the list link is the access.
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
    if (type !== "single" && !isPackType(type)) {
      return NextResponse.json({ ok: false, error: "Unknown purchase." }, { status: 400 });
    }
    // Pack selections come back on the session our checkout route
    // created (it validated them first). No count check here: a paid
    // buyer must never strand on a validation failure — the token
    // page renders defensively, skipping any entry whose name has
    // since vanished.
    const selected =
      typeof session.metadata.selected_report_ids === "string"
        ? session.metadata.selected_report_ids.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
    const fallbackCents =
      type === "single"
        ? SINGLE_CENTS
        : type === "pack3"
          ? PACK3_CENTS
          : PACK5_CENTS;
    const purchase = await recordPurchase({
      type,
      reportId: isPackType(type) ? null : (session.metadata.report_id ?? null),
      sessionId: session.id,
      amountCents: session.amount_total > 0 ? session.amount_total : fallbackCents,
      selectedReportIds: isPackType(type) ? selected : undefined,
    });
    return NextResponse.json({
      ok: true,
      type: purchase.type,
      report_id: purchase.report_id,
      token: purchase.token,
      list_url: `/reveal/${purchase.token}`,
    });
  } catch (err) {
    console.error("reveal activate error:", err);
    return NextResponse.json(
      { ok: false, error: "Could not confirm your payment. Please try again." },
      { status: 500 }
    );
  }
}
