"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Corner card on the homepage announcing the free-reveal reward
 * (Nov 1, 2026): submit a verified quote or invoice, reveal one
 * business name free. Shows on EVERY homepage visit (Nov 1 decision):
 * the ✕ only closes it for that page view — nothing is remembered,
 * so a visitor who reflexively closes it still hears about the
 * feature next time. (An earlier version persisted the dismissal in
 * localStorage; that hid the card on return visits, which is not
 * what the site wants for a new-feature announcement.)
 */
export default function FreeRevealPromo() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-line bg-white p-5 shadow-xl dark:bg-neutral-900">
      {/* NOTE: no `relative` on this card — it would override `fixed`
          in Tailwind's ordering and drop the card to the page bottom
          (the Oct 31 bug: the popup only appeared after scrolling).
          The dismiss button sits in normal flow instead. */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-xs font-bold uppercase tracking-wide text-muted">
          ✨ New feature
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full px-2 py-1 text-sm text-muted hover:text-ink"
        >
          ✕
        </button>
      </div>
      <p className="mt-1 font-semibold text-ink">
        Submit a verified quote or invoice, reveal 1 business name for free.
      </p>
      <p className="mt-1 text-sm text-muted">
        Every verified submission earns one free reveal — no payment.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/submit"
          className="rounded-[10px] bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Submit a price →
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-[10px] border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-black"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
