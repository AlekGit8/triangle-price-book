import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { siteConfig } from "@/lib/site-config";

const MAX_INVOICE_BYTES = 8 * 1024 * 1024; // 8 MB

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Turnstile not configured -> skip verification
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip ?? "" }),
    });
    const json = await res.json();
    return json.success === true;
  } catch {
    return false;
  }
}

/**
 * POST /api/submit — accepts the /submit form.
 * Inserts the report UNVERIFIED + UNMODERATED (invisible until a moderator
 * approves it), optionally uploads an invoice to the private bucket and
 * links a verification row. Uses the service role server-side so the
 * browser never needs elevated keys.
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
    const businessName = String(form.get("businessName") ?? "").trim();
    const town = String(form.get("town") ?? "").trim();
    const amountNote = String(form.get("amountNote") ?? "").trim() || null;
    const serviceDate = String(form.get("serviceDate") ?? "").trim() || null;
    const notes = String(form.get("notes") ?? "").trim() || null;
    const submitterEmail = String(form.get("submitterEmail") ?? "").trim() || null;

    if (!siteConfig.categories.includes(category as never))
      return NextResponse.json({ ok: false, error: "Invalid category." }, { status: 400 });
    if (!serviceName || !businessName || !town)
      return NextResponse.json({ ok: false, error: "Service, business, and town are required." }, { status: 400 });
    if (!["paid", "quote"].includes(reportType))
      return NextResponse.json({ ok: false, error: "Report type must be paid or quote." }, { status: 400 });
    const amountCents = Math.round(Number(amountRaw) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0)
      return NextResponse.json({ ok: false, error: "Amount must be a positive number." }, { status: 400 });

    const sb = getServiceSupabase();

    // Find-or-create the business (case-insensitive) for aggregate stats.
    let businessId: string | null = null;
    const { data: existing } = await sb
      .from("businesses")
      .select("id")
      .ilike("name", businessName)
      .limit(1)
      .maybeSingle();
    if (existing) {
      businessId = existing.id;
    } else {
      const { data: created, error: bizErr } = await sb
        .from("businesses")
        .insert({ name: businessName, category })
        .select("id")
        .single();
      if (bizErr) throw bizErr;
      businessId = created.id;
    }

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
        business_id: businessId,
        submitter_email: submitterEmail,
        verification_status: "unverified",
        moderated_at: null, // sits in the moderation queue until approved
      })
      .select("id")
      .single();
    if (repErr) throw repErr;

    // Optional invoice upload -> private bucket + verification row.
    const invoice = form.get("invoice");
    if (invoice instanceof File && invoice.size > 0) {
      if (invoice.size > MAX_INVOICE_BYTES)
        return NextResponse.json({ ok: false, error: "Invoice file must be under 8 MB." }, { status: 400 });
      const ext = invoice.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${report.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage
        .from("invoices")
        .upload(path, invoice, { contentType: invoice.type || "application/octet-stream" });
      if (upErr) throw upErr;
      const { error: verErr } = await sb
        .from("verifications")
        .insert({ report_id: report.id, invoice_path: path });
      if (verErr) throw verErr;
    }

    return NextResponse.json({ ok: true, id: report.id });
  } catch (err) {
    console.error("submit error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
