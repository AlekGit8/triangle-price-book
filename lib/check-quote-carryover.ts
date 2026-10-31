/**
 * Check-my-quote → /submit handoff (Oct 30, 2026).
 *
 * When someone checks a quote and then shares it, the checked values ride
 * along in sessionStorage (same tab only) so /submit opens prefilled —
 * no retyping, no re-upload. /submit consumes the entry once (removes
 * the key) and validates everything again server-side before publishing.
 *
 * The uploaded document itself NEVER touches our servers at check time:
 * it rides in the browser's IndexedDB (see lib/carried-doc.ts) to
 * /submit, where it becomes the draft's invoice file through the normal
 * batch submit path. So if the user decides not to submit, there is
 * nothing of it on our side to delete — it only ever reaches our
 * servers if they actually publish. The browser copy is removed once
 * /submit picks it up, and entries older than 24h are treated as stale.
 *
 * - Upload path: docKey points at the browser-stored file + receiptId
 *   from /api/extract, so the entry can verify. Editing the amount past
 *   the receipt tolerance still publishes as unverified (the server
 *   enforces that).
 * - Manual path: no docKey, so the entry publishes as unverified —
 *   same as filling in /submit by hand.
 *
 * Town is collected on the check screen (it is required on submit but
 * the check itself doesn't need it) so it carries over either way.
 */
export const CHECK_QUOTE_CARRYOVER_KEY = "tpb-check-quote-carryover";

export interface CheckQuoteCarryover {
  category: string;
  serviceName: string;
  amount: string;
  reportType: "paid" | "quote";
  town: string;
  serviceDate: string;
  notes: string;
  receiptId: string | null;
  /** Company/contractor name read from the document (quotes[0]), if any
   *  — rides along so the /submit draft can store it for the admin
   *  queue's editable field. Null when extraction named none. */
  businessName: string | null;
  /** IndexedDB key for the uploaded file (lib/carried-doc.ts), if any. */
  docKey: string | null;
  fileName: string | null;
}
