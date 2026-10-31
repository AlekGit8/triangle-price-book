import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { verifyTurnstile } from "@/lib/turnstile";
import { clientIp } from "@/lib/rate-limit";
import { siteConfig } from "@/lib/site-config";
import { getServiceSupabase } from "@/lib/supabase-server";
import { callGemini } from "@/lib/gemini";


const MAX_DOC_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const EXTRACTION_PROMPT = `You are extracting structured data from a home-services document (photo or PDF). The document may contain ONE quote/invoice OR MULTIPLE distinct quotes, estimates, invoices, or receipts (for example a comparison sheet, or several receipts photographed together).

Return ONLY a JSON object with these exact keys:

{
  "documentCheck": {
    "isRelevant": true ONLY if this document is a quote, estimate, invoice, or receipt for a HOME SERVICE (HVAC, plumbing, electrical, roofing, septic, pest control, landscaping, handyman, remodeling, etc.) that contains at least one service description and price. False for anything else — restaurant or retail receipts, random photos, screenshots of text conversations, blank or unreadable pages, etc.,
    "reason": "if isRelevant is false, one short sentence saying what the document actually appears to be; otherwise null"
  },
  "quotes": [
    {
      "serviceName": "short description of the work, e.g. 'Tankless water heater install (Rinnai RX199)'",
      "category": one of ${JSON.stringify(siteConfig.categories)},
      "amount": grand total as a number with no commas or currency symbols, e.g. 5253.36,
      "town": town where the work was performed (the customer's town, not the business's), or null if unclear,
      "serviceDate": date of service or quote as YYYY-MM-DD, or null if unclear,
      "reportType": "paid" if this is an invoice/receipt for completed paid work, "quote" if it is an estimate/quote,
      "notes": one-line summary of the scope of work, or null,
      "businessName": the company/contractor name as it appears on the document, e.g. 'Acme Plumbing', or null if the document does not clearly name one — never guess, and never infer one from a logo fragment, phone number, or website alone
    }
  ]
}

Rules:
- Return ONE object per distinct quote/invoice/receipt in the document, in document order. A document with a single quote returns an array with exactly one object.
- Never invent values. Use null for anything you cannot determine from the document.
- Prefer the grand total / amount due for each quote. Ignore line-item subtotals.
- The user will review every field before submitting, so completeness beats caution — but never guess a number.`;

/**
 * Sniff the real file type from magic bytes — the client-supplied MIME
 * type is untrusted. Returns the detected type, or null when the bytes
 * don't match any known signature (caller then falls back to the
 * client MIME, which the extension check still constrains).
 */
function sniffMime(bytes: Buffer): string | null {
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("latin1") === "%PDF-") {
    return "application/pdf";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("latin1") === "RIFF" &&
    bytes.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "image/webp";
  }
  if (bytes.length >= 12 && bytes.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = bytes.subarray(8, 12).toString("latin1");
    if (["heic", "heix", "heim", "heis", "mif1", "msf1", "hevc", "hevx"].includes(brand)) {
      return "image/heic";
    }
  }
  return null;
}

/** Coerce a model amount to dollars: numbers pass through, and strings
    like "12,400" or "$5,253.36" are parsed instead of dropped. */
function coerceAmount(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    return Math.round(v * 100) / 100;
  }
  if (typeof v === "string") {
    const n = Number(v.replace(/[$,\s]/g, ""));
    if (Number.isFinite(n) && n > 0) return Math.round(n * 100) / 100;
  }
  return null;
}

/**
 * POST /api/extract — accepts a quote/invoice document (photo or PDF),
 * runs it through Gemini (free tier) vision, and returns one structured
 * object per distinct quote found: { ok: true, quotes: [...] }.
 * A single-quote document returns an array with one object.
 * The user always reviews before submitting.
 *
 * Requires GEMINI_API_KEY (free at https://aistudio.google.com/apikey).
 * Returns { ok: false, error: "not_configured" } (HTTP 501) when the key
 * is missing so the UI can fall back to the manual form gracefully.
 * Uses gemini-3.5-flash-lite — gemini-3.6-flash retires Nov 19, 2026 and
 * gemini-3.5-flash is deprecated (routes to 3.6-flash).
 */
export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "not_configured" },
      { status: 501 }
    );
  }

  try {
    // Cheap pre-parse guard against giant multipart bodies (8 MB file + slack).
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 12 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "Document must be under 8 MB." },
        { status: 413 }
      );
    }

    const form = await req.formData();

    // Spam check (only enforced when Turnstile keys are configured).
    // ("unknown" IP -> null so Turnstile doesn't get a bogus remoteip.)
    const ip = clientIp(req);
    const turnstileOk = await verifyTurnstile(
      String(form.get("turnstileToken") ?? ""),
      ip === "unknown" ? null : ip,
      "submit"
    );
    if (!turnstileOk) {
      return NextResponse.json(
        { ok: false, error: "Spam check failed. Please try again." },
        { status: 400 }
      );
    }

    const file = form.get("document");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { ok: false, error: "No document uploaded." },
        { status: 400 }
      );
    }
    if (file.size > MAX_DOC_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Document must be under 8 MB." },
        { status: 400 }
      );
    }

    const claimedMime = file.type || "image/jpeg";
    const bytes = Buffer.from(await file.arrayBuffer());
    // Trust magic bytes over the client-supplied MIME type. A file whose
    // real type isn't an allowed photo/PDF is rejected even if the client
    // claims otherwise; an unidentifiable file keeps the claimed type
    // (the extension check below still constrains it).
    const sniffed = sniffMime(bytes);
    const mime = sniffed ?? claimedMime;
    const isPdf = mime === "application/pdf";
    if (!isPdf && !ALLOWED_IMAGE_TYPES.includes(mime)) {
      return NextResponse.json(
        { ok: false, error: "Please upload a photo (JPG/PNG/WebP) or PDF." },
        { status: 400 }
      );
    }



    const base64 = bytes.toString("base64");

    // One Gemini call via the shared helper (lib/gemini.ts): model from
    // GEMINI_MODEL, default gemini-3.5-flash-lite ONLY. Do NOT re-add
    // gemini-3.6-flash (retires Nov 19, 2026) or gemini-3.5-flash
    // (deprecated Oct 8, 2026 — routes to 3.6-flash).
    const { text: raw, finishReason } = await callGemini({
      apiKey,
      parts: [
        { text: EXTRACTION_PROMPT },
        { inline_data: { mime_type: mime, data: base64 } },
      ],
      // Multi-quote documents need headroom: 1500 tokens could cut the
      // JSON off mid-object (up to 20 quotes).
      maxOutputTokens: 4000,
      timeoutMs: 30_000,
    });

    // A MAX_TOKENS finish means the JSON was cut off mid-object — the
    // parse below would fail or, worse, silently return partial quotes.
    if (finishReason === "MAX_TOKENS" || !raw) {
      return NextResponse.json(
        { ok: false, error: "Could not read the document. Please fill in the form manually." },
        { status: 502 }
      );
    }
    let fields: Record<string, unknown>;
    try {
      fields = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Could not read the document. Please fill in the form manually." },
        { status: 502 }
      );
    }

    // Relevance gate (fail closed): the document must actually be a
    // home-services quote/invoice. A missing documentCheck is treated
    // the same as a negative one — the model is instructed to always
    // return it, so an absent check means a malformed response, not a
    // relevant document.
    const docCheck = fields.documentCheck as
      | { isRelevant?: boolean; reason?: string }
      | undefined;
    if (docCheck?.isRelevant !== true) {
      const reason =
        typeof docCheck?.reason === "string" && docCheck.reason
          ? docCheck.reason.slice(0, 200)
          : "it doesn't look like a home-services quote or invoice";
      return NextResponse.json(
        {
          ok: false,
          error: "rejected",
          reason: `This document was rejected: ${reason}. Please upload a quote or invoice for a home service.`,
        },
        { status: 422 }
      );
    }

    // The model should return { quotes: [...] }, but tolerate the legacy
    // flat shape (a single quote object) in case of model variance.
    const rawQuotes = Array.isArray(fields.quotes)
      ? (fields.quotes as Array<Record<string, unknown>>)
      : "serviceName" in fields || "amount" in fields
        ? [fields]
        : [];

    // Sanitize: only pass through known fields with sane types.
    const categories = siteConfig.categories as readonly string[];

    const cleanQuote = (q: Record<string, unknown>): Record<string, string | number | null> => {
      return {
        serviceName:
          typeof q.serviceName === "string" ? q.serviceName.slice(0, 120) : null,
        category:
          typeof q.category === "string" && categories.includes(q.category)
            ? q.category
            : "Handyman/Other",
        amount: coerceAmount(q.amount),
        town: typeof q.town === "string" ? q.town.slice(0, 80) : null,
        serviceDate:
          typeof q.serviceDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(q.serviceDate)
            ? q.serviceDate
            : null,
        reportType: q.reportType === "quote" ? "quote" : "paid",
        notes: typeof q.notes === "string" ? q.notes.slice(0, 500) : null,
        // Company/contractor name for the admin queue's editable field
        // (never shown to visitors — the reveal reads only admin-saved
        // names). Null when the document names none: never guessed.
        businessName:
          typeof q.businessName === "string"
            ? q.businessName.trim().slice(0, 200) || null
            : null,
      };
    };

    // Usefulness gate: keep only quotes with at least a service description
    // or an amount — without either there is nothing worth publishing.
    const quotes = rawQuotes.map(cleanQuote).filter(
      (q) => q.serviceName || q.amount !== null
    );

    if (quotes.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "rejected",
          reason:
            "We couldn't read any service details or prices from this document. Please try a clearer photo or a PDF.",
        },
        { status: 422 }
      );
    }

    // Receipts (H2): one row per extracted quote, binding the document's
    // SHA-256 to the extracted amount. /api/submit only badges a report
    // Verified when the uploaded file's hash matches an unconsumed
    // receipt for the submitted amount — so editing the amount after
    // extraction publishes as unverified instead of Verified.
    const receiptIds = new Map<number, string>();
    try {
      const sb = getServiceSupabase();
      const fileSha256 = createHash("sha256").update(bytes).digest("hex");
      // Prune receipts older than 24h while we're here (cheap, indexed).
      await sb
        .from("extract_receipts")
        .delete()
        .lt("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
      const receiptRows = quotes
        .map((q, i) => ({
          i,
          id: crypto.randomUUID(),
          amount_cents:
            typeof q.amount === "number" ? Math.round(q.amount * 100) : null,
          category:
            typeof q.category === "string" ? q.category : "Handyman/Other",
          service_date:
            typeof q.serviceDate === "string" ? q.serviceDate : null,
        }))
        .filter((r) => r.amount_cents !== null && r.amount_cents > 0);
      if (receiptRows.length > 0) {
        const { error } = await sb.from("extract_receipts").insert(
          receiptRows.map((r) => ({
            id: r.id,
            file_sha256: fileSha256,
            amount_cents: r.amount_cents as number,
            category: r.category,
            service_date: r.service_date,
          }))
        );
        if (error) {
          console.error("extract: receipt insert failed", error);
        } else {
          for (const r of receiptRows) receiptIds.set(r.i, r.id);
        }
      }
    } catch (err) {
      // Receipts are an integrity feature, not a blocker: if the table
      // is missing (migration not applied yet), extraction still works
      // and the quotes simply publish unverified.
      console.error("extract: receipt error", err);
    }

    return NextResponse.json({
      ok: true,
      quotes: quotes.map((q, i) => ({
        ...q,
        receiptId: receiptIds.get(i) ?? null,
      })),
    });
  } catch (err) {
    console.error("extract error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please fill in the form manually." },
      { status: 500 }
    );
  }
}
