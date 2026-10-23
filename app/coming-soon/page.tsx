"use client";

import { useState } from "react";
import Image from "next/image";
import { siteConfig } from "@/lib/site-config";

type Step = "email" | "updates" | "done";

export default function ComingSoonPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed");
      setStep("updates");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function answerUpdates(wantsUpdates: boolean) {
    setBusy(true);
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), wants_updates: wantsUpdates }),
      });
    } catch {
      // Non-critical: the launch signup from step 1 is already saved.
    } finally {
      setStep("done");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-16 text-center">
      <Image
        src="/logo.svg"
        alt={`${siteConfig.siteName} logo`}
        width={88}
        height={88}
        priority
      />
      <h1 className="mt-6 text-4xl font-extrabold text-brand-900">
        {siteConfig.siteName}
      </h1>
      <p className="mt-3 max-w-md text-lg text-stone-600">{siteConfig.tagline}</p>
      <div className="mt-8 rounded-full bg-brand-100 px-6 py-2 text-sm font-bold uppercase tracking-widest text-brand-800">
        Coming soon
      </div>

      <div className="mt-8 w-full max-w-sm">
        {step === "email" && (
          <form onSubmit={submitStep1} className="space-y-3">
            <p className="text-stone-600">
              Be the first to know when we launch.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
              disabled={busy}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-brand-700 px-4 py-2.5 font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
            >
              {busy ? "Signing you up…" : "Notify me at launch"}
            </button>
            <p className="text-xs text-stone-400">
              We&rsquo;ll email you at launch — and only send updates if you ask.
              Never shared or sold.
            </p>
          </form>
        )}

        {step === "updates" && (
          <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-6">
            <p className="font-semibold text-stone-800">
              You&rsquo;re on the launch list! 🎉
            </p>
            <p className="text-stone-600">
              Want occasional Triangle home-price news and updates too?
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={() => answerUpdates(true)}
                disabled={busy}
                className="rounded-lg bg-brand-700 px-4 py-2.5 font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
              >
                Yes, keep me updated
              </button>
              <button
                onClick={() => answerUpdates(false)}
                disabled={busy}
                className="rounded-lg border border-stone-300 px-4 py-2.5 font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50"
              >
                No thanks, just the launch email
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="rounded-xl border border-stone-200 bg-white p-6">
            <p className="font-semibold text-stone-800">All set!</p>
            <p className="mt-1 text-stone-600">
              We&rsquo;ll be in touch when {siteConfig.siteName} launches.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
