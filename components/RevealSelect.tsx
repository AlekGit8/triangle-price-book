"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCents, formatMonthYear } from "@/lib/format";

interface SelectableReport {
  id: string;
  service_name: string;
  category: string;
  amount_cents: number;
  report_type: string;
  town: string;
  service_date: string;
  created_at: string;
}

/**
 * Pack selection screen (/reveal/select?pack=pack3|pack5). The buyer
 * picks exactly N verified listings, then pays — the button says so
 * plainly. Selecting here charges nothing; Stripe Checkout only starts
 * on confirm. The entry report (the job whose button opened the dialog)
 * starts pre-selected when it is on the list, and a cancelled Stripe
 * checkout returns here with the picks pre-checked via ?selected=.
 */
export default function RevealSelect() {
  const params = useSearchParams();
  const pack = params.get("pack") ?? "";
  const from = params.get("from") ?? "";
  const selectedParam = params.get("selected") ?? "";
  const size = pack === "pack3" ? 3 : pack === "pack5" ? 5 : null;
  const price = pack === "pack3" ? "$5" : pack === "pack5" ? "$8" : "";

  const [reports, setReports] = useState<SelectableReport[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/reveal/selectable")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setReports(json.reports as SelectableReport[]);
        else setError(json.error ?? "Could not load listings.");
      })
      .catch(() => setError("Could not load listings. Please try again."));
  }, []);

  // Pre-select once the list loads: a cancelled checkout's picks win,
  // otherwise the entry report the buyer came from.
  useEffect(() => {
    if (!reports || initialized) return;
    const ids = new Set(reports.map((r) => r.id));
    const fromParam = selectedParam
      .split(",")
      .map((s) => s.trim())
      .filter((id) => ids.has(id));
    if (fromParam.length > 0) {
      setSelected(fromParam.slice(0, size ?? fromParam.length));
    } else if (from && ids.has(from)) {
      setSelected([from]);
    }
    setInitialized(true);
  }, [reports, initialized, selectedParam, from, size]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (size !== null && prev.length >= size) return prev;
      return [...prev, id];
    });
  }

  async function confirmAndPay() {
    if (size === null || selected.length !== size) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/reveal/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: pack, report_ids: selected, from_report_id: from || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? "Checkout failed");
      window.location.href = json.url as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
      setBusy(false);
    }
  }

  if (size === null) {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-ink">Choose your reveals</h1>
        <p className="mt-3 text-muted">
          That link isn&rsquo;t for a 3- or 5-pack.{" "}
          <Link href="/browse" className="font-semibold text-ink underline underline-offset-4">Browse prices</Link> to
          start from a verified listing.
        </p>
      </div>
    );
  }

  if (error && !reports) {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-ink">Choose your reveals</h1>
        <p className="mt-3 text-muted">{error}</p>
      </div>
    );
  }

  if (!reports) {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-ink">Choose your reveals</h1>
        <p className="mt-3 text-muted">Loading verified listings…</p>
      </div>
    );
  }

  if (reports.length < size) {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-ink">Not enough listings yet</h1>
        <p className="mt-3 text-muted">
          There are only {reports.length} verified listings with a business name on file right now — fewer
          than the {size} this pack needs. Please try the single reveal instead, or check back once more
          listings are verified.
        </p>
        <p className="mt-4">
          <Link href="/browse" className="font-semibold text-ink underline underline-offset-4">Browse prices →</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="py-16 max-w-3xl mx-auto">
      <h1 className="font-serif text-3xl text-ink">Choose {size} verified listings</h1>
      <p className="mt-3 text-muted">
        Pick any {size} — after you pay {price}, you&rsquo;ll get a private page with the business behind
        each one. Selecting here charges nothing; payment starts only when you confirm below.
        Only verified listings with a business name on file are listed.
      </p>
      <p className="mt-2 font-mono text-sm font-semibold text-ink">
        {selected.length} of {size} selected
      </p>

      <ul className="mt-6 space-y-3">
        {reports.map((r) => {
          const checked = selectedSet.has(r.id);
          const disabled = !checked && selected.length >= size;
          return (
            <li key={r.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-5 ${
                  checked ? "border-black bg-white" : "border-line bg-white"
                } ${disabled ? "opacity-50" : ""}`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-black"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(r.id)}
                />
                <span>
                  <span className="font-semibold text-ink">{r.service_name}</span>
                  <span className="mt-1 block text-sm text-muted">
                    {r.category} · {r.town} · {formatMonthYear(r.service_date)} · {formatCents(r.amount_cents)}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 mt-6 bg-white/90 py-4 backdrop-blur">
        <button
          onClick={confirmAndPay}
          disabled={busy || selected.length !== size}
          className="w-full rounded-[10px] bg-black px-4 py-3 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {busy ? "…" : `Confirm selections and pay to reveal names — ${price}`}
        </button>
        <p className="mt-2 text-center text-sm text-muted">
          One-time purchase, no subscription. Your private results page link is shown after payment — bookmark it.
        </p>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
