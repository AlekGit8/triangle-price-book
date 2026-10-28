/**
 * Shared text matching (Q1/M6): one normalize/singularize pair used by
 * the homepage search, Browse, and the check-quote matcher, so "heaters"
 * matches "heater" everywhere instead of only in search.
 */

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function singularize(w: string): string {
  return w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;
}

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "for", "with", "of", "to", "in", "on", "at",
]);

/**
 * Significant tokens of a job description: normalized, singularized,
 * stopwords and short words dropped. Used by /api/check-quote matching.
 */
export function searchTokens(s: string): Set<string> {
  return new Set(
    normalizeText(s)
      .split(" ")
      .filter(Boolean)
      .map(singularize)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

/** Shared significant tokens between a query and a report name. */
export function matchScore(query: Set<string>, name: Set<string>): number {
  let shared = 0;
  query.forEach((t) => {
    if (name.has(t)) shared++;
  });
  return shared;
}
