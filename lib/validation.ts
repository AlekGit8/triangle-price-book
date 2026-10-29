/**
 * Shared validation helpers (Q1): one email pattern for the server
 * routes, so a fix lands everywhere at once.
 */

/** Good-enough email shape check (not a full RFC validator). */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when the value looks like an email address (max 254 chars). */
export function isValidEmail(raw: string): boolean {
  return raw.length > 0 && raw.length <= 254 && EMAIL_RE.test(raw);
}

/**
 * Parse a dollar amount into integer cents — never via Number()/parseFloat
 * (which accept "1e5" and have float rounding: 1.005 * 100 is 100.4999…).
 * Only digits, optionally with up to two decimal places.
 */
export function parseAmountCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [dollars, cents = ""] = trimmed.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
}
