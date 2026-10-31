"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * "See who did this work" — the paid business-name reveal for one
 * verified report. The button itself decides whether to appear: on
 * mount it asks /api/reveal/status, which reports one of three states.
 * - Real name stored → button opens the pay dialog with three cards:
 *   $2 for this job only (straight to Stripe Checkout), or $5 for any
 *   3 / $8 for any 5 verified listings (to /reveal/select first, where
 *   the buyer picks their entries, then pays). After payment the buyer
 *   gets a private list page (/reveal/<token>). No cookies: the link
 *   is the access. The old $4.99 all-verified option is gone
 *   entirely — no sale ever occurred under it, so nothing carries over.
 * - Contractor unknown ("NA": the documentation did not list one) →
 *   the button STILL renders, but its dialog shows only an
 *   informational message — never a payment. Nobody pays for a name
 *   that isn't there.
 * - No name row yet (not yet processed) → renders nothing, so the
 *   card looks exactly like it did before reveals existed.
 */

// Client component: cannot import the server-only lib/reveal.ts, so
// this literal duplicates UNKNOWN_CONTRACTOR_MESSAGE there. Keep the
// two in sync.
const UNKNOWN_CONTRACTOR_MESSAGE =
  "The portion of the document that was submitted via screenshot did not have the contractor listed.";
export default function RevealButton({
  reportId,
  serviceName,
  className,
  tabIndex,
}: {
  reportId: string;
  serviceName: string;
  // Overrides the default top margin (card use) when the trigger sits
  // inline somewhere else, e.g. next to a badge in a Browse row.
  className?: string;
  // Lets a duplicated surface (marquee copies) keep the trigger out of
  // the tab order. Undefined = natural tab order.
  tabIndex?: number;
}) {
  const [available, setAvailable] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reveal/status?report_id=${encodeURIComponent(reportId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          if (json.available) setAvailable(true);
          if (json.unknown) setUnknown(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  async function buySingle() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/reveal/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "single", report_id: reportId }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? "Checkout failed");
      window.location.href = json.url as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
      setBusy(false);
    }
  }

  function pickPack(pack: "pack3" | "pack5") {
    // Packs are select-then-pay: the buyer picks their entries on the
    // selection screen before any money moves.
    window.location.href = `/reveal/select?pack=${pack}&from=${encodeURIComponent(reportId)}`;
  }

  if (!checked) return null;
  if (!available && !unknown) return null;

  return (
    <>
      <button
        tabIndex={tabIndex}
        onClick={(e) => {
          // The trigger can sit inside a clickable row (Browse table) or
          // card (marquee). Opening the dialog must not also open the
          // row's/card's detail view. stopPropagation alone is NOT
          // enough when the card is a Link: the browser still runs the
          // enclosing anchor's navigation as the click's default action,
          // so the button must cancel that too.
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        className={`font-mono text-[13px] font-semibold text-ink underline decoration-dotted underline-offset-4 hover:decoration-solid ${className ?? "mt-1"}`}
      >
        See who did this work
      </button>

      {/* Portaled to <body>: the dialog must overlay the whole viewport.
          Rendered inline it sits inside the marquee card, and the row's
          edge-fade mask (.marquee-mask) makes the row the positioning
          reference for fixed descendants — so the "full-screen" overlay
          shrank to the row's box and the dialog rendered inside the row
          instead of over the page. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/50"
            onClick={() => !busy && setOpen(false)}
          >
          <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="w-full max-w-2xl rounded-2xl border border-line bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-serif text-2xl text-ink">See who did this work</h2>
              <button
                onClick={() => !busy && setOpen(false)}
                className="font-mono text-sm font-bold text-muted hover:text-ink"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            {unknown ? (
              <>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {UNKNOWN_CONTRACTOR_MESSAGE}
                </p>
                <div className="mt-5">
                  <button
                    onClick={() => setOpen(false)}
                    className="w-full rounded-[10px] bg-black px-4 py-2.5 font-semibold text-white hover:bg-neutral-800"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  This is a <strong className="text-ink">verified</strong> job — the
                  price was checked against paperwork — for{" "}
                  <strong className="text-ink">{serviceName}</strong>. Paying reveals
                  the name of the business that performed it.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col rounded-2xl border border-line p-4">
                    <p className="font-mono text-3xl font-bold text-ink">$2</p>
                    <p className="mt-1 text-sm font-semibold text-ink">1 verified entry</p>
                    <p className="mt-1 flex-1 text-sm text-muted">The business behind this job.</p>
                    <button
                      onClick={buySingle}
                      disabled={busy}
                      className="mt-4 w-full rounded-[10px] bg-black px-4 py-2.5 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {busy ? "…" : "Reveal this job"}
                    </button>
                  </div>
                  <div className="flex flex-col rounded-2xl border border-line p-4">
                    <p className="font-mono text-3xl font-bold text-ink">$5</p>
                    <p className="mt-1 text-sm font-semibold text-ink">3 verified entries</p>
                    <p className="mt-1 flex-1 text-sm text-muted">Choose any 3 verified jobs first, then pay.</p>
                    <button
                      onClick={() => pickPack("pack3")}
                      disabled={busy}
                      className="mt-4 w-full rounded-[10px] border border-line bg-white px-4 py-2.5 font-semibold text-ink hover:border-black disabled:opacity-50"
                    >
                      Pick 3 jobs
                    </button>
                  </div>
                  <div className="flex flex-col rounded-2xl border border-line p-4">
                    <p className="font-mono text-3xl font-bold text-ink">$8</p>
                    <p className="mt-1 text-sm font-semibold text-ink">5 verified entries</p>
                    <p className="mt-1 flex-1 text-sm text-muted">Choose any 5 verified jobs first, then pay.</p>
                    <button
                      onClick={() => pickPack("pack5")}
                      disabled={busy}
                      className="mt-4 w-full rounded-[10px] border border-line bg-white px-4 py-2.5 font-semibold text-ink hover:border-black disabled:opacity-50"
                    >
                      Pick 5 jobs
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => !busy && setOpen(false)}
                  disabled={busy}
                  className="mt-3 w-full px-4 py-2 text-sm font-semibold text-muted hover:text-ink disabled:opacity-50"
                >
                  Cancel
                </button>
                {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
              </>
            )}
          </div>
          </div>
          </div>,
          document.body
        )}
    </>
  );
}
