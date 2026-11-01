"use client";

import { useEffect, useState } from "react";
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

interface ClaimedData {
  business_name: string;
  report: {
    service_name: string;
    category: string;
    amount_cents: number;
    report_type: string;
    town: string;
    service_date: string;
  };
}

/**
 * Free-reveal picker (/reveal/free/<token>). Earned by a verified
 * submission: the holder picks exactly one verified listing and the
 * business behind it is revealed free, no payment. Same listing pool
 * as the paid picker (/api/reveal/selectable — verified + a real name
 * on file, never names). After claiming, the token page keeps showing
 * the claimed name, so the link stays useful like a paid token page.
 * Single-select: picking another listing replaces the pick.
 */
export default function FreeRevealSelect({ token }: { token: string }) {
  const [phase, setPhase] = useState<
    "loading" | "invalid" | "unclaimed" | "claimed" | "unavailable"
  >("loading");
  const [claimed, setClaimed] = useState<ClaimedData | null>(null);
  const [reports, setReports] = useState<SelectableReport[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/reveal/free/status?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.ok) {
          setPhase("invalid");
          return null;
        }
        if (json.claimed) {
          if (json.unavailable) {
            setPhase("unavailable");
          } else {
            setClaimed({ business_name: json.business_name, report: json.report });
            setPhase("claimed");
          }
          return null;
        }
        return fetch("/api/reveal/selectable")
          .then((r) => r.json())
          .then((list) => {
            if (list.ok) {
              setReports(list.reports as SelectableReport[]);
              setPhase("unclaimed");
            } else {
              setError(list.error ?? "Could not load listings.");
            }
          });
      })
      .catch(() => setError("Could not load this free reveal. Please try again."));
  }, [token]);

  async function claim() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/reveal/free/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, report_id: selected }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Claim failed");
      if (json.unavailable) {
        setPhase("unavailable");
        return;
      }
      setClaimed({ business_name: json.business_name, report: json.report });
      setPhase("claimed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed. Please try again.");
      setBusy(false);
    }
  }

  if (phase === "loading") {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-ink">Your free reveal</h1>
        <p className="mt-3 text-muted">Loading…</p>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-ink">This link isn&rsquo;t valid</h1>
        <p className="mt-3 text-muted">
          It may have been typed wrong, or the free reveal it came from no longer
          exists. <Link href="/browse" className="font-semibold text-ink underline underline-offset-4">Browse prices</Link> to
          start from a verified listing.
        </p>
      </div>
    );
  }

  if (phase === "unavailable") {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-ink">This reveal is no longer available</h1>
        <p className="mt-3 text-muted">
          The listing or its business name is no longer available.{" "}
          <Link href="/contact" className="font-semibold text-ink underline underline-offset-4">Contact us</Link> if
          you need help.
        </p>
      </div>
    );
  }

  if (phase === "claimed" && claimed) {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
          {claimed.report.category}
        </p>
        <h1 className="mt-1 font-serif text-3xl text-ink">{claimed.report.service_name}</h1>
        <p className="mt-2 font-mono text-2xl font-bold text-ink">
          {formatCents(claimed.report.amount_cents)}
        </p>
        <p className="mt-4 text-lg text-ink">
          {claimed.report.report_type === "paid" ? "Performed by" : "Quoted by"}{" "}
          <strong>{claimed.business_name}</strong>
        </p>
        <p className="mt-2 text-sm text-muted">
          {claimed.report.town} · {formatMonthYear(claimed.report.service_date)}
        </p>
        <p className="mt-4 text-sm text-muted">
          Bookmark this page — this link opens your free reveal any time, in any
          browser. If you lose the link, the reveal is gone. The invoice behind
          a job is never shown.
        </p>
      </div>
    );
  }

  if (!reports) {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-ink">Choose 1 verified listing</h1>
        <p className="mt-3 text-muted">Loading verified listings…</p>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  if (reports.length < 1) {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-ink">Not enough listings yet</h1>
        <p className="mt-3 text-muted">
          There are no verified listings with a business name on file right now.
          Please check back once more listings are verified.
        </p>
        <p className="mt-4">
          <Link href="/browse" className="font-semibold text-ink underline underline-offset-4">Browse prices →</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="py-16 max-w-3xl mx-auto">
      <h1 className="font-serif text-3xl text-ink">Choose 1 verified listing</h1>
      <p className="mt-3 text-muted">
        Pick one — revealing it is free, thanks to your verified submission. No
        payment. Only verified listings with a business name on file are listed.
      </p>
      <p className="mt-2 font-mono text-sm font-semibold text-ink">
        {selected ? "1 of 1 selected" : "0 of 1 selected"}
      </p>

      <ul className="mt-6 space-y-3">
        {reports.map((r) => {
          const checked = selected === r.id;
          return (
            <li key={r.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-5 ${
                  checked ? "border-black bg-white" : "border-line bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-black"
                  checked={checked}
                  onChange={() => setSelected(checked ? null : r.id)}
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
          onClick={claim}
          disabled={busy || !selected}
          className="w-full rounded-[10px] bg-black px-4 py-3 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {busy ? "…" : "Reveal 1 verified job's business for free"}
        </button>
        <p className="mt-2 text-center text-sm text-muted">
          Free, no payment. Your reveal page link is shown after claiming — bookmark it.
        </p>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
