import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";

/**
 * POST /api/check-quote — compare a homeowner's quote against verified reports.
 * Body: { category: string, price_cents: number }
 * Returns distribution stats + the user's percentile rank within the category.
 * Verified-only, mirroring the service_aggregates view logic.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const category = String(body.category ?? "").trim();
    const priceCents = Math.round(Number(body.price_cents));

    if (!category || !Number.isFinite(priceCents) || priceCents <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid input." }, { status: 400 });
    }

    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from("reports")
      .select("amount_cents, service_name, town, service_date")
      .eq("category", category)
      .eq("verification_status", "verified")
      .not("moderated_at", "is", null)
      .order("amount_cents", { ascending: true });
    if (error) throw error;

    const rows = data ?? [];
    const prices = rows.map((r) => r.amount_cents).sort((a, b) => a - b);
    const count = prices.length;

    if (count < 2) {
      return NextResponse.json({ ok: true, count, notEnoughData: true });
    }

    const min = prices[0];
    const max = prices[prices.length - 1];
    const median =
      prices.length % 2 === 1
        ? prices[Math.floor(prices.length / 2)]
        : Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2);

    return NextResponse.json({
      ok: true,
      count,
      min_cents: min,
      median_cents: median,
      max_cents: max,
    });
  } catch (err) {
    console.error("check-quote error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
