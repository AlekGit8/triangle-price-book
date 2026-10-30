/**
 * Check-my-quote → /submit handoff (Oct 30, 2026).
 *
 * When someone checks a quote and then shares it, the checked values ride
 * along in sessionStorage (same tab only) so /submit opens prefilled —
 * no retyping, no re-upload. /submit consumes the entry once (removes
 * the key) and validates everything again server-side before publishing.
 *
 * - Upload path: receiptId + invoiceHash/invoiceExt point at the document
 *   /api/extract already stored privately, so the entry can verify
 *   without the user re-uploading. Editing the amount past the receipt
 *   tolerance still publishes as unverified (the server enforces that).
 * - Manual path: no document fields, so the entry publishes as
 *   unverified — same as filling in /submit by hand.
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
  invoiceHash: string | null;
  invoiceExt: string | null;
  fileName: string | null;
}
