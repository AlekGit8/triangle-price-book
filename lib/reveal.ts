/**
 * Paid business-name reveals — shared server-side helpers.
 * SERVER ONLY: uses the service-role client (it reads the
 * report_business_names table, which RLS hides from the public).
 * Never import this file into client components.
 *
 * Requires worker env: STRIPE_SECRET_KEY (checkout sessions) and
 * STRIPE_WEBHOOK_SECRET (webhook signature verification). Env vars are
 * per-environment: the beta scope uses test keys, Production uses live
 * keys. (Previews Base values do not reach the beta preview.)
 */
import { getServiceSupabase } from "./supabase-server";

export const SINGLE_CENTS = 199;
export const ALL_CENTS = 499;

export type RevealType = "single" | "all";

export interface RevealPurchase {
  id: string;
  type: RevealType;
  report_id: string | null;
  token: string;
  stripe_session_id: string;
  amount_cents: number;
  created_at: string;
}

/** Unpredictable list-page key (256 bits, base64url). */
export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The stored business name for a report (service role only). */
export async function getBusinessName(reportId: string): Promise<string | null> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("report_business_names")
    .select("business_name")
    .eq("report_id", reportId)
    .maybeSingle();
  if (error || !data) return null;
  return data.business_name as string;
}

export async function getPurchaseByToken(token: string): Promise<RevealPurchase | null> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("reveal_purchases")
    .select("id, type, report_id, token, stripe_session_id, amount_cents, created_at")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  return data as RevealPurchase;
}

export async function getPurchaseBySession(sessionId: string): Promise<RevealPurchase | null> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("reveal_purchases")
    .select("id, type, report_id, token, stripe_session_id, amount_cents, created_at")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (error || !data) return null;
  return data as RevealPurchase;
}

/**
 * Record a completed purchase. Idempotent on stripe_session_id: the
 * webhook and the success-page activation both call this, and whichever
 * lands second is a no-op. Returns the purchase row.
 */
export async function recordPurchase(args: {
  type: RevealType;
  reportId: string | null;
  sessionId: string;
  amountCents: number;
}): Promise<RevealPurchase> {
  const sb = getServiceSupabase();
  const existing = await getPurchaseBySession(args.sessionId);
  if (existing) return existing;
  const { data, error } = await sb
    .from("reveal_purchases")
    .insert({
      type: args.type,
      report_id: args.reportId,
      token: generateToken(),
      stripe_session_id: args.sessionId,
      amount_cents: args.amountCents,
    })
    .select("id, type, report_id, token, stripe_session_id, amount_cents, created_at")
    .single();
  if (error || !data) {
    // Lost race with the other fulfiller — re-read instead of failing.
    const retry = await getPurchaseBySession(args.sessionId);
    if (retry) return retry;
    throw new Error(`Failed to record reveal purchase: ${error?.message ?? "unknown"}`);
  }
  return data as RevealPurchase;
}

/* ---------------- Stripe via plain fetch (no SDK dependency) ---------------- */

function stripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return key;
}

export interface CheckoutSession {
  id: string;
  url: string;
  payment_status: string;
  amount_total: number;
  metadata: Record<string, string>;
}

export async function createRevealCheckout(args: {
  origin: string;
  type: RevealType;
  reportId: string | null;
  reportLabel: string;
  cancelUrl: string;
}): Promise<CheckoutSession> {
  const amount = args.type === "single" ? SINGLE_CENTS : ALL_CENTS;
  const name =
    args.type === "single"
      ? `See who did this work — ${args.reportLabel}`
      : "See who did the work — all verified listings (one-time)";
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${args.origin}/reveal/success?session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", args.cancelUrl);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(amount));
  params.set("line_items[0][price_data][product_data][name]", name);
  params.set("metadata[reveal_type]", args.type);
  if (args.reportId) params.set("metadata[report_id]", args.reportId);
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });
  const json = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !json.id || !json.url) {
    throw new Error(json.error?.message ?? "Stripe checkout failed");
  }
  return { id: json.id, url: json.url, payment_status: "unpaid", amount_total: 0, metadata: {} };
}

export async function getCheckoutSession(sessionId: string): Promise<CheckoutSession> {
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${stripeKey()}` },
    cache: "no-store",
  });
  const json = (await res.json()) as {
    id?: string;
    payment_status?: string;
    amount_total?: number;
    metadata?: Record<string, string>;
    error?: { message?: string };
  };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message ?? "Stripe session lookup failed");
  }
  return {
    id: json.id,
    url: "",
    payment_status: json.payment_status ?? "",
    amount_total: json.amount_total ?? 0,
    metadata: json.metadata ?? {},
  };
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify a Stripe webhook signature (same scheme the Stripe SDK uses):
 * header "t=<timestamp>,v1=<hmac>", HMAC-SHA256 of "<t>.<payload>".
 * Rejects stale timestamps (>5 min) like Stripe does.
 */
export async function verifyStripeWebhook(
  payload: string,
  header: string | null
): Promise<boolean> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const t = header.match(/(?:^|,)t=([^,]+)/)?.[1];
  const v1s = [...header.matchAll(/(?:^|,)v1=([^,]+)/g)].map((m) => m[1]);
  if (!t || v1s.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = hex(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${t}.${payload}`)
    )
  );
  return v1s.some((v) => v.length === sig.length && v === sig);
}
