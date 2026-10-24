import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { siteConfig } from "@/lib/site-config";

export const runtime = 'edge';

// Guard against giant JSON bodies; a description is a sentence, not a novel.
const MAX_BODY_BYTES = 16 * 1024;
const MAX_DESCRIPTION = 300;
// $20M in cents — sanity cap, matching /api/submit.
const MAX_PRICE_CENTS = 2_000_000_000;

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "for", "with", "of", "to", "in", "on", "at",
]);

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

/** Shared significant tokens between the user's description and a report name. */
function matchScore(query: Set<string>, name: Set<string>): number {
  let shared = 0;
  query.forEach((t) => { if (name.has(t)) shared++; });
  return shared;
}

/**
 * POST /api/check-quote — compare a homeowner's quote against SIMILAR verified reports.
 * Body: { category: string, description: string, price_cents: number }
 * Matches the description against verified report service names by shared tokens
 * (minimum 2), then returns the range/median of the matches.
 */
export async function POST(req: Request) {
  try {
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "Invalid input." }, { status: 413 });
    }
    const body = await req.json().catch(() => ({}));
    const category = String(body.category ?? "").trim();
    const description = String(body.description ?? "").trim();
    const priceCents = Math.round(Number(body.price_cents));

    if (!(siteConfig.categories as readonly string[]).includes(category)) {
      return NextResponse.json({ ok: false, error: "Invalid category." }, { status: 400 });
    }
    if (
      !Number.isFinite(priceCents) ||
      priceCents <= 0 ||
      priceCents > MAX_PRICE_CENTS
    ) {
      return NextResponse.json({ ok: false, error: "Invalid price." }, { status: 400 });
    }
    if (description.length > MAX_DESCRIPTION) {
      return NextResponse.json(
        { ok: false, error: "Please keep the description under 300 characters." },
        { status: 400 }
      );
    }
    const queryTokens = tokens(description);
    if (queryTokens.size === 0) {
      return NextResponse.json(
        { ok: false, error: "Please describe the job (e.g. “water heater install”)." },
        { status: 400 }
      );
    }

    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from("reports")
      .select("amount_cents, service_name, town, service_date")
      .eq("category", category)
      .eq("verification_status", "verified")
      .not("moderated_at", "is", null);
    if (error) throw error;

    const scored = (data ?? [])
      .map((r) => ({
        ...r,
        score: matchScore(queryTokens, tokens(r.service_name)),
      }))
      .filter((r) => r.score >= 2)
      .sort((a, b) => b.score - a.score || a.amount_cents - b.amount_cents);

    if (scored.length < 2) {
      return NextResponse.json({ ok: true, count: scored.length, notEnoughData: true });
    }

    const prices = scored.map((r) => r.amount_cents).sort((a, b) => a - b);
    const min = prices[0];
    const max = prices[prices.length - 1];
    const median =
      prices.length % 2 === 1
        ? prices[Math.floor(prices.length / 2)]
        : Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2);

    return NextResponse.json({
      ok: true,
      count: scored.length,
      min_cents: min,
      median_cents: median,
      max_cents: max,
      matched: Array.from(queryTokens).filter((t) =>
        scored.some((r) => tokens(r.service_name).has(t))
      ),
      samples: scored.slice(0, 12).map((r) => ({
        amount_cents: r.amount_cents,
        service_name: r.service_name,
        town: r.town,
        service_date: r.service_date,
      })),
    });
  } catch (err) {
    console.error("check-quote error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
