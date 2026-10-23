"use client";

import { useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { formatCents } from "@/lib/format";

interface CheckResult {
  ok: boolean;
  count: number;
  notEnoughData?: boolean;
  min_cents?: number;
  median_cents?: number;
  max_cents?: number;
  error?: string;
}

function verdictFor(priceCents: number, r: CheckResult): { headline: string; detail: string; tone: string } {
  const min = r.min_cents!, median = r.median_cents!, max = r.max_cents!;
  if (priceCents < min)
    return {
      headline: "Below the typical Triangle range",
      detail: `Your quote is under the lowest verified price we've seen (${formatCents(min)}). That looks like a strong deal — just make sure the scope of work matches what others reported.`,
      tone: "text-green-700",
    };
  if (priceCents <= median)
    return {
      headline: "Within the typical Triangle range",
      detail: `Your quote sits at or below the middle of verified Triangle prices (median ${formatCents(median)}). Looks fair.`,
      tone: "text-green-700",
    };
  if (priceCents <= max)
    return {
      headline: "Above the typical Triangle range",
      detail: `Your quote is above the median verified price (${formatCents(median)}). Not necessarily unfair — scope and materials matter — but a second quote is worth getting.`,
      tone: "text-amber-700",
    };
  return {
    headline: "Above the typical Triangle range",
    detail: `Your quote tops the highest verified price we've seen (${formatCents(max)}). Definitely get at least one more quote before committing.`,
    tone: "text-red-700",
  };
}

export default function CheckQuotePage() {
  const [category, setCategory] = useState<string>(siteConfig.categories[0]);
  const [price, setPrice] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [submittedPrice, setSubmittedPrice] = useState(0);
  const [submittedCategory, setSubmittedCategory] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    const cents = Math.round(parseFloat(price) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Please enter a valid price.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/check-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, price_cents: cents }),
      });
      const json = (await res.json()) as CheckResult;
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed");
      setSubmittedPrice(cents);
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
  const scalePos = (v: number) => {
    const min = result!.min_cents!, max = result!.max_cents!;
    return Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  };

  const verdict = hasRange ? verdictFor(submittedPrice, result!) : null;

  return (
    <div className="py-10 max-w-2xl mx-auto px-4">
      <h1 className="text-3xl font-extrabold text-brand-900">Is this quote fair?</h1>
      <p className="mt-2 text-stone-600">
        Enter a quote you received and we&rsquo;ll compare it against verified prices
        reported by Triangle homeowners.
      </p>

      <form onSubmit={check} className="mt-6 rounded-xl border border-stone-200 bg-white p-6 space-y-4">
        <div>
          <label htmlFor="cq-category" className="block text-sm font-semibold text-stone-700">
            Service category
          </label>
          <select
            id="cq-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {siteConfig.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cq-price" className="block text-sm font-semibold text-stone-700">
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
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-brand-700 px-4 py-2.5 font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {busy ? "Checking…" : "Check my quote"}
        </button>
      </form>

      {result?.notEnoughData && (
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
          <p className="font-semibold text-stone-800">Not enough data yet</p>
          <p className="mt-1 text-stone-600">
            We {result.count === 0 ? "don't have any" : "only have one"} verified{" "}
            {submittedCategory} price{result.count === 1 ? "" : "s"} from Triangle
            homeowners so far — not enough to judge your quote fairly.
          </p>
          <p className="mt-3 text-stone-600">
            <Link href="/submit" className="font-semibold text-brand-700 hover:underline">
              Share your quote anonymously
            </Link>{" "}
            and help build the data your neighbors need.
          </p>
        </div>
      )}

      {verdict && result && (
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
          <p className={`text-xl font-bold ${verdict.tone}`}>{verdict.headline}</p>
          <p className="mt-3 text-lg text-stone-800">
            Typical {submittedCategory} quotes in the Triangle range from{" "}
            <span className="font-bold">{formatCents(result.min_cents!)}</span> to{" "}
            <span className="font-bold">{formatCents(result.max_cents!)}</span>.
          </p>
          <p className="mt-2 text-stone-600">{verdict.detail}</p>

          {hasRange && (
            <div className="mt-6">
              <div className="relative h-2 rounded-full bg-stone-200">
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-700 ring-4 ring-brand-100"
                  style={{ left: `${scalePos(submittedPrice)}%` }}
                  title="Your quote"
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-stone-500">
                <span>{formatCents(result.min_cents!)}</span>
                <span>Your quote: {formatCents(submittedPrice)}</span>
                <span>{formatCents(result.max_cents!)}</span>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-stone-400">
            Based on {result.count} verified homeowner-reported prices from across the
            Triangle (median {formatCents(result.median_cents!)}). More data makes this
            sharper — prices vary with scope, materials, and timing. Always get multiple
            quotes.
          </p>

          <div className="mt-4 rounded-lg bg-brand-50 p-4">
            <p className="text-sm text-stone-700">
              <span className="font-semibold">Help your neighbors:</span>{" "}
              <Link href="/submit" className="font-semibold text-brand-700 hover:underline">
                anonymously share this quote
              </Link>{" "}
              so the next homeowner gets a better answer.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
