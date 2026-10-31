"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Result = { ok: true; type: "single" | "pack3" | "pack5"; list_url: string };

/**
 * Post-Stripe landing page: confirms the session is paid, records the
 * purchase, and sends the buyer to their private list page. No email
 * is involved anywhere; the list link is the access, so the page also
 * shows it as a fallback in case the redirect stalls.
 */
function RevealSuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") ?? "";
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/reveal/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Confirmation failed");
      setResult(json as Result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (sessionId) confirm();
    else {
      setError("No payment found.");
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (result) window.location.assign(result.list_url);
  }, [result]);

  if (busy) {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-ink">Confirming your payment…</h1>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-ink">Couldn&rsquo;t confirm your payment</h1>
        <p className="mt-3 text-muted">{error}</p>
        <button
          onClick={confirm}
          className="mt-4 rounded-[10px] bg-black px-4 py-2.5 font-semibold text-white hover:bg-neutral-800"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="py-16 max-w-3xl mx-auto">
      <h1 className="font-serif text-3xl text-ink">Payment confirmed</h1>
      <p className="mt-3 text-muted">Opening your list…</p>
      <p className="mt-4">
        <Link href={result.list_url} className="font-semibold text-ink underline underline-offset-4">
          View your list →
        </Link>
      </p>
      <p className="mt-4 text-sm text-muted">
        Bookmark that page — the link is your permanent access to{" "}
        {result.type === "single" ? "this reveal" : "your selected reveals"}.
        The invoice behind a job is never shown.
      </p>
    </div>
  );
}

export default function RevealSuccess() {
  return (
    <Suspense>
      <RevealSuccessInner />
    </Suspense>
  );
}
