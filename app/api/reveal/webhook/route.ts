import { NextResponse } from "next/server";
import {
  isPackType,
  recordPurchase,
  verifyStripeWebhook,
  type RevealType,
} from "@/lib/reveal";

/**
 * POST /api/reveal/webhook — Stripe fulfillment. The success-page
 * activation route also records the purchase (same idempotent upsert),
 * so this is the backup for buyers who never reach the success page.
 * Deliberately NOT rate-limited in middleware: Stripe retries from a
 * small set of IPs, and a limit here could drop real fulfillments.
 */
export async function POST(req: Request) {
  const payload = await req.text();
  const ok = await verifyStripeWebhook(payload, req.headers.get("stripe-signature"));
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Bad signature." }, { status: 400 });
  }
  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad payload." }, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const obj = event.data?.object ?? {};
    const metadata = (obj.metadata ?? {}) as Record<string, string>;
    const type = metadata.reveal_type as RevealType;
    const amount = typeof obj.amount_total === "number" ? obj.amount_total : 0;
    const selected =
      typeof metadata.selected_report_ids === "string"
        ? metadata.selected_report_ids.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
    if ((type === "single" || type === "all" || isPackType(type)) && amount > 0) {
      try {
        await recordPurchase({
          type,
          reportId: isPackType(type) ? null : (metadata.report_id ?? null),
          sessionId: String(obj.id ?? ""),
          amountCents: amount,
          selectedReportIds: isPackType(type) ? selected : undefined,
        });
      } catch (err) {
        console.error("reveal webhook fulfill error:", err);
        return NextResponse.json({ ok: false, error: "Fulfill failed." }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ received: true });
}
