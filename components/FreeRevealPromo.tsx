"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISSED_KEY = "tpb-free-reveal-promo-dismissed";

/**
 * Corner card on the homepage announcing the free-reveal reward
 * (Nov 1, 2026): submit a verified quote or invoice, reveal one
 * business name free. Shows on every visit until dismissed; the
 * dismissal persists in localStorage so it never nags. Rendered null
 * on the first pass (server + client) and only revealed by the
 * effect, so there is no hydration mismatch.
 */
export default function FreeRevealPromo() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(DISMISSED_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Private mode or blocked storage: hiding for this visit is enough.
    }
    setVisible(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-line bg-white p-5 shadow-xl dark:bg-neutral-900 relative">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 rounded-full px-2 py-1 text-sm text-muted hover:text-ink"
      >
        ✕
      </button>
      <p className="font-mono text-xs font-bold uppercase tracking-wide text-muted">
        ✨ New feature
      </p>
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
