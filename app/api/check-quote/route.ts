import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { siteConfig } from "@/lib/site-config";


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

interface AiEstimate {
  low_cents: number;
  median_cents: number;
  high_cents: number;
  basis: string;
}

// gemini-3.5-flash-lite ONLY (user direction, verified Oct 24, 2026 against
// Google's docs): released Jul 21, 2026, free-tier eligible, lifecycle good
// until Jul 21, 2027. Do NOT re-add gemini-2.5-flash (retired Oct 20, 2026
// on Vertex; Developer API access restricted to prior users — our key is
// new, so it does not work), gemini-3.5-flash (deprecated Oct 8, 2026 —
// calls now route to gemini-3.6-flash, so it was never a real fallback),
// or gemini-3.6-flash (retires Nov 19, 2026).
const AI_MODELS = ["gemini-3.5-flash-lite"];
// Total budget for the Gemini call(s) so a slow model can never hang the
// whole quote check.
const AI_TOTAL_TIMEOUT_MS = 15_000;
// Deliberately NO retry on 429/503: under free-tier throttling a retry just
// doubles call volume against an already-overloaded API and buys nothing.
// One attempt per model, then fall through to the next model.

/**
 * Strip surrounding markdown code fences (```json ... ``` or ``` ... ```)
 * and trim. Gemini is asked for JSON only, but sometimes wraps it anyway.
 */
function stripCodeFences(text: string): string {
  let t = text.trim();
  if (!t.startsWith("```")) return t;
  const firstNewline = t.indexOf("\n");
  if (firstNewline !== -1) {
    t = t.slice(firstNewline + 1);
  } else {
    t = t.replace(/^```[a-zA-Z]*\s*/, "");
  }
  const lastFence = t.lastIndexOf("```");
  if (lastFence !== -1) t = t.slice(0, lastFence);
  return t.trim();
}

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
  // One attempt per model — see the no-retry note above. Any failure falls
  // through to the next model; timeouts, parse failures, and invalid
  // estimates are never retried either.
  for (const model of AI_MODELS) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              { parts: [{ text: aiEstimatePrompt(description, category) }] },
            ],
            generationConfig: {
              response_mime_type: "application/json",
              maxOutputTokens: 500,
            },
          }),
          signal: AbortSignal.timeout(Math.max(1000, remaining)),
        }
      );
    } catch (err) {
      console.error(`check-quote: Gemini model ${model} fetch failed`, err);
      continue;
    }
    if (!res.ok) {
      console.error(`check-quote: Gemini model ${model} error`, res.status);
      continue;
    }
    let aiJson: Record<string, unknown>;
    try {
      aiJson = (await res.json()) as Record<string, unknown>;
    } catch (err) {
      console.error(`check-quote: Gemini model ${model} bad JSON`, err);
      continue;
    }
    const candidates = aiJson.candidates as
      | Array<{ content?: { parts?: Array<{ text?: string }> } }>
      | undefined;
    const raw = candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(stripCodeFences(raw));
    } catch {
      console.error(
        `check-quote: Gemini model ${model} unparsable JSON, raw: ${raw.slice(0, 300)}`
      );
      continue;
    }
    const estimate = sanitizeAiEstimate(parsed);
    if (estimate) return estimate;
    console.error(`check-quote: Gemini model ${model} invalid estimate`);
  }
  return null;
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

    // Broad-market AI estimate, shown first on the results page. It must
    // never fail the check: a missing key or bad response yields null and
    // the database comparison below still runs.
    const aiEstimate = await fetchAiEstimate(description, category);

    if (scored.length < 2) {
      return NextResponse.json({
        ok: true,
        count: scored.length,
        notEnoughData: true,
        ai_estimate: aiEstimate,
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
