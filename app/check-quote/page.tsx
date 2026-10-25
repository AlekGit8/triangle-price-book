"use client";

import { useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { formatCents, formatMonthYear } from "@/lib/format";

interface Sample {
  amount_cents: number;
  service_name: string;
  town: string;
  service_date: string | null;
}

interface CheckResult {
  ok: boolean;
  count: number;
  notEnoughData?: boolean;
  min_cents?: number;
  median_cents?: number;
  max_cents?: number;
  matched?: string[];
  samples?: Sample[];
  error?: string;
}

function verdictFor(priceCents: number, r: CheckResult): { headline: string; detail: string; tone: string } {
  const min = r.min_cents!, median = r.median_cents!, max = r.max_cents!;
  if (priceCents < min)
    return {
      headline: "Below the typical range for this job",
      detail: `Your quote is under the lowest similar verified price (${formatCents(min)}). That looks like a strong deal — just confirm the scope matches.`,
      tone: "text-green-700",
    };
  if (priceCents <= median)
    return {
      headline: "Within the typical range for this job",
      detail: `Your quote sits at or below the middle of similar verified prices (median ${formatCents(median)}). Looks fair.`,
      tone: "text-green-700",
    };
  if (priceCents <= max)
    return {
      headline: "Above the typical range for this job",
      detail: `Your quote is above the median for similar jobs (${formatCents(median)}). Not necessarily unfair — scope and materials matter — but a second quote is worth getting.`,
      tone: "text-amber-700",
    };
  return {
    headline: "Above the typical range for this job",
    detail: `Your quote tops the highest similar verified price (${formatCents(max)}). Definitely get at least one more quote before committing.`,
    tone: "text-red-700",
  };
}

export default function CheckQuotePage() {
  const [category, setCategory] = useState<string>(siteConfig.categories[0]);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [submittedPrice, setSubmittedPrice] = useState(0);
  const [submittedDescription, setSubmittedDescription] = useState("");
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
      <h1 className="font-serif text-4xl text-ink sm:text-5xl">Is this quote fair?</h1>
      <p className="mt-2 text-muted">
        Describe the job and enter your quoted price — we&rsquo;ll compare it against
        similar verified prices from Triangle homeowners.
      </p>

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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-[10px] bg-black px-4 py-2.5 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {busy ? "Checking…" : "Check my quote"}
        </button>
      </form>

      {result?.notEnoughData && (
        <div className="mt-6 rounded-2xl border border-line bg-white p-6">
          <p className="font-semibold text-ink">No similar jobs yet</p>
          <p className="mt-1 text-muted">
            We haven&rsquo;t seen enough Triangle jobs like &ldquo;{submittedDescription}&rdquo;
            to judge your quote fairly.
          </p>
          <p className="mt-3 text-muted">
            <Link href="/submit" className="font-semibold text-ink hover:underline">
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
            Similar Triangle jobs range from{" "}
            <span className="font-bold">{formatCents(result.min_cents!)}</span> to{" "}
            <span className="font-bold">{formatCents(result.max_cents!)}</span>.
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

          {result.samples && result.samples.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-ink">
                Compared against {result.count} similar verified {result.count === 1 ? "job" : "jobs"}:
              </p>
              <ul className="mt-2 space-y-1.5">
                {result.samples.map((s, i) => (
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
              <Link href="/submit" className="font-semibold text-ink hover:underline">
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
