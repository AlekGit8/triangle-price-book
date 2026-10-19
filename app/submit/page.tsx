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

type ExtractState = "idle" | "reading" | "done" | "error" | "unavailable";

interface FormFields {
  category: string;
  serviceName: string;
  amount: string;
  amountNote: string;
  reportType: "paid" | "quote";
  town: string;
  serviceDate: string;
  notes: string;
  submitterEmail: string;
}

const emptyFields: FormFields = {
  category: "HVAC",
  serviceName: "",
  amount: "",
  amountNote: "",
  reportType: "paid",
  town: "",
  serviceDate: "",
  notes: "",
  submitterEmail: "",
};

export default function SubmitPage() {
  const [fields, setFields] = useState<FormFields>(emptyFields);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [extractState, setExtractState] = useState<ExtractState>("idle");
  const [extractMsg, setExtractMsg] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const docInputRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  /** Upload-first flow: send the document to /api/extract, pre-fill the form. */
  async function handleDocChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFile(file);
    setExtractState("reading");
    setExtractMsg("");
    try {
      const form = new FormData();
      form.set("document", file);
      if (turnstileSiteKey && window.turnstile) {
        form.set("turnstileToken", window.turnstile.getResponse() || "");
      }
      const res = await fetch("/api/extract", { method: "POST", body: form });
      const json = await res.json();
      if (res.status === 501 && json.error === "not_configured") {
        // AI extraction not set up yet — the file is still attached as the
        // invoice for manual submission.
        setExtractState("unavailable");
        return;
      }
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not read the document.");
      const f = json.fields as Record<string, string | number | null>;
      setFields((prev) => ({
        ...prev,
        category: typeof f.category === "string" ? f.category : prev.category,
        serviceName: typeof f.serviceName === "string" ? f.serviceName : prev.serviceName,
        amount: typeof f.amount === "number" ? String(f.amount) : prev.amount,
        amountNote: typeof f.amountNote === "string" ? f.amountNote : prev.amountNote,
        reportType: f.reportType === "quote" ? "quote" : "paid",
        town: typeof f.town === "string" ? f.town : prev.town,
        serviceDate: typeof f.serviceDate === "string" ? f.serviceDate : prev.serviceDate,
        notes: typeof f.notes === "string" ? f.notes : prev.notes,
      }));
      setExtractState("done");
    } catch (err) {
      setExtractState("error");
      setExtractMsg(err instanceof Error ? err.message : "Could not read the document.");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    try {
      const form = new FormData();
      form.set("category", fields.category);
      form.set("serviceName", fields.serviceName.trim());
      form.set("amount", fields.amount.trim());
      form.set("amountNote", fields.amountNote.trim());
      form.set("reportType", fields.reportType);
      form.set("town", fields.town.trim());
      form.set("serviceDate", fields.serviceDate);
      form.set("notes", fields.notes.trim());
      form.set("submitterEmail", fields.submitterEmail.trim());
      if (docFile) form.set("invoice", docFile);
      if (turnstileSiteKey && window.turnstile) {
        form.set("turnstileToken", window.turnstile.getResponse() || "");
      }
      const res = await fetch("/api/submit", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Submission failed");
      setStatus("done");
      setFields(emptyFields);
      setDocFile(null);
      if (docInputRef.current) docInputRef.current.value = "";
      if (turnstileSiteKey && window.turnstile) window.turnstile.reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Submission failed");
    }
  }

  if (status === "done") {
    return (
      <div className="py-16 max-w-xl mx-auto text-center">
        <h1 className="text-3xl font-extrabold text-brand-900">Published!</h1>
        <p className="mt-3 text-stone-600">
          Your price is live — anonymously, with a Verified badge thanks to your
          uploaded document. Thank you for contributing.
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
        Upload a photo or PDF of your quote or invoice — <strong>required</strong>.
        We’ll fill in the details, you review them, and your price publishes
        instantly with a Verified badge.
      </p>

      {/* Smart upload card */}
      <div className="mt-6 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 p-5">
        <input
          ref={docInputRef}
          id="docUpload"
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleDocChange}
        />
        <label
          htmlFor="docUpload"
          className="flex cursor-pointer flex-col items-center gap-2 py-2 text-center"
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-700 text-2xl text-white">
            {extractState === "reading" ? "…" : "📄"}
          </span>
          <span className="font-bold text-brand-900">
            {docFile ? docFile.name : "Upload a quote or invoice (required)"}
          </span>
          <span className="text-sm text-stone-600">
            {extractState === "reading"
              ? "Reading your document…"
              : "Photo or PDF — we’ll extract the details automatically"}
          </span>
        </label>

        {extractState === "done" && (
          <p className="mt-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800 text-center">
            ✓ Details extracted — please review them below before submitting.
          </p>
        )}
        {extractState === "error" && (
          <p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800 text-center">
            {extractMsg} Your file is still attached — just fill in the form manually.
          </p>
        )}
        {extractState === "unavailable" && (
          <p className="mt-2 rounded-lg bg-stone-100 border border-stone-200 px-4 py-2 text-sm text-stone-600 text-center">
            Your file is attached. Auto-fill isn’t enabled yet — fill in the form below.
          </p>
        )}
        {docFile && extractState !== "reading" && (
          <p className="mt-2 text-xs text-stone-500 text-center">
            Attached as your proof — it publishes with a Verified badge. Files stay private.
          </p>
        )}
      </div>

      <div className="my-6 flex items-center gap-3 text-sm text-stone-400">
        <span className="h-px flex-1 bg-stone-200" />
        or fill in manually
        <span className="h-px flex-1 bg-stone-200" />
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className={labelCls} htmlFor="category">Category *</label>
          <select
            id="category" required className={inputCls}
            value={fields.category} onChange={(e) => set("category", e.target.value)}
          >
            {siteConfig.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="serviceName">Service description *</label>
          <input
            id="serviceName" required className={inputCls}
            placeholder="e.g. Tankless water heater install (Rinnai RX199)"
            maxLength={120}
            value={fields.serviceName} onChange={(e) => set("serviceName", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="amount">Amount (USD) *</label>
            <input
              id="amount" required className={inputCls}
              inputMode="decimal" placeholder="5253.36"
              pattern="^\d+(\.\d{1,2})?$"
              title="Numbers only, e.g. 5253.36"
              value={fields.amount} onChange={(e) => set("amount", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="amountNote">Amount note</label>
            <input
              id="amountNote" className={inputCls}
              placeholder="e.g. + tax" maxLength={20}
              value={fields.amountNote} onChange={(e) => set("amountNote", e.target.value)}
            />
          </div>
        </div>

        <div>
          <span className={labelCls}>Was this paid or a quote? *</span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-stone-700">
              <input
                type="radio" name="reportType" value="paid"
                checked={fields.reportType === "paid"}
                onChange={() => set("reportType", "paid")}
                className="accent-green-700"
              /> Paid
            </label>
            <label className="flex items-center gap-2 text-stone-700">
              <input
                type="radio" name="reportType" value="quote"
                checked={fields.reportType === "quote"}
                onChange={() => set("reportType", "quote")}
                className="accent-green-700"
              /> Quote
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="town">Town *</label>
            <input
              id="town" required className={inputCls}
              placeholder="e.g. Fuquay-Varina" maxLength={80}
              value={fields.town} onChange={(e) => set("town", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="serviceDate">Date of service / quote</label>
            <input
              id="serviceDate" type="date" className={inputCls}
              value={fields.serviceDate} onChange={(e) => set("serviceDate", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="notes">Notes</label>
          <textarea
            id="notes" rows={3} className={inputCls}
            placeholder="Anything useful: scope of work, same-day service, quote declined…" maxLength={500}
            value={fields.notes} onChange={(e) => set("notes", e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="submitterEmail">Email (optional, private)</label>
          <input
            id="submitterEmail" type="email" className={inputCls}
            placeholder="Only used if we need to verify your entry" maxLength={120}
            value={fields.submitterEmail} onChange={(e) => set("submitterEmail", e.target.value)}
          />
          <p className="mt-1 text-xs text-stone-500">
            Uploading a document above attaches it as your invoice automatically.
          </p>
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
          disabled={status === "sending" || !docFile}
          className="w-full rounded-full bg-brand-700 px-6 py-3 font-bold text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {status === "sending" ? "Publishing…" : "Review above, then publish"}
        </button>
        {!docFile && (
          <p className="-mt-2 text-xs text-amber-700 text-center">
            Upload your quote or invoice above to enable publishing.
          </p>
        )}
        <p className="text-xs text-stone-500 text-center">
          Your price publishes instantly and anonymously with a Verified badge.
        </p>
      </form>
    </div>
  );
}
