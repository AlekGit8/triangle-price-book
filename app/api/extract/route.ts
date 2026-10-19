import { NextResponse } from "next/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { siteConfig } from "@/lib/site-config";

const MAX_DOC_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const EXTRACTION_PROMPT = `You are extracting structured data from a home-services quote or invoice/receipt document (photo or PDF). Return ONLY a JSON object with these exact keys:

{
  "serviceName": "short description of the work, e.g. 'Tankless water heater install (Rinnai RX199)'",
  "category": one of ["HVAC", "Plumbing", "Electrical", "Roofing", "Appliances", "Other"],
  "amount": grand total as a number with no commas or currency symbols, e.g. 5253.36,
  "amountNote": "+ tax" if tax is NOT included in the total, "incl. tax" if it is, or null if unclear,
  "town": town where the work was performed (the customer's town, not the business's), or null if unclear,
  "serviceDate": date of service or quote as YYYY-MM-DD, or null if unclear,
  "reportType": "paid" if this is an invoice/receipt for completed paid work, "quote" if it is an estimate/quote,
  "notes": one-line summary of the scope of work, or null
}

Rules:
- Never invent values. Use null for anything you cannot determine from the document.
- Prefer the grand total / amount due. Ignore line-item subtotals.
- The user will review every field before submitting, so completeness beats caution — but never guess a number.

Finally, include a relevance verdict:
"documentCheck": {
  "isRelevant": true ONLY if this document is a quote, estimate, invoice, or receipt for a HOME SERVICE (HVAC, plumbing, electrical, roofing, appliances, pest control, landscaping, handyman, remodeling, etc.) that contains a service description and a price. False for anything else — restaurant or retail receipts, random photos, screenshots of text conversations, blank or unreadable pages, etc.,
  "reason": "if isRelevant is false, one short sentence saying what the document actually appears to be; otherwise null"
}`;

/**
 * POST /api/extract — accepts a quote/invoice document (photo or PDF),
 * runs it through Gemini (free tier) vision, and returns structured fields
 * to pre-fill the /submit form. The user always reviews before submitting.
 *
 * Requires GEMINI_API_KEY (free at https://aistudio.google.com/apikey).
 * Returns { ok: false, error: "not_configured" } (HTTP 501) when the key
 * is missing so the UI can fall back to the manual form gracefully.
 * Tries gemini-3.6-flash first, falling back to gemini-3.5-flash —
 * Google retires older versioned models for new API keys.
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
    const form = await req.formData();

    // Spam check (only enforced when Turnstile keys are configured).
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const turnstileOk = await verifyTurnstile(
      String(form.get("turnstileToken") ?? ""),
      ip
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

    const mime = file.type || "image/jpeg";
    const isPdf = mime === "application/pdf";
    if (!isPdf && !ALLOWED_IMAGE_TYPES.includes(mime)) {
      return NextResponse.json(
        { ok: false, error: "Please upload a photo (JPG/PNG/WebP) or PDF." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = bytes.toString("base64");

    // Model fallback chain: Google retires older versioned models for new
    // API keys, and the newest models can be capacity-throttled (503).
    // Try in order; first success wins.
    const MODELS = ["gemini-3.6-flash", "gemini-3.5-flash"];
    let aiJson: Record<string, unknown> | null = null;
    let lastStatus = 0;
    for (const model of MODELS) {
      const aiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: EXTRACTION_PROMPT },
                  { inline_data: { mime_type: mime, data: base64 } },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: "application/json",
              maxOutputTokens: 600,
            },
          }),
        }
      );
      lastStatus = aiRes.status;
      if (aiRes.ok) {
        aiJson = (await aiRes.json()) as Record<string, unknown>;
        break;
      }
      console.error(`extract: Gemini model ${model} error`, aiRes.status);
    }

    if (!aiJson) {
      console.error("extract: all Gemini models failed, last status", lastStatus);
      return NextResponse.json(
        { ok: false, error: "Could not read the document. Please fill in the form manually." },
        { status: 502 }
      );
    }

    const candidates = aiJson.candidates as
      | Array<{ content?: { parts?: Array<{ text?: string }> } }>
      | undefined;
    const raw = candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    let fields: Record<string, unknown>;
    try {
      fields = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Could not read the document. Please fill in the form manually." },
        { status: 502 }
      );
    }

    // Sanitize: only pass through known fields with sane types.
    const categories = siteConfig.categories as readonly string[];

    // Relevance gate: the document must actually be a home-services
    // quote/invoice. Anything else is rejected outright.
    const docCheck = fields.documentCheck as
      | { isRelevant?: boolean; reason?: string }
      | undefined;
    if (docCheck && docCheck.isRelevant === false) {
      const reason =
        typeof docCheck.reason === "string" && docCheck.reason
          ? docCheck.reason
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

    const clean: Record<string, string | number | null> = {
      serviceName:
        typeof fields.serviceName === "string" ? fields.serviceName.slice(0, 120) : null,
      category:
        typeof fields.category === "string" && categories.includes(fields.category)
          ? fields.category
          : "Other",
      amount:
        typeof fields.amount === "number" && Number.isFinite(fields.amount) && fields.amount > 0
          ? Math.round(fields.amount * 100) / 100
          : null,
      amountNote:
        typeof fields.amountNote === "string" ? fields.amountNote.slice(0, 20) : null,
      town: typeof fields.town === "string" ? fields.town.slice(0, 80) : null,
      serviceDate:
        typeof fields.serviceDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fields.serviceDate)
          ? fields.serviceDate
          : null,
      reportType: fields.reportType === "quote" ? "quote" : "paid",
      notes: typeof fields.notes === "string" ? fields.notes.slice(0, 500) : null,
    };

    // Usefulness gate: without at least a service description and an amount,
    // there is nothing worth publishing — the photo was likely unreadable.
    if (!clean.serviceName && clean.amount === null) {
      return NextResponse.json(
        {
          ok: false,
          error: "rejected",
          reason:
            "We couldn't read any service details or price from this document. Please try a clearer photo or a PDF.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ ok: true, fields: clean });
  } catch (err) {
    console.error("extract error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please fill in the form manually." },
      { status: 500 }
    );
  }
}
