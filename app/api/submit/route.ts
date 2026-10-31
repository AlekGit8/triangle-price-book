import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getServiceSupabase } from "@/lib/supabase-server";
import { verifyTurnstile } from "@/lib/turnstile";
import { clientIp } from "@/lib/rate-limit";
import { siteConfig } from "@/lib/site-config";
import { isValidEmail } from "@/lib/validation";


const MAX_INVOICE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_BATCH = 20;
// Reject absurd payloads before parsing multipart bodies (8 MB file + slack).
const MAX_BODY_BYTES = 12 * 1024 * 1024;

// Field caps: the DB columns are unbounded text, so enforce sane limits here.
const MAX_SERVICE_NAME = 200;
const MAX_TOWN = 80;
const MAX_NOTES = 2000;
// $2M in cents — a generous ceiling for any home service (a full roof +
// HVAC + remodel rarely tops $500k); the old $20M cap was far above any
// real price and let typos like 1e5 slip through as $100,000.
const MAX_AMOUNT_CENTS = 200_000_000;

// Invoice attachments are stored privately and opened by the owner during
// moderation. Restrict to image/PDF types the extraction flow already
// accepts — no SVG/HTML (scriptable when rendered) and no executables.
const ALLOWED_INVOICE_EXTS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
  "pdf",
]);

// Content-Type for stored invoices comes from the file EXTENSION, never
// from the uploader-supplied MIME type — a client can claim any type, and
// a stored "text/html" (or scriptable) type is a footgun if an admin ever
// opens the file in a browser. The extension allowlist above bounds this.
const INVOICE_MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};

// Extract receipts (migration 0017) live 24h and are single-use.
const RECEIPT_TTL_MS = 24 * 3600 * 1000;
/** Amount tolerance for a receipt match: max $1 or 1% of the extracted
 *  amount — covers rounding, not an edited price. */
function receiptTolerance(extractedCents: number): number {
  return Math.max(100, Math.round(extractedCents * 0.01));
}

/** True for a real calendar date in YYYY-MM-DD form (not just the shape),
 *  and not in the future — a service date is a date something was paid
 *  for or quoted, so tomorrow makes no sense. */
function validServiceDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (y < 1900 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return false;
  }
  // Today in America/New_York (the site's audience), not UTC — after
  // 7 PM ET the UTC date is already tomorrow.
  const todayET = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return s <= todayET;
}

/**
 * Parse an amount from its string form into integer cents — never via
 * Number() (which accepts "1e5" and has float rounding: 1.005 * 100 is
 * 100.4999…). Only the client pattern is accepted: digits, optionally
 * with up to two decimal places.
 */
function parseAmountCents(raw: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const [dollars, cents = ""] = raw.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
}

/**
 * Redact contact details from free text shown publicly. The Terms
 * already forbid emails, phone numbers, and URLs in reports; the
 * server enforces it by redacting rather than rejecting, so a typo'd
 * note doesn't lose the whole submission.
 */
function redactContactInfo(text: string): string {
  return text
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email removed]")
    .replace(/\b(?:https?:\/\/|www\.)[^\s]+/gi, "[link removed]")
    .replace(/(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?){2}\d{4}/g, "[phone removed]");
}

interface ReportInput {
  category: unknown;
  serviceName: unknown;
  amount: unknown;
  reportType: unknown;
  town: unknown;
  serviceDate: unknown;
  notes: unknown;
  receiptId?: unknown;
  /** Company/contractor name read from the uploaded document, if any
   *  (batch mode only — the manual form never reads the document). */
  businessName?: unknown;
}

/** Sanitize an extracted business name: trimmed, capped like the admin
 *  business-name endpoint (200 chars); empty or non-string becomes
 *  null (no name extracted). This is only an admin suggestion — the
 *  admin reviews it before it ever reaches the paid reveal. */
function cleanBusinessName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, 200);
  return t ? t : null;
}

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** Normalize a town name to its canonical spelling so reports don't
 *  fragment across variants like "Fuquay Varina" vs "Fuquay-Varina". */
function normalizeTown(raw: string): string {
  const t = raw.trim().replace(/\s+/g, " ");
  // Canonicalize known Triangle towns (case-insensitive, hyphen/space agnostic).
  const key = t.toLowerCase().replace(/[-\s]+/g, "");
  const canonical: Record<string, string> = {
    fuquayvarina: "Fuquay-Varina",
    hollysprings: "Holly Springs",
    apex: "Apex",
    cary: "Cary",
    raleigh: "Raleigh",
    durham: "Durham",
    chapelhill: "Chapel Hill",
    carrboro: "Carrboro",
    morrisville: "Morrisville",
    wakeforest: "Wake Forest",
    knightdale: "Knightdale",
    rolesville: "Rolesville",
    wendell: "Wendell",
    zebulon: "Zebulon",
    garner: "Garner",
    clayton: "Clayton",
    pittsboro: "Pittsboro",
    sanford: "Sanford",
    hillsborough: "Hillsborough",
  };
  return canonical[key] ?? t;
}

/** Validate one report's fields; returns the DB row or an error. */
function validateReport(
  input: ReportInput
): { row: Record<string, unknown> } | { error: string } {
  const category = String(input.category ?? "");
  const serviceName = redactContactInfo(String(input.serviceName ?? "").trim());
  const amountRaw = String(input.amount ?? "").trim();
  const reportType = String(input.reportType ?? "");
  const town = redactContactInfo(normalizeTown(String(input.town ?? "")));
  const serviceDateRaw = String(input.serviceDate ?? "").trim() || null;
  const notes = String(input.notes ?? "").trim()
    ? redactContactInfo(String(input.notes ?? "").trim())
    : null;

  if (!siteConfig.categories.includes(category as never))
    return { error: "Invalid category." };
  if (!serviceName || !town)
    return { error: "Service and town are required." };
  if (serviceName.length > MAX_SERVICE_NAME)
    return { error: `Service name must be under ${MAX_SERVICE_NAME} characters.` };
  if (town.length > MAX_TOWN)
    return { error: `Town must be under ${MAX_TOWN} characters.` };
  if (notes && notes.length > MAX_NOTES)
    return { error: `Notes must be under ${MAX_NOTES} characters.` };
  if (!["paid", "quote"].includes(reportType))
    return { error: "Report type must be paid or quote." };
  const amountCents = parseAmountCents(amountRaw);
  if (amountCents === null || amountCents <= 0)
    return { error: "Amount must be a number like 1234.56." };
  if (amountCents > MAX_AMOUNT_CENTS)
    return { error: "Amount looks unrealistically large. Please check it." };
  let serviceDate: string | null = null;
  if (serviceDateRaw) {
    if (!validServiceDate(serviceDateRaw))
      return { error: "Service date must be a real date (YYYY-MM-DD), not in the future." };
    serviceDate = serviceDateRaw;
  }

  return {
    row: {
      service_name: serviceName,
      category,
      amount_cents: amountCents,
      report_type: reportType,
      town,
      service_date: serviceDate,
      notes,
    },
  };
}

type Sb = ReturnType<typeof getServiceSupabase>;

/**
 * Has this exact document already been submitted for this amount? The
 * (file hash, amount) pair is the dedup key: a multi-quote document can
 * still verify several reports at different amounts, but the same quote
 * can't be published twice. (No DB unique constraint — two identical
 * amounts in one batch insert would trip it — so a narrow race remains:
 * two simultaneous duplicate submissions could both pass. Low harm:
 * both are visible and an admin can reject one.)
 */
async function duplicateExists(
  sb: Sb,
  fileHash: string,
  amountCents: number
): Promise<boolean> {
  const { data, error } = await sb
    .from("verifications")
    .select("id")
    .eq("file_sha256", fileHash)
    .eq("amount_cents", amountCents)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/**
 * Does an extract receipt back this report? The receipt must exist, be
 * unconsumed and fresh (24h), match the uploaded file's SHA-256, and the
 * submitted amount must be within tolerance of the extracted amount.
 * Anything else — no receipt, an edited amount, a different file —
 * publishes as unverified.
 */
async function receiptVerifies(
  sb: Sb,
  receiptId: string | null,
  fileHash: string | null,
  amountCents: number
): Promise<boolean> {
  if (!receiptId || !fileHash) return false;
  const { data, error } = await sb
    .from("extract_receipts")
    .select("file_sha256, amount_cents, created_at, consumed_at")
    .eq("id", receiptId)
    .single();
  if (error || !data) return false;
  if (data.consumed_at) return false;
  if (Date.now() - new Date(data.created_at).getTime() > RECEIPT_TTL_MS)
    return false;
  if (data.file_sha256 !== fileHash) return false;
  return (
    Math.abs(amountCents - data.amount_cents) <=
    receiptTolerance(data.amount_cents)
  );
}

/** Storage path already holding this document, if any — so a shared
 *  multi-quote document is uploaded once, not once per quote published. */
async function existingInvoicePath(
  sb: Sb,
  fileHash: string
): Promise<string | null> {
  const { data, error } = await sb
    .from("verifications")
    .select("invoice_path")
    .eq("file_sha256", fileHash)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0]?.invoice_path ?? null;
}

/**
 * POST /api/submit — accepts the /submit form.
 *
 * Two modes:
 *  - Single: flat form fields (the manual no-AI form). One report. Always
 *    publishes as unverified — even with a document attached (Option 2):
 *    the document was never read, so nothing backs the amount. A moderator
 *    can promote it from /admin after reviewing the invoice.
 *  - Batch: a "reports" field containing a JSON array of report objects, plus
 *    one shared "invoice" file. Used when an uploaded document contained
 *    multiple quotes — each becomes its own report. Each report may carry
 *    the receiptId /api/extract returned for it; a report is Verified only
 *    when its receipt matches the uploaded file's hash and the amount is
 *    within tolerance of the extracted amount.
 *
 * The invoice file is validated (size, extension) and hashed BEFORE any
 * row is written — rows used to be inserted as "verified" first and the
 * file checked after, with manual rollback deletes. A duplicate document
 * (same file hash + amount already verified) is rejected outright.
 * Uses the service role server-side so the browser never needs elevated keys.
 */
export async function POST(req: Request) {
  try {
    // Cheap pre-parse guard against giant multipart bodies.
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return bad("Payload too large.", 413);
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
      return bad("Spam check failed. Please try again.");
    }

    // Submitter email is optional, but when present it must look like an
    // email. It is stored in the private report_contacts table (service
    // role only) — never on the publicly-readable reports table.
    const rawEmail = String(form.get("submitterEmail") ?? "").trim();
    // Optional company/contractor name the submitter typed (manual form)
    // or the draft card carried (AI-extracted or edited). Saved only as
    // an admin suggestion on the verifications row when a document is
    // attached — the paid reveal only ever reads admin-saved names on
    // verified reports, so a typed name can never surface unverified.
    const businessName = cleanBusinessName(form.get("businessName"));
    let submitterEmail: string | null = null;
    if (rawEmail) {
      if (!isValidEmail(rawEmail)) {
        return bad("Please enter a valid email address.");
      }
      submitterEmail = rawEmail.toLowerCase();
    }
    const invoice = form.get("invoice");
    const hasInvoice = invoice instanceof File && invoice.size > 0;
    const now = new Date().toISOString();
    const sb = getServiceSupabase();

    // Validate the invoice before writing anything: size, extension, and
    // its SHA-256 (used for receipts, dedup, and upload-once reuse).
    let invoiceBuf: Buffer | null = null;
    let invoiceHash: string | null = null;
    let invoiceExt: string | null = null;
    if (hasInvoice) {
      const inv = invoice as File;
      if (inv.size > MAX_INVOICE_BYTES) {
        return bad("Invoice file must be under 8 MB.");
      }
      invoiceExt =
        inv.name.split(".").pop()?.toLowerCase() ?? "bin";
      if (!ALLOWED_INVOICE_EXTS.has(invoiceExt)) {
        return bad("Invoice must be a photo (JPG, PNG, WebP, HEIC) or a PDF.");
      }
      invoiceBuf = Buffer.from(await inv.arrayBuffer());
      invoiceHash = createHash("sha256").update(invoiceBuf).digest("hex");
    }

    // ---- Batch mode: N reports, one shared invoice ----
    const reportsRaw = form.get("reports");
    if (typeof reportsRaw === "string") {
      let items: unknown;
      try {
        items = JSON.parse(reportsRaw);
      } catch {
        return bad("Invalid reports payload.");
      }
      if (!Array.isArray(items) || items.length === 0 || items.length > MAX_BATCH) {
        return bad(`Expected between 1 and ${MAX_BATCH} reports.`);
      }

      // Validate everything before writing anything — no partial batches.
      const rows: Record<string, unknown>[] = [];
      const verifiedFlags: boolean[] = [];
      const usedReceiptIds: string[] = [];
      const businessNames: (string | null)[] = [];
      for (const item of items) {
        const v = validateReport((item ?? {}) as ReportInput);
        if ("error" in v) return bad(v.error);
        businessNames.push(
          cleanBusinessName((item as Record<string, unknown>).businessName)
        );
        const amountCents = v.row.amount_cents as number;
        let verified = false;
        if (hasInvoice && invoiceHash) {
          if (await duplicateExists(sb, invoiceHash, amountCents)) {
            return bad("This document was already submitted for this amount.");
          }
          const receiptId =
            typeof (item as Record<string, unknown>).receiptId === "string"
              ? ((item as Record<string, unknown>).receiptId as string)
              : null;
          verified = await receiptVerifies(sb, receiptId, invoiceHash, amountCents);
          if (verified && receiptId) usedReceiptIds.push(receiptId);
        }
        rows.push({
          ...v.row,
          verification_status: verified ? "verified" : "unverified",
          moderated_at: verified ? now : null,
        });
        verifiedFlags.push(verified);
      }

      const { data: inserted, error: insErr } = await sb
        .from("reports")
        .insert(rows)
        .select("id");
      if (insErr) throw insErr;
      const ids = ((inserted ?? []) as Array<{ id: string }>).map((r) => r.id);

      // Private contact emails live in report_contacts (service role only),
      // never on the publicly-readable reports table.
      if (submitterEmail) {
        const { error: cErr } = await sb
          .from("report_contacts")
          .insert(ids.map((id) => ({ report_id: id, email: submitterEmail })));
        if (cErr) {
          await sb.from("reports").delete().in("id", ids);
          throw cErr;
        }
      }

      if (!hasInvoice) {
        return NextResponse.json({
          ok: true,
          ids,
          results: ids.map((id, i) => ({ id, verified: verifiedFlags[i] })),
        });
      }

      // Upload the document once (reuse the stored path if this file was
      // already uploaded for an earlier quote from the same document),
      // then link every report to it.
      let path = await existingInvoicePath(sb, invoiceHash as string);
      let uploadedNew = false;
      if (!path) {
        path = `shared/${crypto.randomUUID()}/${Date.now()}.${invoiceExt}`;
        const { error: upErr } = await sb.storage
          .from("invoices")
          .upload(path, invoiceBuf as Buffer, {
            contentType: INVOICE_MIME_BY_EXT[invoiceExt as string] ?? "application/octet-stream",
          });
        if (upErr) {
          await sb.from("reports").delete().in("id", ids);
          throw upErr;
        }
        uploadedNew = true;
      }
      const { error: verErr } = await sb.from("verifications").insert(
        ids.map((id, i) => ({
          report_id: id,
          invoice_path: path as string,
          file_sha256: invoiceHash as string,
          amount_cents: rows[i].amount_cents as number,
          // Auto-extracted company name for the admin queue's editable
          // field (null when extraction named none). The paid reveal
          // never reads this column — only admin-saved names surface.
          extracted_business_name: businessNames[i],
        }))
      );
      if (verErr) {
        // Never leave rows marked "verified" with no backing invoice:
        // the verification link is what the badge means. Roll back the
        // reports (and the file, if this call uploaded it).
        await sb.from("reports").delete().in("id", ids);
        if (uploadedNew) await sb.storage.from("invoices").remove([path as string]);
        throw verErr;
      }
      // Consume the receipts that verified reports (single-use).
      if (usedReceiptIds.length > 0) {
        await sb
          .from("extract_receipts")
          .update({ consumed_at: now })
          .in("id", usedReceiptIds);
      }

      return NextResponse.json({
        ok: true,
        ids,
        results: ids.map((id, i) => ({ id, verified: verifiedFlags[i] })),
      });
    }

    // ---- Single mode: flat fields (manual form) ----
    // Manual entries publish as unverified even with a document attached:
    // only the AI-read flow (batch + receipt) earns Verified. A moderator
    // can promote it from /admin after reviewing the invoice.
    const v = validateReport({
      category: form.get("category"),
      serviceName: form.get("serviceName"),
      amount: form.get("amount"),
      reportType: form.get("reportType"),
      town: form.get("town"),
      serviceDate: form.get("serviceDate"),
      notes: form.get("notes"),
    });
    if ("error" in v) return bad(v.error);
    if (hasInvoice && invoiceHash) {
      if (await duplicateExists(sb, invoiceHash, v.row.amount_cents as number)) {
        return bad("This document was already submitted for this amount.");
      }
    }

    const { data: report, error: repErr } = await sb
      .from("reports")
      .insert({
        ...v.row,
        verification_status: "unverified",
        moderated_at: null,
      })
      .select("id")
      .single();
    if (repErr) throw repErr;

    // Private contact email (service-role-only table).
    if (submitterEmail) {
      const { error: cErr } = await sb
        .from("report_contacts")
        .insert({ report_id: report.id, email: submitterEmail });
      if (cErr) {
        await sb.from("reports").delete().eq("id", report.id);
        throw cErr;
      }
    }

    if (!hasInvoice) {
      return NextResponse.json({ ok: true, id: report.id, verified: false });
    }

    // Invoice path: reuse the stored path when this file was already
    // uploaded, otherwise store it under this report.
    let path = await existingInvoicePath(sb, invoiceHash as string);
    let uploadedNew = false;
    if (!path) {
      path = `${report.id}/${Date.now()}.${invoiceExt}`;
      const { error: upErr } = await sb.storage
        .from("invoices")
        .upload(path, invoiceBuf as Buffer, {
          contentType: INVOICE_MIME_BY_EXT[invoiceExt as string] ?? "application/octet-stream",
        });
      if (upErr) {
        await sb.from("reports").delete().eq("id", report.id);
        throw upErr;
      }
      uploadedNew = true;
    }
    const { error: verErr } = await sb.from("verifications").insert({
      report_id: report.id,
      invoice_path: path,
      file_sha256: invoiceHash as string,
      amount_cents: v.row.amount_cents as number,
      // Submitter-typed company name as the admin queue's suggestion
      // (null when none was typed). Admin-reviewed before it can ever
      // reach the paid reveal, and only on verified reports.
      extracted_business_name: businessName,
    });
    if (verErr) {
      // Never leave a row with no backing invoice — see the batch-mode
      // note above. Roll back the report and the file (if newly uploaded).
      await sb.from("reports").delete().eq("id", report.id);
      if (uploadedNew) await sb.storage.from("invoices").remove([path as string]);
      throw verErr;
    }

    return NextResponse.json({ ok: true, id: report.id, verified: false });
  } catch (err) {
    console.error("submit error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
