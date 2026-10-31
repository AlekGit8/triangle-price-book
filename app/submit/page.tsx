"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { siteConfig } from "@/lib/site-config";
import {
  CHECK_QUOTE_CARRYOVER_KEY,
  type CheckQuoteCarryover,
} from "@/lib/check-quote-carryover";
import { takeCarriedDoc } from "@/lib/carried-doc";

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

const inputCls =
  "w-full rounded-[10px] border border-line px-3 py-2 text-ink placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 disabled:bg-card disabled:text-muted";
const labelCls = "block font-mono text-xs font-semibold uppercase tracking-wide text-muted mb-1";

type ExtractState = "idle" | "reading" | "done" | "error" | "rejected" | "unavailable";

interface FormFields {
  category: string;
  serviceName: string;
  businessName: string;
  amount: string;
  reportType: "paid" | "quote";
  town: string;
  serviceDate: string;
  notes: string;
  submitterEmail: string;
}

/** Category dropdowns are alphabetical (the site-config order is not). */
const alphabeticalCategories = [...siteConfig.categories].sort((a, b) =>
  a.localeCompare(b)
);

const emptyFields: FormFields = {
  category: "HVAC",
  serviceName: "",
  businessName: "",
  amount: "",
  reportType: "paid",
  town: "",
  serviceDate: "",
  notes: "",
  submitterEmail: "",
};

// Manual-form persistence: typed fields survive a refresh (e.g. after a
// Turnstile hiccup) instead of forcing a full re-type. Files can't be
// stored, so an attachment still needs re-selecting after a refresh.
const PERSISTED_FIELDS_KEY = "tpb-submit-fields";

/** The UI asks only for month + year; the server/DB still store a full
    date, so a month becomes the 1st of that month at the API boundary. */
function monthToDate(month: string): string {
  if (/^\d{4}-\d{2}$/.test(month)) return `${month}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(month)) return `${month.slice(0, 7)}-01`;
  return "";
}

function loadPersistedFields(): FormFields {
  try {
    const raw = window.sessionStorage.getItem(PERSISTED_FIELDS_KEY);
    if (!raw) return emptyFields;
    const parsed = JSON.parse(raw) as Partial<FormFields>;
    const fields = { ...emptyFields, ...parsed };
    // The date field used to ask for a full date; only month + year is
    // kept now — truncate any stored YYYY-MM-DD value.
    if (/^\d{4}-\d{2}-\d{2}$/.test(fields.serviceDate)) {
      fields.serviceDate = fields.serviceDate.slice(0, 7);
    }
    // The email is never restored (it isn't persisted either, below):
    // re-typing one field beats keeping a contact address in storage.
    fields.submitterEmail = "";
    return fields;
  } catch {
    return emptyFields;
  }
}

type DraftStatus = "pending" | "publishing" | "done" | "error";

interface DraftQuote {
  key: string;
  category: string;
  serviceName: string;
  amount: string;
  reportType: "paid" | "quote";
  town: string;
  serviceDate: string;
  notes: string;
  status: DraftStatus;
  errorMsg: string;
  /** Receipt id from /api/extract, binding this quote's amount to the
   *  uploaded document — the server only badges Verified when the
   *  receipt matches. Editing the amount after extraction voids it. */
  receiptId: string | null;
  /** File name of a document carried from a check-my-quote upload (the
   *  file itself rides in docFile). Shown on the draft card so the user
   *  sees the document came along. Absent for ordinary uploads. */
  carriedFileName?: string | null;
  /** Company/contractor name for this quote — read from the uploaded
   *  document when present, editable on the card. Sent to the server
   *  so the admin queue can show it as an editable suggestion. Never
   *  shown to visitors. Absent when extraction named none (or for
   *  carried drafts without one). */
  extractedBusinessName?: string | null;
  /** Set on publish: whether the server badged this entry Verified. */
  verified?: boolean;
}

function draftFromAI(key: string, q: Record<string, unknown>): DraftQuote {
  return {
    key,
    category: typeof q.category === "string" ? q.category : "HVAC",
    serviceName: typeof q.serviceName === "string" ? q.serviceName : "",
    amount: typeof q.amount === "number" ? String(q.amount) : "",
    reportType: q.reportType === "quote" ? "quote" : "paid",
    town: typeof q.town === "string" ? q.town : "",
    serviceDate:
      typeof q.serviceDate === "string" ? q.serviceDate.slice(0, 7) : "",
    notes: typeof q.notes === "string" ? q.notes : "",
    status: "pending",
    errorMsg: "",
    receiptId: typeof q.receiptId === "string" ? q.receiptId : null,
    extractedBusinessName: typeof q.businessName === "string" ? q.businessName : null,
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
        d.status === "done" ? "border-green-300 dark:border-green-700" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-ink">
          {d.serviceName || "Untitled quote"}
          {d.amount && (
            <span className="ml-2 font-mono font-bold text-ink">${d.amount}</span>
          )}
        </p>
        {(d.status === "pending" || d.status === "error") && (
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

      {d.carriedFileName && d.status !== "done" && (
        <p className="mt-2 text-sm text-muted">
          📄 {d.carriedFileName} attached from your quote check — no need to re-upload.
        </p>
      )}

      {d.status === "done" ? (
        <p className="mt-3 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800 dark:text-green-300 dark:bg-green-950 dark:border-green-800 dark:text-green-200">
          {d.verified === false
            ? "✓ Published — live and anonymous as an unverified report. (The amount didn't match the document we read, so it has no Verified badge — a moderator can still review it.)"
            : "✓ Published — live and anonymous with a Verified badge."}
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
                {alphabeticalCategories.map((c) => (
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
              <label className={labelCls} htmlFor={id("date")}>Month</label>
              <input
                id={id("date")} type="month" className={inputCls}
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
          <div>
            <label className={labelCls} htmlFor={id("business")}>Business name (optional)</label>
            <input
              id={id("business")} className={inputCls} maxLength={200}
              placeholder="Company that did the work, if listed"
              disabled={locked}
              value={d.extractedBusinessName ?? ""}
              onChange={(e) => set({ extractedBusinessName: e.target.value || null })}
            />
          </div>

          {d.status === "error" && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200">
              {d.errorMsg}
            </p>
          )}

          <button
            type="button"
            disabled={locked || !agreed}
            onClick={() => onPublish(d.key)}
            title={!agreed ? "Please confirm the truthfulness checkbox below first" : undefined}
            className="w-full rounded-[10px] bg-black px-6 py-2.5 font-semibold text-white hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
          >
            {d.status === "publishing" ? "Publishing…" : "Publish this quote"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function SubmitPage() {
  // Initialize with empty fields and restore persisted values after
  // mount: reading sessionStorage during render returns empty fields on
  // the server and stored values on the client, which mismatches
  // hydration (and can warn). The post-mount restore avoids that.
  const [fields, setFields] = useState<FormFields>(emptyFields);
  const [docFile, setDocFile] = useState<File | null>(null);
  // Option 2 attachment: proof only, never sent to the AI extractor.
  // If set, /api/submit marks the entry verified on the file's presence alone.
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [extractState, setExtractState] = useState<ExtractState>("idle");
  const [extractMsg, setExtractMsg] = useState("");
  const [extractCount, setExtractCount] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [submittedVerified, setSubmittedVerified] = useState(true);
  const [submittedWithDoc, setSubmittedWithDoc] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Multi-quote drafts from an uploaded document.
  const [drafts, setDrafts] = useState<DraftQuote[]>([]);
  const [draftEmail, setDraftEmail] = useState("");
  const [draftsAgreed, setDraftsAgreed] = useState(false);
  const [publishingAll, setPublishingAll] = useState(false);

  const docInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Cloudflare Turnstile, rendered explicitly (see the effect below). The
  // old code used implicit rendering (a .cf-turnstile div + async script)
  // and called bare getResponse() with no widget id — that races the script
  // load, and when the widget isn't registered yet api.js logs
  // "[Cloudflare Turnstile] Could not find widget" and returns no token.
  // The widget id returned by render() is the only reliable handle.
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const turnstileTokenRef = useRef("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileUnavailable, setTurnstileUnavailable] = useState(false);

  // Drafts-section Turnstile widget, parallel to the manual form's one:
  // draft publishing used to depend on the manual form's widget, which
  // sits below the fold — a draft Publish clicked before solving it
  // failed closed with no widget in sight. Drafts get their own.
  const draftsTurnstileContainerRef = useRef<HTMLDivElement>(null);
  const draftsTurnstileWidgetIdRef = useRef<string | null>(null);
  const draftsTurnstileTokenRef = useRef("");
  const [draftsTurnstileToken, setDraftsTurnstileToken] = useState("");
  const [draftsTurnstileUnavailable, setDraftsTurnstileUnavailable] = useState(false);

  // Restore once, after mount (see above). A check-my-quote carryover
  // wins over the persisted form: an uploaded check becomes a draft
  // (verified path — its file rides in browser storage into docFile),
  // a manual check prefills the manual form (unverified path).
  // Single-use — the key is removed on read so a later fresh visit
  // doesn't resurrect it, and the browser copy is taken (deleted) once
  // /submit picks it up, so an abandoned share leaves nothing behind.
  useEffect(() => {
    let cancelled = false;
    async function consumeCarryover() {
      let carried: Partial<CheckQuoteCarryover> | null = null;
      try {
        const raw = window.sessionStorage.getItem(CHECK_QUOTE_CARRYOVER_KEY);
        if (raw) {
          window.sessionStorage.removeItem(CHECK_QUOTE_CARRYOVER_KEY);
          carried = JSON.parse(raw) as Partial<CheckQuoteCarryover>;
        }
      } catch {
        carried = null;
      }
      if (!carried) {
        if (!cancelled) setFields(loadPersistedFields());
        return;
      }
      const str = (v: unknown): string => (typeof v === "string" ? v : "");
      const categories = siteConfig.categories as readonly string[];
      const carriedFields: FormFields = {
        category: categories.includes(str(carried.category))
          ? str(carried.category)
          : "HVAC",
        serviceName: str(carried.serviceName),
        businessName: "",
        amount: str(carried.amount),
        reportType: carried.reportType === "paid" ? "paid" : "quote",
        town: str(carried.town),
        serviceDate: str(carried.serviceDate).slice(0, 7),
        notes: str(carried.notes),
        submitterEmail: "",
      };
      if (cancelled) return;
      setFields(carriedFields);
      // Uploaded check: pick the file up from browser storage into
      // docFile (the normal batch path) and draft it for verified
      // publish. If the file is gone (stale, cleared, another tab),
      // fall back to the prefilled manual form — unverified, as usual.
      if (
        typeof carried.docKey === "string" &&
        typeof carried.receiptId === "string"
      ) {
        const file = await takeCarriedDoc(carried.docKey);
        if (cancelled) return;
        if (file) {
          setDocFile(file);
          setDrafts([
            {
              key: "carried",
              category: carriedFields.category,
              serviceName: carriedFields.serviceName,
              amount: carriedFields.amount,
              reportType: carriedFields.reportType,
              town: carriedFields.town,
              serviceDate: carriedFields.serviceDate,
              notes: carriedFields.notes,
              status: "pending",
              errorMsg: "",
              receiptId: carried.receiptId,
              carriedFileName:
                typeof carried.fileName === "string" ? carried.fileName : file.name,
              extractedBusinessName:
                typeof carried.businessName === "string" && carried.businessName
                  ? carried.businessName
                  : null,
            },
          ]);
          window.setTimeout(
            () =>
              document
                .getElementById("submit-drafts")
                ?.scrollIntoView({ behavior: "smooth", block: "start" }),
            150
          );
          return;
        }
      }
      window.setTimeout(
        () =>
          document
            .getElementById("submit-manual-form")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        150
      );
    }
    consumeCarryover();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist the manual form as it is typed, so a refresh doesn't wipe it.
  // The email is excluded: it is never written to storage.
  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        PERSISTED_FIELDS_KEY,
        JSON.stringify({ ...fields, submitterEmail: "" })
      );
    } catch {
      // Storage unavailable (private mode, etc.) — the form still works.
    }
  }, [fields]);

  // Render the Turnstile widget explicitly once the script is ready, and
  // re-render on remount (e.g. after the "Published!" view unmounts the
  // form). The script tag's load listener covers the first load; the direct
  // window.turnstile check covers remounts, where Next dedupes the script
  // and the load event doesn't fire again.
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
    // If the script never loads (blocked CDN, strict content blocker),
    // don't leave the form permanently disabled — let the submit proceed
    // and let the server decide (it fails closed with "Spam check failed").
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

  // Drafts-section widget: same explicit-render pattern as the manual
  // form's widget, with its own refs so the two don't clobber each
  // other. Re-runs only when the drafts box appears/disappears — NOT on
  // every draft edit, which would re-render the widget and eat a solved
  // token. (During publishing the box hides briefly; the token was
  // already consumed by then, so the fresh widget on retry is correct.)
  const draftsWidgetVisible = drafts.some(
    (d) => d.status === "pending" || d.status === "error"
  );
  useEffect(() => {
    if (!turnstileSiteKey || !draftsWidgetVisible) return;
    let cancelled = false;
    function tryRender() {
      if (cancelled) return;
      const t = window.turnstile;
      const container = draftsTurnstileContainerRef.current;
      if (!t || !container || draftsTurnstileWidgetIdRef.current) return;
      try {
        const id = t.render(container, {
          sitekey: turnstileSiteKey,
          action: "submit",
          callback: (token: string) => {
            draftsTurnstileTokenRef.current = token;
            setDraftsTurnstileToken(token);
          },
          "expired-callback": () => {
            draftsTurnstileTokenRef.current = "";
            setDraftsTurnstileToken("");
          },
          "error-callback": () => {
            draftsTurnstileTokenRef.current = "";
            setDraftsTurnstileToken("");
          },
        });
        draftsTurnstileWidgetIdRef.current = id;
      } catch {
        // Render failed (script still loading) — the load listener retries.
      }
    }
    tryRender();
    const unavailableTimer = window.setTimeout(() => {
      if (!draftsTurnstileWidgetIdRef.current && !draftsTurnstileTokenRef.current) {
        setDraftsTurnstileUnavailable(true);
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
      const id = draftsTurnstileWidgetIdRef.current;
      draftsTurnstileWidgetIdRef.current = null;
      draftsTurnstileTokenRef.current = "";
      setDraftsTurnstileToken("");
      if (id) {
        try {
          window.turnstile?.remove(id);
        } catch {
          // Already gone.
        }
      }
    };
  }, [draftsWidgetVisible]);

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

  /** Clear the current token after a server call used it (success or
      failure) so the next submit gets a fresh one. Turnstile tokens are
      single-use — re-sending a consumed token always fails verification,
      so without this reset a retry after "Spam check failed" could never
      work. */
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

  /** Token for a draft publish: prefer the drafts-section widget, fall
      back to the manual form's widget if that one was solved instead.
      Returns which widget supplied it so only that one gets reset. */
  async function getDraftsTurnstileToken(): Promise<{
    token: string;
    source: "drafts" | "manual" | null;
  }> {
    if (!turnstileSiteKey) return { token: "", source: null };
    const started = Date.now();
    while (Date.now() - started < 8000) {
      if (draftsTurnstileTokenRef.current)
        return { token: draftsTurnstileTokenRef.current, source: "drafts" };
      if (turnstileTokenRef.current)
        return { token: turnstileTokenRef.current, source: "manual" };
      await new Promise((r) => setTimeout(r, 100));
    }
    if (draftsTurnstileTokenRef.current)
      return { token: draftsTurnstileTokenRef.current, source: "drafts" };
    if (turnstileTokenRef.current)
      return { token: turnstileTokenRef.current, source: "manual" };
    return { token: "", source: null };
  }

  /** Reset one widget after its token was used (success or failure) so
      a retry gets a fresh token. */
  function clearDraftsTurnstileToken(source: "drafts" | "manual" | null) {
    if (source === "drafts") {
      const id = draftsTurnstileWidgetIdRef.current;
      if (id) {
        try {
          window.turnstile?.reset(id);
        } catch {
          // Widget already gone.
        }
      }
      draftsTurnstileTokenRef.current = "";
      setDraftsTurnstileToken("");
    } else if (source === "manual") {
      clearTurnstileToken();
    }
  }

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
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  /** Option 2 attachment: stored as proof only — no AI extraction runs. */
  function handleManualFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setManualFile(file);
  }

  function clearManualFile() {
    setManualFile(null);
    if (manualInputRef.current) manualInputRef.current.value = "";
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
      form.set("turnstileToken", await getTurnstileToken());
      const res = await fetch("/api/extract", { method: "POST", body: form });
      const json = await res.json();
      // The extract call consumed the token whether it worked or not —
      // reset so the later publish gets a fresh one.
      clearTurnstileToken();
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
      // The token is single-use: if fetch()/res.json() threw after the
      // server consumed it, the inline reset above never ran and a retry
      // would re-send a dead token. Resetting here is harmless when the
      // token was never consumed (the widget just issues a fresh one).
      clearTurnstileToken();
      setExtractState("error");
      setExtractMsg(err instanceof Error ? err.message : "Could not read the document.");
      // Reset the input so the user can retry the same file.
      if (docInputRef.current) docInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      setDocFile(null);
    }
  }

  /** Publish one or more drafts; the uploaded document verifies all of
      them whose amount still matches what was read from it. Returns the
      per-report verified flags so each draft card can say so. */
  async function publishDraftBatch(
    items: DraftQuote[]
  ): Promise<Array<{ id: string; verified: boolean }>> {
    const form = new FormData();
    form.set(
      "reports",
      JSON.stringify(
        items.map((d) => ({
          category: d.category,
          serviceName: d.serviceName.trim(),
          amount: d.amount.trim(),
          reportType: d.reportType,
          town: d.town.trim(),
          serviceDate: monthToDate(d.serviceDate),
          notes: d.notes.trim(),
          receiptId: d.receiptId,
          businessName: d.extractedBusinessName ?? null,
        }))
      )
    );
    form.set("submitterEmail", draftEmail.trim());
    if (docFile) form.set("invoice", docFile);
    const { token: draftsToken, source: draftsTokenSource } =
      await getDraftsTurnstileToken();
    form.set("turnstileToken", draftsToken);
    let res: Response;
    let json: { ok?: boolean; error?: string; results?: Array<{ id: string; verified: boolean }> };
    try {
      res = await fetch("/api/submit", { method: "POST", body: form });
      json = await res.json();
    } finally {
      // The token is single-use: the server consumed it whether the submit
      // worked or not. Reset now so a retry gets a fresh token instead of
      // re-sending this dead one — including when fetch()/res.json()
      // throws after the server consumed it.
      clearDraftsTurnstileToken(draftsTokenSource);
    }
    if (!res.ok || !json.ok) throw new Error(json.error ?? "Submission failed");
    return json.results ?? [];
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
    // "error" drafts are retryable: a failed publish (e.g. an unsolved
    // spam check) used to brick the card, because this only ran for
    // "pending" and the button silently did nothing afterwards.
    if (!d || (d.status !== "pending" && d.status !== "error")) return;
    const invalid = draftValid(d);
    if (invalid) {
      updateDraft(key, { status: "error", errorMsg: invalid });
      return;
    }
    updateDraft(key, { status: "publishing", errorMsg: "" });
    try {
      const results = await publishDraftBatch([d]);
      updateDraft(key, { status: "done", verified: results[0]?.verified ?? false });
    } catch (err) {
      updateDraft(key, {
        status: "error",
        errorMsg: err instanceof Error ? err.message : "Submission failed",
      });
    }
  }

  async function publishAll() {
    const pending = drafts.filter(
      (d) => d.status === "pending" || d.status === "error"
    );
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
      ds.map((d) =>
        d.status === "pending" || d.status === "error"
          ? { ...d, status: "publishing" as const, errorMsg: "" }
          : d
      )
    );
    try {
      const results = await publishDraftBatch(pending);
      setDrafts((ds) => {
        // Results come back in the same order as the submitted drafts.
        let i = -1;
        return ds.map((d) => {
          if (d.status !== "publishing") return d;
          i += 1;
          return { ...d, status: "done" as const, verified: results[i]?.verified ?? false };
        });
      });
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
      form.set("reportType", fields.reportType);
      form.set("town", fields.town.trim());
      form.set("serviceDate", monthToDate(fields.serviceDate));
      form.set("notes", fields.notes.trim());
      form.set("businessName", fields.businessName.trim());
      form.set("submitterEmail", fields.submitterEmail.trim());
      // Option 2's own attachment wins; otherwise fall back to the Option 1
      // upload (its presence already means "verified" server-side).
      const invoiceFile = manualFile ?? docFile;
      if (invoiceFile) form.set("invoice", invoiceFile);
      form.set("turnstileToken", await getTurnstileToken());
      const res = await fetch("/api/submit", { method: "POST", body: form });
      const json = await res.json();
      // The token is single-use: the server consumed it whether the submit
      // worked or not. Reset now so a retry gets a fresh token instead of
      // re-sending this dead one.
      clearTurnstileToken();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Submission failed");
      setSubmittedVerified(json.verified !== false);
      setSubmittedWithDoc(!!invoiceFile);
      setStatus("done");
      setFields(emptyFields);
      setDocFile(null);
      setManualFile(null);
      if (manualInputRef.current) manualInputRef.current.value = "";
      if (docInputRef.current) docInputRef.current.value = "";
    } catch (err) {
      // See handleDocChange: reset the token here too, so a fetch() /
      // res.json() failure after the server consumed it doesn't leave a
      // dead token for the retry.
      clearTurnstileToken();
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
              report. Thank you for contributing.{" "}
              {submittedWithDoc
                ? "(Your document is attached — a moderator reviews it and can add a Verified badge.)"
                : "(Uploading a document next time earns a Verified badge.)"}
            </>
          )}
        </p>
        <a href="/browse" className="mt-6 inline-block font-semibold text-ink hover:underline">
          Browse prices →
        </a>
      </div>
    );
  }

  // Publishable drafts: pending plus errored (retryable) ones. The
  // publish section below must stay visible after a failed publish,
  // or the user has no way back to the retry button.
  const publishableCount = drafts.filter(
    (d) => d.status === "pending" || d.status === "error"
  ).length;
  const doneCount = drafts.filter((d) => d.status === "done").length;

  return (
    <div className="py-10 max-w-2xl mx-auto">
      <h1 className="font-serif text-4xl text-ink">Submit a price</h1>
      <p className="mt-2 text-muted">
        Two ways to contribute. <strong>Uploading</strong> a quote or invoice
        lets us read it — entries publish with Verified badges when the price
        matches the document. If your document contains multiple quotes, each
        one becomes its own entry. A manual entry still helps your neighbors.
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

        {/* Mobile only: open the phone camera directly to photograph the
            quote. A separate input with capture="environment" so the file
            chooser stays available above. Hidden on desktop (sm and up),
            where there is no camera to open. */}
        <input
          ref={cameraInputRef}
          id="docCamera"
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

        {extractState === "done" && (
          <p className="mt-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800 dark:text-green-300 dark:bg-green-950 dark:border-green-800 dark:text-green-200 text-center">
            ✓ {extractCount} quote{extractCount === 1 ? "" : "s"} detected — review
            {extractCount === 1 ? "" : " each"} below, then publish.
          </p>
        )}
        {extractState === "error" && (
          <p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800 text-center dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200">
            {extractMsg} Please try uploading again.
          </p>
        )}
        {extractState === "rejected" && (
          <p className="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200 text-center">
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
            Attached as proof — entries publish with Verified badges. Files stay private and are never published.
          </p>
        )}
      </div>

      {/* Detected quotes: review & publish each */}
      {drafts.length > 0 && (
        <div id="submit-drafts" className="mt-6">
          <p className="font-mono text-xs font-bold uppercase tracking-wide text-muted">
            Review & publish
          </p>
          <p className="mt-1 text-sm text-muted">
            Each quote below publishes as its own anonymous entry, all verified
            against your uploaded document.
          </p>

          {doneCount === drafts.length && (
            <div className="mt-4 rounded-xl border border-green-300 dark:border-green-700 bg-green-50 p-5 text-center dark:border-green-800 dark:bg-green-950">
              <p className="font-bold text-green-900 dark:text-green-200">
                All {drafts.length} published! Thank you for contributing.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={resetUpload}
                  className="rounded-full border border-green-700 px-5 py-2 text-sm font-semibold text-green-900 dark:text-green-200 hover:bg-green-100 dark:bg-green-950 dark:border-green-600 dark:hover:bg-green-950"
                >
                  Upload another document
                </button>
                <a
                  href="/browse"
                  className="rounded-[10px] bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 dark:hover:bg-neutral-200"
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

          {publishableCount > 0 && (
            <div className="mt-4 rounded-2xl border border-line bg-white p-4 sm:p-5">
              {/* Drafts-section spam check (see the effect above): the
                  drafts Publish buttons use this widget's token, so it
                  sits where the publish action is instead of depending
                  on the manual form's widget below. */}
              {turnstileSiteKey && (
                <>
                  <Script
                    src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                    async
                    defer
                  />
                  <div ref={draftsTurnstileContainerRef} />
                  {!draftsTurnstileToken && !draftsTurnstileUnavailable && (
                    <p className="mt-1 text-xs text-muted">Complete the check above to publish your quotes.</p>
                  )}
                  {draftsTurnstileUnavailable && (
                    <p className="mt-1 text-xs text-muted">
                      The spam check didn&rsquo;t load — you can still try publishing below.
                    </p>
                  )}
                </>
              )}
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
                disabled={!draftsAgreed || publishingAll || publishableCount === 0}
                onClick={publishAll}
                className="mt-4 w-full rounded-[10px] bg-black px-6 py-3 font-semibold text-white hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
              >
                {publishingAll
                  ? "Publishing…"
                  : `Publish all ${publishableCount} quote${publishableCount === 1 ? "" : "s"}`}
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

      <form id="submit-manual-form" onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className={labelCls} htmlFor="category">Category *</label>
          <select
            id="category" required className={inputCls}
            value={fields.category} onChange={(e) => set("category", e.target.value)}
          >
            {alphabeticalCategories.map((c) => (
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
            <label className={labelCls} htmlFor="serviceDate">Month of service / quote</label>
            <input
              id="serviceDate" type="month" className={inputCls}
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
          <label className={labelCls} htmlFor="businessName">Business name (optional)</label>
          <input
            id="businessName" className={inputCls}
            placeholder="Company that did the work, if listed" maxLength={200}
            value={fields.businessName} onChange={(e) => set("businessName", e.target.value)}
          />
          {fields.businessName.trim() && !manualFile && !docFile && (
            <p className="mt-1 text-xs text-muted">Attach a document for this name to be saved for the moderator&apos;s review — without one, it can&apos;t be verified or shared.</p>
          )}
        </div>

        <div>
          <label className={labelCls} htmlFor="manualUpload">Attach a quote or invoice (optional)</label>
          <div className="flex items-center gap-2">
            <input
              ref={manualInputRef}
              id="manualUpload"
              type="file"
              accept="image/*,.pdf"
              className="sr-only"
              onChange={handleManualFileChange}
            />
            <label
              htmlFor="manualUpload"
              className="shrink-0 cursor-pointer rounded-[10px] border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-black"
            >
              {manualFile ? "Change file" : "Choose a file"}
            </label>
            <span className="min-w-0 truncate text-sm text-muted">
              {manualFile ? manualFile.name : "Photo or PDF — attaches as proof, no AI reading"}
            </span>
            {manualFile && (
              <button
                type="button"
                onClick={clearManualFile}
                className="shrink-0 text-sm font-semibold text-muted hover:text-ink"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="submitterEmail">Email (optional, private)</label>
          <input
            id="submitterEmail" type="email" className={inputCls}
            placeholder="Only used if we need to verify your entry" maxLength={120}
            value={fields.submitterEmail} onChange={(e) => set("submitterEmail", e.target.value)}
          />
        </div>

        {/* Cloudflare Turnstile: rendered explicitly (see the effect above) so
            the submit handlers always have a real widget id. */}
        {turnstileSiteKey && (
          <>
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
              async
              defer
            />
            <div ref={turnstileContainerRef} />
            {!turnstileToken && !turnstileUnavailable && (
              <p className="text-xs text-muted">Complete the check above to publish.</p>
            )}
            {turnstileUnavailable && (
              <p className="text-xs text-muted">
                The spam check didn&rsquo;t load — you can still try publishing below.
              </p>
            )}
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
          <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={
            status === "sending" ||
            (!!turnstileSiteKey && !turnstileToken && !turnstileUnavailable)
          }
          className="w-full rounded-[10px] bg-black px-6 py-3 font-semibold text-white hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
        >
          {status === "sending"
            ? "Publishing…"
            : manualFile
              ? "Publish with document attached"
              : docFile
                ? "Review above, then publish"
                : "Publish as unverified report"}
        </button>
        <p className="text-xs text-muted text-center">
          {manualFile || docFile
            ? "Your price publishes instantly and anonymously as an unverified report — a moderator reviews your document and can add a Verified badge."
            : "Your price publishes instantly and anonymously as an unverified community report — no document needed."}
        </p>
      </form>
    </div>
  );
}
