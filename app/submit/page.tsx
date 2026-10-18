"use client";

import { useRef, useState } from "react";
import Script from "next/script";
import { siteConfig } from "@/lib/site-config";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

declare global {
  interface Window {
    turnstile?: { getResponse: (id?: string) => string; reset: (id?: string) => void };
  }
}

const inputCls =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-brand-600 focus:outline-none";
const labelCls = "block text-sm font-semibold text-stone-700 mb-1";

export default function SubmitPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    try {
      const form = new FormData(formRef.current!);
      // Attach Turnstile token when the widget is enabled.
      if (turnstileSiteKey && window.turnstile) {
        form.set("turnstileToken", window.turnstile.getResponse() || "");
      }
      const res = await fetch("/api/submit", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Submission failed");
      setStatus("done");
      formRef.current?.reset();
      if (turnstileSiteKey && window.turnstile) window.turnstile.reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Submission failed");
    }
  }

  if (status === "done") {
    return (
      <div className="py-16 max-w-xl mx-auto text-center">
        <h1 className="text-3xl font-extrabold text-brand-900">Thank you!</h1>
        <p className="mt-3 text-stone-600">
          Your price is in the moderation queue. Once reviewed it will appear
          anonymously — your identity and the business name stay private.
        </p>
        <a href="/browse" className="mt-6 inline-block font-semibold text-brand-700 hover:underline">
          Browse prices →
        </a>
      </div>
    );
  }

  return (
    <div className="py-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-extrabold text-brand-900">Submit a price</h1>
      <p className="mt-2 text-stone-600">
        Share what you paid or were quoted. Individual entries never name the
        business — the business name is used only for aggregate statistics.
      </p>

      <form ref={formRef} onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label className={labelCls} htmlFor="category">Category *</label>
          <select id="category" name="category" required className={inputCls} defaultValue="HVAC">
            {siteConfig.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="serviceName">Service description *</label>
          <input
            id="serviceName" name="serviceName" required className={inputCls}
            placeholder="e.g. Tankless water heater install (Rinnai RX199)"
            maxLength={120}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="amount">Amount (USD) *</label>
            <input
              id="amount" name="amount" required className={inputCls}
              inputMode="decimal" placeholder="5253.36"
              pattern="^\d+(\.\d{1,2})?$"
              title="Numbers only, e.g. 5253.36"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="amountNote">Amount note</label>
            <input
              id="amountNote" name="amountNote" className={inputCls}
              placeholder="e.g. + tax" maxLength={20}
            />
          </div>
        </div>

        <div>
          <span className={labelCls}>Was this paid or a quote? *</span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-stone-700">
              <input type="radio" name="reportType" value="paid" defaultChecked className="accent-green-700" /> Paid
            </label>
            <label className="flex items-center gap-2 text-stone-700">
              <input type="radio" name="reportType" value="quote" className="accent-green-700" /> Quote
            </label>
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="businessName">Business name *</label>
          <input
            id="businessName" name="businessName" required className={inputCls}
            placeholder="e.g. Michael & Son"
            maxLength={120}
          />
          <p className="mt-1 text-xs text-stone-500">
            Used only for aggregate statistics — never shown on individual entries.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="town">Town *</label>
            <input
              id="town" name="town" required className={inputCls}
              placeholder="e.g. Fuquay-Varina" maxLength={80}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="serviceDate">Date of service / quote</label>
            <input id="serviceDate" name="serviceDate" type="date" className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="notes">Notes</label>
          <textarea
            id="notes" name="notes" rows={3} className={inputCls}
            placeholder="Anything useful: scope of work, same-day service, quote declined…" maxLength={500}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="invoice">Invoice / receipt (optional)</label>
          <input
            id="invoice" name="invoice" type="file" accept="image/*,.pdf"
            className="text-sm text-stone-600"
          />
          <p className="mt-1 text-xs text-stone-500">
            Uploading an invoice earns a “Verified” badge. Files stay private — only moderators see them.
          </p>
        </div>

        <div>
          <label className={labelCls} htmlFor="submitterEmail">Email (optional, private)</label>
          <input
            id="submitterEmail" name="submitterEmail" type="email" className={inputCls}
            placeholder="Only used if we need to verify your entry" maxLength={120}
          />
        </div>

        {/* Cloudflare Turnstile: renders only when a site key is configured. */}
        {turnstileSiteKey && (
          <>
            <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
            <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />
          </>
        )}

        <label className="flex items-start gap-2 text-sm text-stone-600">
          <input type="checkbox" required className="mt-1 accent-green-700" />
          <span>
            I confirm this price is truthful to the best of my knowledge, and I agree to the{" "}
            <a href="/terms" className="font-semibold text-brand-700 hover:underline">Terms of Service</a>.
          </span>
        </label>

        {status === "error" && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-full bg-brand-700 px-6 py-3 font-bold text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {status === "sending" ? "Submitting…" : "Submit for review"}
        </button>
        <p className="text-xs text-stone-500 text-center">
          Submissions enter a moderation queue and are published anonymously after review.
        </p>
      </form>
    </div>
  );
}
