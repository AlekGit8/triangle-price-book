import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { verifyTurnstile } from "@/lib/turnstile";
import { siteConfig } from "@/lib/site-config";

export const runtime = 'edge';

const MAX_INVOICE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_BATCH = 20;

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
  const serviceDate = String(input.serviceDate ?? "").trim() || null;
  const notes = String(input.notes ?? "").trim() || null;

  if (!siteConfig.categories.includes(category as never))
    return { error: "Invalid category." };
  if (!serviceName || !town)
    return { error: "Service and town are required." };
  if (!["paid", "quote"].includes(reportType))
    return { error: "Report type must be paid or quote." };
  const amountCents = Math.round(Number(amountRaw) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0)
    return { error: "Amount must be a positive number." };

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
    const form = await req.formData();

    // Spam check (only enforced when Turnstile keys are configured).
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const turnstileOk = await verifyTurnstile(
      String(form.get("turnstileToken") ?? ""),
      ip
    );
    if (!turnstileOk) {
      return bad("Spam check failed. Please try again.");
    }

    const submitterEmail =
      String(form.get("submitterEmail") ?? "").trim() || null;
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
          submitter_email: submitterEmail,
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
        submitter_email: submitterEmail,
        // A source document means instant verification. Without one, the
        // entry publishes as an unverified community report (badged in the
        // UI, excluded from aggregates). Takedowns happen via /admin.
        verification_status: hasInvoice ? "verified" : "unverified",
        moderated_at: hasInvoice ? now : null,
      })
      .select("id")
      .single();
    if (repErr) throw repErr;

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
