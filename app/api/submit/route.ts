import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { verifyTurnstile } from "@/lib/turnstile";
import { siteConfig } from "@/lib/site-config";

const MAX_INVOICE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * POST /api/submit — accepts the /submit form.
 * A quote/invoice document is REQUIRED. The report is published immediately
 * as verified (the document is the verification) — there is no moderation
 * queue for new submissions. The invoice is uploaded to the private bucket
 * and linked via a verification row. Uses the service role server-side so
 * the browser never needs elevated keys.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();

    // Spam check (only enforced when Turnstile keys are configured).
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const turnstileOk = await verifyTurnstile(String(form.get("turnstileToken") ?? ""), ip);
    if (!turnstileOk) {
      return NextResponse.json({ ok: false, error: "Spam check failed. Please try again." }, { status: 400 });
    }

    const category = String(form.get("category") ?? "");
    const serviceName = String(form.get("serviceName") ?? "").trim();
    const amountRaw = String(form.get("amount") ?? "").trim();
    const reportType = String(form.get("reportType") ?? "");
    const town = String(form.get("town") ?? "").trim();
    const amountNote = String(form.get("amountNote") ?? "").trim() || null;
    const serviceDate = String(form.get("serviceDate") ?? "").trim() || null;
    const notes = String(form.get("notes") ?? "").trim() || null;
    const submitterEmail = String(form.get("submitterEmail") ?? "").trim() || null;

    if (!siteConfig.categories.includes(category as never))
      return NextResponse.json({ ok: false, error: "Invalid category." }, { status: 400 });
    if (!serviceName || !town)
      return NextResponse.json({ ok: false, error: "Service and town are required." }, { status: 400 });
    if (!["paid", "quote"].includes(reportType))
      return NextResponse.json({ ok: false, error: "Report type must be paid or quote." }, { status: 400 });
    const amountCents = Math.round(Number(amountRaw) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0)
      return NextResponse.json({ ok: false, error: "Amount must be a positive number." }, { status: 400 });

    const sb = getServiceSupabase();

    const now = new Date().toISOString();
    const { data: report, error: repErr } = await sb
      .from("reports")
      .insert({
        service_name: serviceName,
        category,
        amount_cents: amountCents,
        amount_note: amountNote,
        report_type: reportType,
        town,
        service_date: serviceDate,
        notes,
        submitter_email: submitterEmail,
        // A source document is required, so entries publish immediately
        // as verified. Takedowns happen via /admin if abuse appears.
        verification_status: "verified",
        moderated_at: now,
      })
      .select("id")
      .single();
    if (repErr) throw repErr;

    // Invoice upload is required — it is the verification.
    const invoice = form.get("invoice");
    if (!(invoice instanceof File) || invoice.size === 0) {
      // Roll back the published report: no document, no entry.
      await sb.from("reports").delete().eq("id", report.id);
      return NextResponse.json(
        { ok: false, error: "A quote or invoice document is required." },
        { status: 400 }
      );
    }
    if (invoice.size > MAX_INVOICE_BYTES) {
      await sb.from("reports").delete().eq("id", report.id);
      return NextResponse.json({ ok: false, error: "Invoice file must be under 8 MB." }, { status: 400 });
    }
    const ext = invoice.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${report.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage
      .from("invoices")
      .upload(path, invoice, { contentType: invoice.type || "application/octet-stream" });
    if (upErr) {
      await sb.from("reports").delete().eq("id", report.id);
      throw upErr;
    }
    const { error: verErr } = await sb
      .from("verifications")
      .insert({ report_id: report.id, invoice_path: path });
    if (verErr) throw verErr;

    return NextResponse.json({ ok: true, id: report.id });
  } catch (err) {
    console.error("submit error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
