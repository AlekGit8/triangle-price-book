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
  "w-full rounded-[10px] border border-line px-3 py-2 text-ink placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 disabled:bg-card disabled:text-muted";
const labelCls = "block font-mono text-xs font-semibold uppercase tracking-wide text-muted mb-1";

type ExtractState = "idle" | "reading" | "done" | "error" | "rejected" | "unavailable";

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

type DraftStatus = "pending" | "publishing" | "done" | "error";

interface DraftQuote {
  key: string;
  category: string;
  serviceName: string;
  amount: string;
  amountNote: string;
  reportType: "paid" | "quote";
  town: string;
  serviceDate: string;
  notes: string;
  status: DraftStatus;
  errorMsg: string;
}

function draftFromAI(key: string, q: Record<string, unknown>): DraftQuote {
  return {
    key,
    category: typeof q.category === "string" ? q.category : "HVAC",
    serviceName: typeof q.serviceName === "string" ? q.serviceName : "",
    amount: typeof q.amount === "number" ? String(q.amount) : "",
    amountNote: typeof q.amountNote === "string" ? q.amountNote : "",
    reportType: q.reportType === "quote" ? "quote" : "paid",
    town: typeof q.town === "string" ? q.town : "",
    serviceDate: typeof q.serviceDate === "string" ? q.serviceDate : "",
    notes: typeof q.notes === "string" ? q.notes : "",
    status: "pending",
    errorMsg: "",
  };
}

function DraftCard({
  draft,
  agreed,
  onChange,
  onRemove,
  onPublish,
}: {
  draft: DraftQuote;
  agreed: boolean;
  onChange: (key: string, patch: Partial<DraftQuote>) => void;
  onRemove: (key: string) => void;
  onPublish: (key: string) => void;
}) {
  const d = draft;
  const locked = d.status === "publishing" || d.status === "done";
  const set = (patch: Partial<DraftQuote>) => onChange(d.key, patch);
  const id = (name: string) => `draft-${d.key}-${name}`;

  return (
    <div
      className={`rounded-2xl border bg-white p-4 sm:p-5 ${
        d.status === "done" ? "border-green-300" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-ink">
          {d.serviceName || "Untitled quote"}
          {d.amount && (
            <span className="ml-2 font-mono font-bold text-ink">${d.amount}</span>
          )}
        </p>
        {d.status === "pending" && (
          <button
            type="button"
            onClick={() => onRemove(d.key)}
            aria-label="Remove this quote"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-card hover:text-ink"
          >
            ×
          </button>
        )}
      </div>

      {d.status === "done" ? (
        <p className="mt-3 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
          ✓ Published — live and anonymous with a Verified badge.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          <div>
            <label className={labelCls} htmlFor={id("service")}>Service description *</label>
            <input
              id={id("service")} className={inputCls} maxLength={120}
              disabled={locked}
              value={d.serviceName}
              onChange={(e) => set({ serviceName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor={id("category")}>Category *</label>
              <select
                id={id("category")} className={inputCls}
                disabled={locked}
                value={d.category}
                onChange={(e) => set({ category: e.target.value })}
              >
                {siteConfig.categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor={id("type")}>Paid or quote? *</label>
              <select
                id={id("type")} className={inputCls}
                disabled={locked}
                value={d.reportType}
                onChange={(e) => set({ reportType: e.target.value as "paid" | "quote" })}
              >
                <option value="paid">Paid</option>
                <option value="quote">Quote</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor={id("amount")}>Amount (USD) *</label>
              <input
                id={id("amount")} className={inputCls} inputMode="decimal"
                pattern="^\d+(\.\d{1,2})?$" title="Numbers only, e.g. 5253.36"
                disabled={locked}
                value={d.amount}
                onChange={(e) => set({ amount: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor={id("amountNote")}>Amount note</label>
              <input
                id={id("amountNote")} className={inputCls} maxLength={20}
                placeholder="e.g. + tax"
                disabled={locked}
                value={d.amountNote}
                onChange={(e) => set({ amountNote: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor={id("town")}>Town *</label>
              <input
                id={id("town")} className={inputCls} maxLength={80}
                placeholder="e.g. Fuquay-Varina"
                disabled={locked}
                value={d.town}
                onChange={(e) => set({ town: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor={id("date")}>Date</label>
              <input
                id={id("date")} type="date" className={inputCls}
                disabled={locked}
                value={d.serviceDate}
                onChange={(e) => set({ serviceDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor={id("notes")}>Notes</label>
            <textarea
              id={id("notes")} rows={2} className={inputCls} maxLength={500}
              placeholder="Scope of work, same-day service…"
              disabled={locked}
              value={d.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </div>

          {d.status === "error" && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">
              {d.errorMsg}
            </p>
          )}

          <button
            type="button"
            disabled={locked || !agreed}
            onClick={() => onPublish(d.key)}
            title={!agreed ? "Please confirm the truthfulness checkbox below first" : undefined}
            className="w-full rounded-[10px] bg-black px-6 py-2.5 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {d.status === "publishing" ? "Publishing…" : "Publish this quote"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function SubmitPage() {
  const [fields, setFields] = useState<FormFields>(emptyFields);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [extractState, setExtractState] = useState<ExtractState>("idle");
  const [extractMsg, setExtractMsg] = useState("");
  const [extractCount, setExtractCount] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [submittedVerified, setSubmittedVerified] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Multi-quote drafts from an uploaded document.
  const [drafts, setDrafts] = useState<DraftQuote[]>([]);
  const [draftEmail, setDraftEmail] = useState("");
  const [draftsAgreed, setDraftsAgreed] = useState(false);
  const [publishingAll, setPublishingAll] = useState(false);

  const docInputRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function updateDraft(key: string, patch: Partial<DraftQuote>) {
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function removeDraft(key: string) {
    setDrafts((ds) => ds.filter((d) => d.key !== key));
  }

  function resetUpload() {
    setDocFile(null);
    setDrafts([]);
    setExtractState("idle");
    setExtractMsg("");
    setExtractCount(0);
    if (docInputRef.current) docInputRef.current.value = "";
  }

  /** Upload-first flow: send the document to /api/extract, get back one draft per quote found. */
  async function handleDocChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // A new document replaces any previous drafts.
    setDrafts([]);
    setExtractCount(0);
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
      if (res.status === 422 && json.error === "rejected") {
        // Document failed the relevance check — do not attach it.
        setDocFile(null);
        if (docInputRef.current) docInputRef.current.value = "";
        setExtractState("rejected");
        setExtractMsg(
          typeof json.reason === "string"
            ? json.reason
            : "This document doesn't look like a home-services quote or invoice."
        );
        return;
      }
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not read the document.");
      const quotes = Array.isArray(json.quotes) ? json.quotes : [];
      setDrafts(
        quotes.map((q: Record<string, unknown>) =>
          draftFromAI(
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : String(Math.random()),
            q
          )
        )
      );
      setExtractCount(quotes.length);
      setExtractState("done");
    } catch (err) {
      setExtractState("error");
      setExtractMsg(err instanceof Error ? err.message : "Could not read the document.");
      // Reset the input so the user can retry the same file.
      if (docInputRef.current) docInputRef.current.value = "";
      setDocFile(null);
    }
  }

  /** Publish one or more drafts; the uploaded document verifies all of them. */
  async function publishDraftBatch(items: DraftQuote[]) {
    const form = new FormData();
    form.set(
      "reports",
      JSON.stringify(
        items.map((d) => ({
          category: d.category,
          serviceName: d.serviceName.trim(),
          amount: d.amount.trim(),
          amountNote: d.amountNote.trim(),
          reportType: d.reportType,
          town: d.town.trim(),
          serviceDate: d.serviceDate,
          notes: d.notes.trim(),
        }))
      )
    );
    form.set("submitterEmail", draftEmail.trim());
    if (docFile) form.set("invoice", docFile);
    if (turnstileSiteKey && window.turnstile) {
      form.set("turnstileToken", window.turnstile.getResponse() || "");
    }
    const res = await fetch("/api/submit", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error ?? "Submission failed");
    if (turnstileSiteKey && window.turnstile) window.turnstile.reset();
  }

  function draftValid(d: DraftQuote): string | null {
    if (!d.serviceName.trim() || !d.amount.trim() || !d.town.trim())
      return "Service, amount, and town are required.";
    if (!/^\d+(\.\d{1,2})?$/.test(d.amount.trim()))
      return "Amount must be a number, e.g. 5253.36.";
    return null;
  }

  async function publishOne(key: string) {
    const d = drafts.find((x) => x.key === key);
    if (!d || d.status !== "pending") return;
    const invalid = draftValid(d);
    if (invalid) {
      updateDraft(key, { status: "error", errorMsg: invalid });
      return;
    }
    updateDraft(key, { status: "publishing", errorMsg: "" });
    try {
      await publishDraftBatch([d]);
      updateDraft(key, { status: "done" });
    } catch (err) {
      updateDraft(key, {
        status: "error",
        errorMsg: err instanceof Error ? err.message : "Submission failed",
      });
    }
  }

  async function publishAll() {
    const pending = drafts.filter((d) => d.status === "pending");
    if (pending.length === 0) return;
    for (const d of pending) {
      const invalid = draftValid(d);
      if (invalid) {
        updateDraft(d.key, { status: "error", errorMsg: invalid });
        return;
      }
    }
    setPublishingAll(true);
    setDrafts((ds) =>
      ds.map((d) => (d.status === "pending" ? { ...d, status: "publishing" as const, errorMsg: "" } : d))
    );
    try {
      await publishDraftBatch(pending);
      setDrafts((ds) =>
        ds.map((d) => (d.status === "publishing" ? { ...d, status: "done" as const } : d))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setDrafts((ds) =>
        ds.map((d) =>
          d.status === "publishing" ? { ...d, status: "error" as const, errorMsg: msg } : d
        )
      );
    } finally {
      setPublishingAll(false);
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
      setSubmittedVerified(json.verified !== false);
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
        <h1 className="font-serif text-4xl text-ink">Published!</h1>
        <p className="mt-3 text-muted">
          {submittedVerified ? (
            <>
              Your price is live — anonymously, with a Verified badge thanks to
              your uploaded document. Thank you for contributing.
            </>
          ) : (
            <>
              Your price is live — anonymously, as an unverified community
              report. Thank you for contributing. (Uploading a document next
              time earns a Verified badge.)
            </>
          )}
        </p>
        <a href="/browse" className="mt-6 inline-block font-semibold text-ink hover:underline">
          Browse prices →
        </a>
      </div>
    );
  }

  const pendingCount = drafts.filter((d) => d.status === "pending").length;
  const doneCount = drafts.filter((d) => d.status === "done").length;

  return (
    <div className="py-10 max-w-2xl mx-auto">
      <h1 className="font-serif text-4xl text-ink">Submit a price</h1>
      <p className="mt-2 text-muted">
        Two ways to contribute. <strong>Uploading</strong> a quote or invoice
        gets your entries Verified badges — and if your document contains
        multiple quotes, each one becomes its own entry. A manual entry still
        helps your neighbors.
      </p>

      {/* Option 1: smart upload card */}
      <p className="mt-6 font-mono text-xs font-bold uppercase tracking-wide text-muted">
        Option 1 · Upload a document (preferred)
      </p>
      <div className="mt-2 rounded-2xl border-2 border-dashed border-line bg-card p-5 focus-within:border-black focus-within:ring-2 focus-within:ring-black/10">
        <input
          ref={docInputRef}
          id="docUpload"
          type="file"
          accept="image/*,.pdf"
          className="sr-only"
          onChange={handleDocChange}
        />
        <label
          htmlFor="docUpload"
          className="flex cursor-pointer flex-col items-center gap-2 py-2 text-center"
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black text-2xl text-white">
            {extractState === "reading" ? "…" : "📄"}
          </span>
          <span className="font-bold text-ink">
            {docFile ? docFile.name : "Upload a quote or invoice"}
          </span>
          <span className="text-sm text-muted">
            {extractState === "reading"
              ? "Reading your document…"
              : "Photo or PDF — we’ll pull out every quote it contains"}
          </span>
        </label>

        {extractState === "done" && (
          <p className="mt-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800 text-center">
            ✓ {extractCount} quote{extractCount === 1 ? "" : "s"} detected — review
            {extractCount === 1 ? "" : " each"} below, then publish.
          </p>
        )}
        {extractState === "error" && (
          <p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800 text-center">
            {extractMsg} Please try uploading again.
          </p>
        )}
        {extractState === "rejected" && (
          <p className="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800 text-center">
            {extractMsg}
          </p>
        )}
        {extractState === "unavailable" && (
          <p className="mt-2 rounded-lg bg-card border border-line px-4 py-2 text-sm text-muted text-center">
            Your file is attached. Auto-fill isn’t enabled yet — fill in the form below.
          </p>
        )}
        {docFile && extractState !== "reading" && (
          <p className="mt-2 text-xs text-muted text-center">
            Attached as proof — entries publish with Verified badges. Files stay private.
          </p>
        )}
      </div>

      {/* Detected quotes: review & publish each */}
      {drafts.length > 0 && (
        <div className="mt-6">
          <p className="font-mono text-xs font-bold uppercase tracking-wide text-muted">
            Review & publish
          </p>
          <p className="mt-1 text-sm text-muted">
            Each quote below publishes as its own anonymous entry, all verified
            against your uploaded document.
          </p>

          {doneCount === drafts.length && (
            <div className="mt-4 rounded-xl border border-green-300 bg-green-50 p-5 text-center">
              <p className="font-bold text-green-900">
                All {drafts.length} published! Thank you for contributing.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={resetUpload}
                  className="rounded-full border border-green-700 px-5 py-2 text-sm font-semibold text-green-900 hover:bg-green-100"
                >
                  Upload another document
                </button>
                <a
                  href="/browse"
                  className="rounded-[10px] bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  Browse prices →
                </a>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-4">
            {drafts.map((d) => (
              <DraftCard
                key={d.key}
                draft={d}
                agreed={draftsAgreed}
                onChange={updateDraft}
                onRemove={removeDraft}
                onPublish={publishOne}
              />
            ))}
          </div>

          {pendingCount > 0 && (
            <div className="mt-4 rounded-2xl border border-line bg-white p-4 sm:p-5">
              <div>
                <label className={labelCls} htmlFor="draftEmail">
                  Email (optional, private)
                </label>
                <input
                  id="draftEmail"
                  type="email"
                  className={inputCls}
                  placeholder="Only used if we need to verify an entry"
                  maxLength={120}
                  value={draftEmail}
                  onChange={(e) => setDraftEmail(e.target.value)}
                />
              </div>
              <label className="mt-4 flex items-start gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  className="mt-1 accent-black"
                  checked={draftsAgreed}
                  onChange={(e) => setDraftsAgreed(e.target.checked)}
                />
                <span>
                  I confirm these prices are truthful to the best of my knowledge,
                  and I agree to the{" "}
                  <a href="/terms" className="font-semibold text-ink hover:underline">
                    Terms of Service
                  </a>
                  .
                </span>
              </label>
              <button
                type="button"
                disabled={!draftsAgreed || publishingAll || pendingCount === 0}
                onClick={publishAll}
                className="mt-4 w-full rounded-[10px] bg-black px-6 py-3 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {publishingAll
                  ? "Publishing…"
                  : `Publish all ${pendingCount} quote${pendingCount === 1 ? "" : "s"}`}
              </button>
              {!draftsAgreed && (
                <p className="mt-2 text-xs text-muted text-center">
                  Please confirm the checkbox above to publish.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="my-6 flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-line" />
        <span className="text-center">
          <span className="font-bold uppercase tracking-wide text-muted">Option 2 · </span>
          no document? Fill in the form — it publishes as an unverified community report
        </span>
        <span className="h-px flex-1 bg-line" />
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
            <label className="flex items-center gap-2 text-ink">
              <input
                type="radio" name="reportType" value="paid"
                checked={fields.reportType === "paid"}
                onChange={() => set("reportType", "paid")}
                className="accent-black"
              /> Paid
            </label>
            <label className="flex items-center gap-2 text-ink">
              <input
                type="radio" name="reportType" value="quote"
                checked={fields.reportType === "quote"}
                onChange={() => set("reportType", "quote")}
                className="accent-black"
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
          <p className="mt-1 text-xs text-muted">
            Uploading a document above attaches it as your invoice automatically.
          </p>
        </div>

        {/* Cloudflare Turnstile: renders only when a site key is configured. */}
        {turnstileSiteKey && (
          <>
            <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
            <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-action="submit" />
          </>
        )}

        <label className="flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" required className="mt-1 accent-black" />
          <span>
            I confirm this price is truthful to the best of my knowledge, and I agree to the{" "}
            <a href="/terms" className="font-semibold text-ink hover:underline">Terms of Service</a>.
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
          className="w-full rounded-[10px] bg-black px-6 py-3 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {status === "sending"
            ? "Publishing…"
            : docFile
              ? "Review above, then publish"
              : "Publish as unverified report"}
        </button>
        <p className="text-xs text-muted text-center">
          {docFile
            ? "Your price publishes instantly and anonymously with a Verified badge."
            : "Your price publishes instantly and anonymously as an unverified community report — no document needed."}
        </p>
      </form>
    </div>
  );
}
