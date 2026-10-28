"use client";

import { useState } from "react";

// 300 characters — a short note, not an essay. The API enforces the same cap.
const MAX_MESSAGE = 300;

/**
 * Shared visitor feedback form: a 300-character message for feature
 * requests, missing categories, or a price the visitor couldn't find a
 * way to submit. Used on /feedback.
 * No account needed. An email is optional — only so we can reply.
 */
export default function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Please write a message first.");
      return;
    }
    if (trimmed.length > MAX_MESSAGE) {
      setError(`Please keep your message under ${MAX_MESSAGE} characters.`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, email: email.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <p className="font-semibold text-ink">Thanks — got it!</p>
        <p className="mt-1 text-muted">
          Your note is in the pile. We read every one.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-line bg-white p-6 text-left shadow-sm"
    >
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={MAX_MESSAGE + 50}
        rows={3}
        placeholder="e.g. Please add a Septic category — or, I got a quote for gutter guards and couldn't find where to put it."
        className="w-full resize-none rounded-[10px] border border-line px-4 py-2.5 text-ink placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 disabled:bg-card disabled:text-muted"
        disabled={busy}
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="font-mono text-xs text-muted">
          {message.length}/{MAX_MESSAGE}
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
      <label className="mt-3 block text-sm">
        <span className="font-semibold text-ink">
          Email <span className="font-normal text-muted">(optional — so we can reply)</span>
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="mt-1 w-full rounded-[10px] border border-line px-4 py-2.5 text-ink placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 disabled:bg-card disabled:text-muted"
          disabled={busy}
        />
      </label>
      <button
        type="submit"
        disabled={busy || message.trim().length === 0}
        className="mt-3 w-full rounded-[10px] bg-black px-6 py-2.5 font-semibold text-white hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send feedback →"}
      </button>
    </form>
  );
}
