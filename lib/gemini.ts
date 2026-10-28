/**
 * Shared Gemini helper (P7/Q2): one place for the model name and the
 * generateContent call, so the two call sites (/api/extract and
 * /api/check-quote) can't drift apart — and so a model change is one
 * env var, not a find-and-replace across the repo.
 *
 * Model: GEMINI_MODEL env var, defaulting to gemini-3.5-flash-lite
 * (released Jul 21, 2026; free-tier eligible; good until Jul 21, 2027 —
 * review before then). Do NOT add a paid-tier model or a deprecated one
 * as a fallback without asking — the site is ~$0 while pre-revenue, and
 * gemini-3.6-flash retires Nov 19, 2026 while gemini-3.5-flash is
 * deprecated (routes to 3.6-flash).
 *
 * callGemini NEVER throws: any missing key, timeout, failed model, or
 * unparsable response returns { text: null, finishReason: null } and
 * the caller falls back (check-quote) or fails gracefully (extract).
 */

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export function geminiModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export interface GeminiResult {
  /** The model's text output, or null when the call failed. */
  text: string | null;
  /** The first candidate's finishReason ("STOP", "MAX_TOKENS", …), or null. */
  finishReason: string | null;
}

export async function callGemini(opts: {
  apiKey: string;
  /** Defaults to geminiModelName(). */
  model?: string;
  parts: Array<Record<string, unknown>>;
  maxOutputTokens?: number;
  timeoutMs?: number;
  responseSchema?: Record<string, unknown>;
}): Promise<GeminiResult> {
  const model = opts.model ?? geminiModelName();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": opts.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: opts.parts }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            maxOutputTokens: opts.maxOutputTokens ?? 4000,
            ...(opts.responseSchema
              ? { responseSchema: opts.responseSchema }
              : {}),
          },
        }),
        // A hung Gemini call must not hang the Worker.
        signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      }
    );
    if (!res.ok) {
      console.error(`gemini: model ${model} error`, res.status);
      return { text: null, finishReason: null };
    }
    const json = (await res.json()) as Record<string, unknown>;
    const candidates = json.candidates as
      | Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>
      | undefined;
    const first = candidates?.[0];
    const text =
      first?.content?.parts?.map((p) => p.text ?? "").join("") || null;
    return { text, finishReason: first?.finishReason ?? null };
  } catch (err) {
    console.error(`gemini: model ${model} fetch failed`, err);
    return { text: null, finishReason: null };
  }
}
