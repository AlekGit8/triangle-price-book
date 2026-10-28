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
