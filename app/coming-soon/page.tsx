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
    <div className="dot-grid -mx-4 px-4 py-16 sm:py-24">
      <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center text-center">
        <Image
          src="/logo.svg"
          alt={`${siteConfig.siteName} logo`}
          width={88}
          height={88}
          priority
        />
        <p className="mt-8 inline-block rounded-full border border-line bg-white px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-muted">
          Coming soon
        </p>
        <h1 className="mt-6 font-serif text-5xl leading-[1.05] text-ink sm:text-6xl">
          {siteConfig.siteName}
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted">{siteConfig.tagline}</p>

        <div className="mt-10 w-full max-w-sm">
          {step === "email" && (
            <form
              onSubmit={submitStep1}
              className="rounded-2xl border border-line bg-white p-6 text-left shadow-sm"
            >
              <p className="text-center text-ink">
                Be the first to know when we launch.
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-4 w-full rounded-[10px] border border-line px-4 py-2.5 text-ink placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 disabled:bg-card disabled:text-muted"
                disabled={busy}
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-3 w-full rounded-[10px] bg-black px-6 py-2.5 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {busy ? "Signing you up…" : "Notify me at launch →"}
              </button>
              <p className="mt-3 text-center text-xs text-muted">
                We&rsquo;ll email you at launch — and only send updates if you ask.
                Never shared or sold.
              </p>
            </form>
          )}

          {step === "updates" && (
            <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
              <p className="font-semibold text-ink">
                You&rsquo;re on the launch list! 🎉
              </p>
              <p className="mt-1 text-muted">
                Want occasional Triangle home-price news and updates too?
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  onClick={() => answerUpdates(true)}
                  disabled={busy}
                  className="rounded-[10px] bg-black px-4 py-2.5 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  Yes, keep me updated
                </button>
                <button
                  onClick={() => answerUpdates(false)}
                  disabled={busy}
                  className="rounded-[10px] border border-line bg-white px-4 py-2.5 font-semibold text-ink hover:border-black disabled:opacity-50"
                >
                  No thanks, just the launch email
                </button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
              <p className="font-semibold text-ink">All set!</p>
              <p className="mt-1 text-muted">
                We&rsquo;ll be in touch when {siteConfig.siteName} launches.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
