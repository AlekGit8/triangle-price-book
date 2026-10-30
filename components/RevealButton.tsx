"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * "See who did this work" — the paid business-name reveal for one
 * verified report. The button itself decides whether to appear: on
 * mount it asks /api/reveal/status, which reports whether an admin has
 * stored a name for this report. No name stored → renders nothing, so
 * the card looks exactly like it did before reveals existed.
 *
 * The button opens a dialog that explains the purchase in full —
 * price, no email, private list page, invoices never shown — before
 * sending the buyer to Stripe Checkout. After payment the buyer gets a
 * private list page (/reveal/<token>): one job for $1.99, all verified
 * jobs for $4.99, both one-time and permanent. No cookies: the link is
 * the access.
 */
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

  async function buy(type: "single" | "all") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/reveal/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, report_id: reportId }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? "Checkout failed");
      window.location.href = json.url as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
      setBusy(false);
    }
  }

  if (!checked) return null;
  if (!available) return null;

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
            className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-xl"
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
            <p className="mt-3 text-sm leading-relaxed text-muted">
              This is a <strong className="text-ink">verified</strong> job — the
              price was checked against paperwork — for{" "}
              <strong className="text-ink">{serviceName}</strong>. Paying reveals
              the name of the business that performed it.
            </p>

            <div className="mt-5 space-y-2">
              <button
                onClick={() => buy("single")}
                disabled={busy}
                className="w-full rounded-[10px] bg-black px-4 py-2.5 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {busy ? "…" : "This job only — $1.99"}
              </button>
              <button
                onClick={() => buy("all")}
                disabled={busy}
                className="w-full rounded-[10px] border border-line bg-white px-4 py-2.5 font-semibold text-ink hover:border-black disabled:opacity-50"
              >
                {busy ? "…" : "All verified jobs — $4.99"}
              </button>
              <button
                onClick={() => !busy && setOpen(false)}
                disabled={busy}
                className="w-full px-4 py-2 text-sm font-semibold text-muted hover:text-ink disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          </div>
          </div>
          </div>,
          document.body
        )}
    </>
  );
}
