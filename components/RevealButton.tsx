"use client";

import { useEffect, useState } from "react";

/**
 * "See who did this work" — the paid business-name reveal for one
 * verified report. Renders only when the report is verified AND an
 * admin has stored a business name for it (business_name_available).
 *
 * If this browser already holds an unlocking token (single for this
 * report, or an unexpired day pass), the name shows inline instead of
 * the button. Otherwise the button opens a dialog that explains the
 * purchase in full — price, no email, bookmark link, invoices never
 * shown — before sending the buyer to Stripe Checkout.
 */
export default function RevealButton({
  reportId,
  serviceName,
}: {
  reportId: string;
  serviceName: string;
}) {
  const [unlockedName, setUnlockedName] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reveal/status?report_id=${encodeURIComponent(reportId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.unlocked && json.business_name) {
          setUnlockedName(json.business_name as string);
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

  async function buy(type: "single" | "day") {
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
  if (unlockedName) {
    return (
      <p className="mt-3 text-sm text-ink">
        Performed by <span className="font-semibold">{unlockedName}</span>
      </p>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-1 font-mono text-[13px] font-semibold text-ink underline decoration-dotted underline-offset-4 hover:decoration-solid"
      >
        See who did this work
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !busy && setOpen(false)}
        >
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
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted">
              <li>
                The name appears right here on this listing after payment (day
                pass: names appear on all verified listings for 24 hours).
              </li>
              <li>
                No email is collected and no account is needed. After paying
                you&rsquo;ll get a private link — <strong className="text-ink">bookmark it</strong>.
                It re-opens your reveal or day pass in any browser.
              </li>
              <li>
                If you lose that link and clear your cookies, the reveal is
                gone and you&rsquo;d need to buy it again.
              </li>
              <li>
                Invoices are never shown — only the business name. The
                homeowner who posted stays anonymous.
              </li>
              <li>
                Names appear only on verified jobs. A business can ask to have
                its name removed via the contact page.
              </li>
            </ul>
            <div className="mt-5 space-y-2">
              <button
                onClick={() => buy("single")}
                disabled={busy}
                className="w-full rounded-[10px] bg-black px-4 py-2.5 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {busy ? "…" : "This job only — $1.99"}
              </button>
              <button
                onClick={() => buy("day")}
                disabled={busy}
                className="w-full rounded-[10px] border border-line bg-white px-4 py-2.5 font-semibold text-ink hover:border-black disabled:opacity-50"
              >
                {busy ? "…" : "Day pass, all verified jobs — $4.99"}
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
      )}
    </>
  );
}
