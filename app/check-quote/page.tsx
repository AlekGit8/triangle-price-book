"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { CHECK_QUOTE_CARRYOVER_KEY } from "@/lib/check-quote-carryover";
import { formatCents, formatMonthYear } from "@/lib/format";
import ReportCard from "@/components/ReportCard";
import type { Report } from "@/lib/data";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          action?: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      getResponse: (id?: string) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

interface AiEstimate {
  low_cents: number;
  median_cents: number;
  high_cents: number;
  basis: string;
}

interface CheckResult {
  ok: boolean;
  count: number;
  notEnoughData?: boolean;
  min_cents?: number;
  median_cents?: number;
  max_cents?: number;
  matched?: string[];
  entries?: Report[];
  category_entries?: Report[];
  ai_estimate?: AiEstimate | null;
  error?: string;
}

function verdictFor(priceCents: number, r: CheckResult): { headline: string; detail: string; tone: string } {
  const min = r.min_cents!, median = r.median_cents!, max = r.max_cents!;
  if (priceCents < min)
    return {
      headline: "Below the typical range for this job",
      detail: `Your quote is under the lowest similar verified price (${formatCents(min)}). That looks like a strong deal — just confirm the scope matches.`,
      tone: "text-green-700 dark:text-green-400",
    };
  if (priceCents <= median)
    return {
      headline: "Within the typical range for this job",
      detail: `Your quote sits at or below the middle of similar verified prices (median ${formatCents(median)}). Looks fair.`,
      tone: "text-green-700 dark:text-green-400",
    };
  if (priceCents <= max)
    return {
      headline: "Above the typical range for this job",
      detail: `Your quote is above the median for similar jobs (${formatCents(median)}). Not necessarily unfair — scope and materials matter — but a second quote is worth getting.`,
      tone: "text-amber-700 dark:text-amber-400",
    };
  return {
    headline: "Above the typical range for this job",
    detail: `Your quote tops the highest similar verified price (${formatCents(max)}). Definitely get at least one more quote before committing.`,
    tone: "text-red-700 dark:text-red-300",
  };
}

export default function CheckQuotePage() {
  const [category, setCategory] = useState<string>(siteConfig.categories[0]);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  // Town is required on /submit but the check itself doesn't need it —
  // collected here (optional) so it carries over to the share step.
  const [town, setTown] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [submittedPrice, setSubmittedPrice] = useState(0);
  const [submittedDescription, setSubmittedDescription] = useState("");
  const [submittedCategory, setSubmittedCategory] = useState<string>(siteConfig.categories[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Optional quote upload: read the document with /api/extract (the same
  // Gemini extraction as /submit) and fill the three fields below.
  const docInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [extractState, setExtractState] = useState<
    "idle" | "reading" | "done" | "error" | "rejected" | "unavailable"
  >("idle");
  const [extractMsg, setExtractMsg] = useState("");
  // First quote read from the uploaded document (if any): its document
  // truth rides along to /submit, and its stored copy lets the entry
  // verify without a re-upload. Cleared whenever a new upload starts.
  const [extractedQuote, setExtractedQuote] = useState<{
    reportType: "paid" | "quote";
    town: string;
    serviceDate: string;
    notes: string;
  } | null>(null);
  const [carriedInvoice, setCarriedInvoice] = useState<{
    receiptId: string;
    invoiceHash: string;
    invoiceExt: string;
    fileName: string;
  } | null>(null);

  // Cloudflare Turnstile, rendered explicitly (same pattern as /submit).
  // The extract call is the only one that needs a token here — the manual
  // check below doesn't use Turnstile at all.
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const turnstileTokenRef = useRef("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileUnavailable, setTurnstileUnavailable] = useState(false);

  useEffect(() => {
    if (!turnstileSiteKey) return;
    let cancelled = false;
    function tryRender() {
      if (cancelled) return;
      const t = window.turnstile;
      const container = turnstileContainerRef.current;
      if (!t || !container || turnstileWidgetIdRef.current) return;
      try {
        const id = t.render(container, {
          sitekey: turnstileSiteKey,
          action: "submit",
          callback: (token: string) => {
            turnstileTokenRef.current = token;
            setTurnstileToken(token);
          },
          "expired-callback": () => {
            turnstileTokenRef.current = "";
            setTurnstileToken("");
          },
          "error-callback": () => {
            turnstileTokenRef.current = "";
            setTurnstileToken("");
          },
        });
        turnstileWidgetIdRef.current = id;
      } catch {
        // Render failed (script still loading) — the load listener retries.
      }
    }
    tryRender();
    // If the script never loads, don't strand the upload — the extract
    // will fail closed server-side and the manual form still works.
    const unavailableTimer = window.setTimeout(() => {
      if (!turnstileWidgetIdRef.current && !turnstileTokenRef.current) {
        setTurnstileUnavailable(true);
      }
    }, 20000);
    const script = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
    );
    script?.addEventListener("load", tryRender);
    return () => {
      cancelled = true;
      window.clearTimeout(unavailableTimer);
      script?.removeEventListener("load", tryRender);
      const id = turnstileWidgetIdRef.current;
      turnstileWidgetIdRef.current = null;
      turnstileTokenRef.current = "";
      if (id) {
        try {
          window.turnstile?.remove(id);
        } catch {
          // Already gone.
        }
      }
    };
  }, []);

  /** Wait briefly for a Turnstile token (widget still solving), then return it. */
  async function getTurnstileToken(): Promise<string> {
    if (!turnstileSiteKey) return "";
    const started = Date.now();
    while (Date.now() - started < 8000) {
      if (turnstileTokenRef.current) return turnstileTokenRef.current;
      await new Promise((r) => setTimeout(r, 100));
    }
    return turnstileTokenRef.current || "";
  }

  /** Reset the widget after an extract call used the token (success or
      failure) — tokens are single-use, so a retry needs a fresh one. */
  function clearTurnstileToken() {
    const id = turnstileWidgetIdRef.current;
    if (id) {
      try {
        window.turnstile?.reset(id);
      } catch {
        // Widget already gone.
      }
    }
    turnstileTokenRef.current = "";
    setTurnstileToken("");
  }

  /** Upload flow: send the document to /api/extract and fill the three
      form fields from the first quote found. */
  async function handleDocChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFile(file);
    setExtractState("reading");
    setExtractMsg("");
    setResult(null);
    setExtractedQuote(null);
    setCarriedInvoice(null);
    try {
      const form = new FormData();
      form.set("document", file);
      form.set("turnstileToken", await getTurnstileToken());
      const res = await fetch("/api/extract", { method: "POST", body: form });
      const json = await res.json();
      clearTurnstileToken();
      if (res.status === 501 && json.error === "not_configured") {
        setExtractState("unavailable");
        return;
      }
      if (res.status === 422 && json.error === "rejected") {
        setDocFile(null);
        if (docInputRef.current) docInputRef.current.value = "";
        if (cameraInputRef.current) cameraInputRef.current.value = "";
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
      if (quotes.length === 0) throw new Error("Could not read the document.");
      const q = quotes[0] as Record<string, unknown>;
      if (
        typeof q.category === "string" &&
        (siteConfig.categories as readonly string[]).includes(q.category)
      ) {
        setCategory(q.category);
      }
      if (typeof q.serviceName === "string" && q.serviceName) {
        setDescription(q.serviceName);
      }
      if (typeof q.amount === "number" && Number.isFinite(q.amount) && q.amount > 0) {
        setPrice(String(q.amount));
      }
      setExtractedQuote({
        reportType: q.reportType === "paid" ? "paid" : "quote",
        town: typeof q.town === "string" ? q.town : "",
        serviceDate: typeof q.serviceDate === "string" ? q.serviceDate : "",
        notes: typeof q.notes === "string" ? q.notes : "",
      });
      const receiptId = typeof q.receiptId === "string" ? q.receiptId : null;
      const invoiceHash = typeof json.invoiceHash === "string" ? json.invoiceHash : null;
      const invoiceExt = typeof json.invoiceExt === "string" ? json.invoiceExt : null;
      setCarriedInvoice(
        receiptId && invoiceHash && invoiceExt
          ? { receiptId, invoiceHash, invoiceExt, fileName: file.name }
          : null
      );
      setExtractState("done");
      setExtractMsg(
        quotes.length > 1
          ? `Found ${quotes.length} quotes — filled in the first one. Edit the fields below if that's not the right one, then check your quote.`
          : "Filled in from your quote — review the fields below, then check your quote."
      );
    } catch (err) {
      // See submit/page.tsx: reset the token here too, so a fetch() /
      // res.json() failure after the server consumed it doesn't leave a
      // dead token for the retry.
      clearTurnstileToken();
      setExtractState("error");
      setExtractMsg(err instanceof Error ? err.message : "Could not read the document.");
      if (docInputRef.current) docInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      setDocFile(null);
    }
  }

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    const cents = Math.round(parseFloat(price) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Please enter a valid price.");
      return;
    }
    if (description.trim().length < 3) {
      setError("Please describe the job (e.g. “water heater install”).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/check-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, description: description.trim(), price_cents: cents }),
      });
      const json = (await res.json()) as CheckResult;
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed");
      setSubmittedPrice(cents);
      setSubmittedDescription(description.trim());
      setSubmittedCategory(category);
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const hasRange =
    result && !result.notEnoughData && result.min_cents! < result.max_cents!;
  // A verdict exists whenever there are 2+ matches — including when every
  // matched job cost exactly the same (min == max), which used to show
  // no verdict at all. The scale bar still needs a real range, so it
  // stays gated on hasRange.
  const hasData =
    result &&
    !result.notEnoughData &&
    result.min_cents != null &&
    result.max_cents != null;
  const scalePos = (v: number) => {
    const min = result!.min_cents!, max = result!.max_cents!;
    return Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  };

  const verdict = hasData ? verdictFor(submittedPrice, result!) : null;

  const aiPlacement =
    result?.ai_estimate && submittedPrice < result.ai_estimate.low_cents
      ? "below"
      : result?.ai_estimate && submittedPrice > result.ai_estimate.high_cents
        ? "above"
        : "within";

  /** Carry this check over to /submit: the form opens prefilled, and an
      uploaded document rides along so the entry can verify without a
      re-upload. A manual check carries no document and publishes as
      unverified. SessionStorage only (same tab), consumed once. */
  function saveCarryover() {
    try {
      window.sessionStorage.setItem(
        CHECK_QUOTE_CARRYOVER_KEY,
        JSON.stringify({
          category,
          serviceName: description.trim(),
          amount: price.trim(),
          reportType: extractedQuote?.reportType ?? "quote",
          town: town.trim() || extractedQuote?.town || "",
          serviceDate: extractedQuote?.serviceDate ?? "",
          notes: extractedQuote?.notes ?? "",
          receiptId: carriedInvoice?.receiptId ?? null,
          invoiceHash: carriedInvoice?.invoiceHash ?? null,
          invoiceExt: carriedInvoice?.invoiceExt ?? null,
          fileName: carriedInvoice?.fileName ?? null,
        })
      );
    } catch {
      // Storage unavailable — /submit just opens blank, as today.
    }
  }

  return (
    <div className="py-10 max-w-2xl mx-auto px-4">
      <h1 className="font-serif text-4xl text-ink sm:text-5xl">Is this quote fair?</h1>
      <p className="mt-2 text-muted">
        Upload a photo of your quote and we&rsquo;ll fill in the form for you —
        or describe the job and enter your quoted price by hand. Either way,
        we&rsquo;ll compare it against similar verified prices from Triangle
        homeowners.
      </p>

      {/* Optional: upload the quote instead of typing it in */}
      <div className="mt-6 rounded-2xl border-2 border-dashed border-line bg-card p-5 focus-within:border-black focus-within:ring-2 focus-within:ring-black/10">
        <input
          ref={docInputRef}
          id="cqUpload"
          type="file"
          accept="image/*,.pdf"
          className="sr-only"
          onChange={handleDocChange}
        />
        <label
          htmlFor="cqUpload"
          className="flex cursor-pointer flex-col items-center gap-2 py-2 text-center"
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black text-2xl text-white">
            {extractState === "reading" ? "…" : "📄"}
          </span>
          <span className="font-bold text-ink">
            {docFile ? docFile.name : "Upload your quote"}
          </span>
          <span className="text-sm text-muted">
            {extractState === "reading"
              ? "Reading your quote…"
              : "Photo or PDF — we'll fill in the category, job, and price below"}
          </span>
        </label>

        {/* Mobile only: open the phone camera directly to photograph the
            quote. Hidden on desktop (sm and up). */}
        <input
          ref={cameraInputRef}
          id="cqCamera"
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handleDocChange}
        />
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="mx-auto mt-3 flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-black sm:hidden"
        >
          📷 Take a photo of your quote
        </button>

        {/* Cloudflare Turnstile: the extract call needs a token; the manual
            check below doesn't. */}
        {turnstileSiteKey && (
          <div className="mt-4 flex flex-col items-center">
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
              async
              defer
            />
            <div ref={turnstileContainerRef} />
            {!turnstileToken && !turnstileUnavailable && (
              <p className="mt-1 text-xs text-muted">Complete the check above to read your quote.</p>
            )}
            {turnstileUnavailable && (
              <p className="mt-1 text-xs text-muted">
                The spam check didn&rsquo;t load — you can still fill in the form below by hand.
              </p>
            )}
          </div>
        )}

        {extractState === "done" && (
          <p className="mt-3 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800 dark:text-green-300 dark:bg-green-950 dark:border-green-800 dark:text-green-200 text-center">
            ✓ {extractMsg}
          </p>
        )}
        {extractState === "error" && (
          <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800 text-center dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200">
            {extractMsg} You can fill in the form below by hand instead.
          </p>
        )}
        {extractState === "rejected" && (
          <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200 text-center">
            {extractMsg}
          </p>
        )}
        {extractState === "unavailable" && (
          <p className="mt-3 rounded-lg bg-card border border-line px-4 py-2 text-sm text-muted text-center">
            Auto-fill isn&rsquo;t enabled yet — fill in the form below by hand.
          </p>
        )}
      </div>

      <form onSubmit={check} className="mt-6 rounded-2xl border border-line bg-white p-6 space-y-4">
        <div>
          <label htmlFor="cq-category" className="block font-mono text-xs font-semibold uppercase tracking-wide text-muted">
            Service category
          </label>
          <select
            id="cq-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-line px-3 py-2.5 text-ink focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
          >
            {siteConfig.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cq-desc" className="block font-mono text-xs font-semibold uppercase tracking-wide text-muted">
            Describe the job
          </label>
          <input
            id="cq-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. water heater install, roof repair, heat pump"
            className="mt-1 w-full rounded-[10px] border border-line px-3 py-2.5 text-ink placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>
        <div>
          <label htmlFor="cq-price" className="block font-mono text-xs font-semibold uppercase tracking-wide text-muted">
            Your quoted price ($)
          </label>
          <input
            id="cq-price"
            type="number"
            min="1"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 5500"
            className="mt-1 w-full rounded-[10px] border border-line px-3 py-2.5 text-ink placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>
        <div>
          <label htmlFor="cq-town" className="block font-mono text-xs font-semibold uppercase tracking-wide text-muted">
            Town (optional)
          </label>
          <input
            id="cq-town"
            type="text"
            value={town}
            onChange={(e) => setTown(e.target.value)}
            placeholder="e.g. Fuquay-Varina — carries over if you share this quote"
            className="mt-1 w-full rounded-[10px] border border-line px-3 py-2.5 text-ink placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-[10px] bg-black px-4 py-2.5 font-semibold text-white hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
        >
          {busy ? "Checking…" : "Check my quote"}
        </button>
      </form>

      {result?.ai_estimate && (
        <div className="mt-6 rounded-2xl border border-line bg-white p-6">
          <p className="font-mono text-xs font-semibold uppercase tracking-wide text-muted">
            AI estimate
          </p>
          <p className="mt-3 text-lg text-ink">
            A reasonable range for this job is{" "}
            <span className="font-mono font-bold">{formatCents(result.ai_estimate.low_cents)}</span>{" "}
            to{" "}
            <span className="font-mono font-bold">{formatCents(result.ai_estimate.high_cents)}</span>,
            with a typical price around{" "}
            <span className="font-mono font-bold">{formatCents(result.ai_estimate.median_cents)}</span>.
          </p>
          <p className="mt-2 text-muted">
            Your quote of {formatCents(submittedPrice)} is {aiPlacement} this estimated range.
          </p>
          {result.ai_estimate.basis && (
            <p className="mt-2 text-sm text-muted">{result.ai_estimate.basis}</p>
          )}
          <p className="mt-3 text-xs text-neutral-400">
            AI estimate — based on a broad online search, not our verified local prices.
          </p>
        </div>
      )}

      {result?.notEnoughData && (
        <div className="mt-6 rounded-2xl border border-line bg-white p-6">
          <p className="font-semibold text-ink">No similar jobs yet</p>
          <p className="mt-1 text-muted">
            We haven&rsquo;t seen enough Triangle jobs like &ldquo;{submittedDescription}&rdquo;
            to judge your quote fairly.
          </p>
          <p className="mt-3 text-muted">
            <Link href="/submit" onClick={saveCarryover} className="font-semibold text-ink hover:underline">
              Share your quote anonymously
            </Link>{" "}
            and help build the data your neighbors need.
          </p>
        </div>
      )}

      {verdict && result && (
        <div className="mt-6 rounded-2xl border border-line bg-white p-6">
          <p className={`text-xl font-bold ${verdict.tone}`}>{verdict.headline}</p>
          <p className="mt-3 text-lg text-ink">
            {hasRange ? (
              <>
                Similar Triangle jobs range from{" "}
                <span className="font-bold">{formatCents(result.min_cents!)}</span> to{" "}
                <span className="font-bold">{formatCents(result.max_cents!)}</span>.
              </>
            ) : (
              <>
                Every similar Triangle job cost exactly{" "}
                <span className="font-bold">{formatCents(result.min_cents!)}</span>.
              </>
            )}
          </p>
          <p className="mt-2 text-muted">{verdict.detail}</p>

          {hasRange && (
            <div className="mt-6">
              <div className="relative h-2 rounded-full bg-line">
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black ring-4 ring-black/10"
                  style={{ left: `${scalePos(submittedPrice)}%` }}
                  title="Your quote"
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>{formatCents(result.min_cents!)}</span>
                <span>Your quote: {formatCents(submittedPrice)}</span>
                <span>{formatCents(result.max_cents!)}</span>
              </div>
            </div>
          )}

          {result.entries && result.entries.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-ink">
                Compared against {result.count} similar verified {result.count === 1 ? "job" : "jobs"}:
              </p>
              <ul className="mt-2 space-y-1.5">
                {result.entries.map((s, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-muted">
                      {s.service_name}
                      <span className="text-neutral-400">
                        {" "}· {s.town}{s.service_date ? ` · ${formatMonthYear(s.service_date)}` : ""}
                      </span>
                    </span>
                    <span className="font-semibold text-ink whitespace-nowrap">
                      {formatCents(s.amount_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 text-xs text-neutral-400">
            Median of similar jobs: {formatCents(result.median_cents!)}. Prices vary with
            scope, materials, and timing — always get multiple quotes.
          </p>

          <div className="mt-4 rounded-lg bg-card p-4">
            <p className="text-sm text-ink">
              <span className="font-semibold">Help your neighbors:</span>{" "}
              <Link href="/submit" onClick={saveCarryover} className="font-semibold text-ink hover:underline">
                anonymously share this quote
              </Link>{" "}
              so the next homeowner gets a better answer.
            </p>
          </div>
        </div>
      )}

      {result && result.entries && result.entries.length > 0 && (
        <div className="mt-10">
          <h2 className="font-serif text-2xl text-ink">Similar jobs in our database</h2>
          <p className="mt-1 text-sm text-muted">
            Every verified entry that matches &ldquo;{submittedDescription}&rdquo; — the same
            jobs behind the comparison above.
          </p>
          <div className="mt-4 space-y-3">
            {result.entries.map((e) => (
              <ReportCard key={e.id} report={e} />
            ))}
          </div>
        </div>
      )}

      {result &&
        (!result.entries || result.entries.length === 0) &&
        result.category_entries &&
        result.category_entries.length > 0 && (
          <div className="mt-10">
            <h2 className="font-serif text-2xl text-ink">
              Other {submittedCategory} prices in our database
            </h2>
            <p className="mt-1 text-sm text-muted">
              Nothing matched &ldquo;{submittedDescription}&rdquo; closely, but here are the
              other verified {submittedCategory} prices we have.
            </p>
            <div className="mt-4 space-y-3">
              {result.category_entries.map((e) => (
                <ReportCard key={e.id} report={e} />
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
