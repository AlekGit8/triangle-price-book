import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { siteConfig } from "@/lib/site-config";
import { searchTokens, matchScore } from "@/lib/search";
import { callGemini, geminiModelName, parseGeminiJson } from "@/lib/gemini";


// Guard against giant JSON bodies; a description is a sentence, not a novel.
const MAX_BODY_BYTES = 16 * 1024;
const MAX_DESCRIPTION = 300;
// $2M in cents — sanity cap, matching /api/submit.
const MAX_PRICE_CENTS = 200_000_000;

interface AiEstimate {
  low_cents: number;
  median_cents: number;
  high_cents: number;
  basis: string;
}

// The model comes from lib/gemini.ts (GEMINI_MODEL env, default
// gemini-3.5-flash-lite ONLY — user direction, verified Oct 24, 2026
// against Google's docs: released Jul 21, 2026, free-tier eligible,
// lifecycle good until Jul 21, 2027. Do NOT re-add gemini-2.5-flash
// (retired Oct 20, 2026 on Vertex; Developer API access restricted to
// prior users — our key is new, so it does not work), gemini-3.5-flash
// (deprecated Oct 8, 2026 — calls now route to gemini-3.6-flash, so it
// was never a real fallback), or gemini-3.6-flash (retires Nov 19, 2026).
// Total budget for the Gemini call(s) so a slow model can never hang the
// whole quote check.
const AI_TOTAL_TIMEOUT_MS = 15_000;
// Deliberately NO retry on 429/503: under free-tier throttling a retry just
// doubles call volume against an already-overloaded API and buys nothing.
// One attempt per model, then fall through to the next model.

function aiEstimatePrompt(description: string, category: string): string {
  return `What is a reasonable price range for a homeowner hiring this job in the Raleigh-Durham-Chapel Hill Triangle region of North Carolina? Job: "${description}" (category: ${category}). Reply with ONLY a JSON object with exactly these keys: "low", "median", and "high" (numbers, in US dollars) and "basis" (one short sentence saying what the range is based on). Base it on typical US market pricing for this service. Never invent a specific local business price; give a broad market range. If the job description is too vague to estimate, set "low", "median", and "high" to null.`;
}

/** Sanitize a parsed Gemini JSON object into an estimate, or null if unusable. */
function sanitizeAiEstimate(fields: Record<string, unknown>): AiEstimate | null {
  const low = fields.low;
  const median = fields.median;
  const high = fields.high;
  // The model returns all nulls when the job is too vague to estimate.
  if (low === null && median === null && high === null) return null;
  if (
    typeof low !== "number" ||
    typeof median !== "number" ||
    typeof high !== "number" ||
    !Number.isFinite(low) ||
    !Number.isFinite(median) ||
    !Number.isFinite(high) ||
    low <= 0 ||
    median <= 0 ||
    high <= 0 ||
    low > median ||
    median > high ||
    high > 20_000_000
  ) {
    return null;
  }
  const basis =
    typeof fields.basis === "string" ? fields.basis.slice(0, 200) : "";
  return {
    low_cents: Math.round(low * 100),
    median_cents: Math.round(median * 100),
    high_cents: Math.round(high * 100),
    basis,
  };
}

/**
 * Ask Gemini for a broad-market price estimate for the job. NEVER throws and
 * NEVER fails the quote check: any missing key, timeout, failed model, or
 * unusable response returns null and the caller falls back to the database
 * comparison alone.
 */
async function fetchAiEstimate(
  description: string,
  category: string
): Promise<AiEstimate | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const deadline = Date.now() + AI_TOTAL_TIMEOUT_MS;
  const remaining = deadline - Date.now();
  if (remaining <= 0) return null;
  const model = geminiModelName();
  const { text: raw } = await callGemini({
    apiKey,
    model,
    parts: [{ text: aiEstimatePrompt(description, category) }],
    maxOutputTokens: 500,
    timeoutMs: Math.max(1000, remaining),
  });
  if (!raw) return null;
  const parsed = parseGeminiJson(raw);
  if (!parsed) {
    console.error(
      `check-quote: Gemini model ${model} unparsable JSON, raw: ${raw.slice(0, 300)}`
    );
    return null;
  }
  const estimate = sanitizeAiEstimate(parsed);
  if (!estimate) {
    console.error(`check-quote: Gemini model ${model} invalid estimate`);
  }
  return estimate;
}

/**
 * Cache Gemini's estimate per (category, normalized description) for 24h
 * (migration 0018), so repeat checks of the same job don't burn another
 * Gemini call. The key is the sorted significant tokens, so "water heater
 * install" and "Install water heater" hit the same row. A cache miss
 * calls Gemini once and stores the result; a too-vague job (null
 * estimate) is never cached.
 */
const ESTIMATE_TTL_MS = 24 * 3600 * 1000;

function estimateKey(category: string, description: string): string {
  return [...searchTokens(description)].sort().join(" ");
}

async function fetchAiEstimateCached(
  sb: ReturnType<typeof getServiceSupabase>,
  description: string,
  category: string
): Promise<AiEstimate | null> {
  const key = estimateKey(category, description);
  try {
    const { data } = await sb
      .from("check_quote_estimates")
      .select("low_cents, median_cents, high_cents, basis, created_at")
      .eq("category", category)
      .eq("description_key", key)
      .single();
    if (
      data &&
      Date.now() - new Date(data.created_at).getTime() < ESTIMATE_TTL_MS
    ) {
      return {
        low_cents: data.low_cents,
        median_cents: data.median_cents,
        high_cents: data.high_cents,
        basis: data.basis,
      };
    }
  } catch {
    // Cache is a bonus, not a dependency — fall through to Gemini.
  }
  const fresh = await fetchAiEstimate(description, category);
  if (fresh) {
    try {
      await sb.from("check_quote_estimates").upsert(
        {
          category,
          description_key: key,
          low_cents: fresh.low_cents,
          median_cents: fresh.median_cents,
          high_cents: fresh.high_cents,
          basis: fresh.basis,
        },
        { onConflict: "category,description_key" }
      );
      // Prune stale rows while we're here (cheap, indexed).
      await sb
        .from("check_quote_estimates")
        .delete()
        .lt("created_at", new Date(Date.now() - ESTIMATE_TTL_MS).toISOString());
    } catch {
      // Cache write failure must never fail the check.
    }
  }
  return fresh;
}

/**
 * Shape one report row as a full entry for the results page, which renders
 * matched entries as ReportCards below the comparison. Rows here are always
 * verified (the query filters on it), and the category is the requested one.
 */
function toEntry(
  r: {
    id: string;
    amount_cents: number;
    service_name: string;
    town: string;
    service_date: string | null;
    report_type: string;
    created_at: string;
  },
  category: string
) {
  return {
    id: r.id,
    service_name: r.service_name,
    category,
    amount_cents: r.amount_cents,
    report_type: r.report_type,
    town: r.town,
    service_date: r.service_date,
    notes: null,
    verification_status: "verified",
    created_at: r.created_at,
  };
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
    const queryTokens = searchTokens(description);
    if (queryTokens.size === 0) {
      return NextResponse.json(
        { ok: false, error: "Please describe the job (e.g. “water heater install”)." },
        { status: 400 }
      );
    }

    const sb = getServiceSupabase();
    // DB query and AI estimate run in parallel (they were sequential):
    // the AI call is the slow one, so the DB rows are ready when it lands.
    const dbPromise = sb
      .from("reports")
      .select("id, amount_cents, service_name, town, service_date, report_type, created_at, verification_status, business_name_available")
      .eq("category", category)
      .eq("verification_status", "verified")
      .not("moderated_at", "is", null)
      // Bound the fetch: the token-match needs the category's verified
      // rows, but an unbounded pull grows with the table (DoS / egress).
      // 500 is far above any realistic per-category match set. Newest
      // first, so beyond 500 rows the matched subset is the recent one,
      // not an arbitrary slice.
      .order("created_at", { ascending: false })
      .limit(500);
    const aiPromise = fetchAiEstimateCached(sb, description, category);
    const [{ data, error }, aiEstimate] = await Promise.all([dbPromise, aiPromise]);
    if (error) throw error;

    // One-word descriptions ("roof") can match on their single token;
    // longer descriptions still need two shared tokens to be a real match.
    const minScore = queryTokens.size === 1 ? 1 : 2;
    const scored = (data ?? [])
      .map((r) => ({
        ...r,
        score: matchScore(queryTokens, searchTokens(r.service_name)),
      }))
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score || a.amount_cents - b.amount_cents);

    if (scored.length < 2) {
      return NextResponse.json({
        ok: true,
        count: scored.length,
        notEnoughData: true,
        ai_estimate: aiEstimate,
        // The matched entries (0 or 1 here), plus the other verified entries
        // in the category so the results page can still show relevant data.
        entries: scored.map((r) => toEntry(r, category)),
        category_entries: (data ?? [])
          .map((r) => toEntry(r, category))
          .slice(0, 20),
      });
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
      ai_estimate: aiEstimate,
      matched: Array.from(queryTokens).filter((t) =>
        scored.some((r) => searchTokens(r.service_name).has(t))
      ),
      // Every matched entry, uncapped — the results page lists them all
      // below the comparison.
      entries: scored.map((r) => toEntry(r, category)),
    });
  } catch (err) {
    console.error("check-quote error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
