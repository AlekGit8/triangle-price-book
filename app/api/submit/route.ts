import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { verifyTurnstile } from "@/lib/turnstile";
import { clientIp } from "@/lib/rate-limit";
import { siteConfig } from "@/lib/site-config";


const MAX_INVOICE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_BATCH = 20;
// Reject absurd payloads before parsing multipart bodies (8 MB file + slack).
const MAX_BODY_BYTES = 12 * 1024 * 1024;

// Field caps: the DB columns are unbounded text, so enforce sane limits here.
const MAX_SERVICE_NAME = 200;
const MAX_TOWN = 80;
const MAX_NOTES = 2000;
const MAX_AMOUNT_NOTE = 60;
// $20M in cents — stays inside the Postgres integer column (max ~$21.4M).
const MAX_AMOUNT_CENTS = 2_000_000_000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

/** True for a real calendar date in YYYY-MM-DD form (not just the shape). */
function validServiceDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (y < 1900 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
}

interface ReportInput {
  category: unknown;
  serviceName: unknown;
  amount: unknown;
  amountNote: unknown;
  reportType: unknown;
  town: unknown;
  serviceDate: unknown;
  notes: unknown;
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
  const serviceName = String(input.serviceName ?? "").trim();
  const amountRaw = String(input.amount ?? "").trim();
  const reportType = String(input.reportType ?? "");
  const town = normalizeTown(String(input.town ?? ""));
  const amountNote = String(input.amountNote ?? "").trim() || null;
  const serviceDateRaw = String(input.serviceDate ?? "").trim() || null;
  const notes = String(input.notes ?? "").trim() || null;

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
  if (amountNote && amountNote.length > MAX_AMOUNT_NOTE)
    return { error: `Amount note must be under ${MAX_AMOUNT_NOTE} characters.` };
  if (!["paid", "quote"].includes(reportType))
    return { error: "Report type must be paid or quote." };
  const amountCents = Math.round(Number(amountRaw) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0)
    return { error: "Amount must be a positive number." };
  if (amountCents > MAX_AMOUNT_CENTS)
    return { error: "Amount looks unrealistically large. Please check it." };
  let serviceDate: string | null = null;
  if (serviceDateRaw) {
    if (!validServiceDate(serviceDateRaw))
      return { error: "Service date must be a real date (YYYY-MM-DD)." };
    serviceDate = serviceDateRaw;
  }

  return {
    row: {
      service_name: serviceName,
      category,
      amount_cents: amountCents,
      amount_note: amountNote,
      report_type: reportType,
      town,
      service_date: serviceDate,
      notes,
    },
  };
}

/**
 * POST /api/submit — accepts the /submit form.
 *
 * Two modes:
 *  - Single: flat form fields (the manual no-document form). One report.
 *  - Batch: a "reports" field containing a JSON array of report objects, plus
 *    one shared "invoice" file. Used when an uploaded document contained
 *    multiple quotes — each becomes its own report, all verified against the
 *    same stored document.
 *
 * With a quote/invoice document, reports publish immediately as verified
 * (the document is the verification) and the file is stored in the private
 * bucket, linked via verification rows. Without a document, entries publish
 * immediately as unverified community reports (badged in the UI, excluded
 * from aggregates). There is no moderation queue; takedowns happen via
 * /admin if abuse appears. Uses the service role server-side so the browser
 * never needs elevated keys.
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
    let submitterEmail: string | null = null;
    if (rawEmail) {
      if (rawEmail.length > 254 || !EMAIL_RE.test(rawEmail)) {
        return bad("Please enter a valid email address.");
      }
      submitterEmail = rawEmail.toLowerCase();
    }
    const invoice = form.get("invoice");
    const hasInvoice = invoice instanceof File && invoice.size > 0;
    const now = new Date().toISOString();
    const sb = getServiceSupabase();

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
      for (const item of items) {
        const v = validateReport((item ?? {}) as ReportInput);
        if ("error" in v) return bad(v.error);
        rows.push({
          ...v.row,
          // A source document means instant verification for every report.
          verification_status: hasInvoice ? "verified" : "unverified",
          moderated_at: hasInvoice ? now : null,
        });
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
        return NextResponse.json({ ok: true, ids, verified: false });
      }

      // Upload the document once; link every report to the same file.
      const inv = invoice as File;
      if (inv.size > MAX_INVOICE_BYTES) {
        await sb.from("reports").delete().in("id", ids);
        return bad("Invoice file must be under 8 MB.");
      }
      const ext = inv.name.split(".").pop()?.toLowerCase() ?? "bin";
      if (!ALLOWED_INVOICE_EXTS.has(ext)) {
        await sb.from("reports").delete().in("id", ids);
        return bad("Invoice must be a photo (JPG, PNG, WebP, HEIC) or a PDF.");
      }
      const path = `shared/${crypto.randomUUID()}/${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage
        .from("invoices")
        .upload(path, inv, { contentType: inv.type || "application/octet-stream" });
      if (upErr) {
        await sb.from("reports").delete().in("id", ids);
        throw upErr;
      }
      const { error: verErr } = await sb
        .from("verifications")
        .insert(ids.map((id) => ({ report_id: id, invoice_path: path })));
      if (verErr) throw verErr;

      return NextResponse.json({ ok: true, ids, verified: true });
    }

    // ---- Single mode: flat fields (manual form) ----
    const v = validateReport({
      category: form.get("category"),
      serviceName: form.get("serviceName"),
      amount: form.get("amount"),
      amountNote: form.get("amountNote"),
      reportType: form.get("reportType"),
      town: form.get("town"),
      serviceDate: form.get("serviceDate"),
      notes: form.get("notes"),
    });
    if ("error" in v) return bad(v.error);

    const { data: report, error: repErr } = await sb
      .from("reports")
      .insert({
        ...v.row,
        // A source document means instant verification. Without one, the
        // entry publishes as an unverified community report (badged in the
        // UI, excluded from aggregates). Takedowns happen via /admin.
        verification_status: hasInvoice ? "verified" : "unverified",
        moderated_at: hasInvoice ? now : null,
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

    // Invoice path: validate, store in the private bucket, link a verification.
    const inv = invoice as File;
    if (inv.size > MAX_INVOICE_BYTES) {
      await sb.from("reports").delete().eq("id", report.id);
      return bad("Invoice file must be under 8 MB.");
    }
    const ext = inv.name.split(".").pop()?.toLowerCase() ?? "bin";
    if (!ALLOWED_INVOICE_EXTS.has(ext)) {
      await sb.from("reports").delete().eq("id", report.id);
      return bad("Invoice must be a photo (JPG, PNG, WebP, HEIC) or a PDF.");
    }
    const path = `${report.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage
      .from("invoices")
      .upload(path, inv, { contentType: inv.type || "application/octet-stream" });
    if (upErr) {
      await sb.from("reports").delete().eq("id", report.id);
      throw upErr;
    }
    const { error: verErr } = await sb
      .from("verifications")
      .insert({ report_id: report.id, invoice_path: path });
    if (verErr) throw verErr;

    return NextResponse.json({ ok: true, id: report.id, verified: true });
  } catch (err) {
    console.error("submit error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
