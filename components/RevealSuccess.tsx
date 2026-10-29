"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Result =
  | { ok: true; type: "single"; business_name: string | null; bookmark_url: string }
  | { ok: true; type: "day"; bookmark_url: string; expires_at: string | null };

/**
 * Post-Stripe landing page: confirms the session is paid, records the
 * purchase, and shows the buyer what they bought — the name itself for
 * a single reveal, the active pass for a day pass — plus the bookmark
 * link that re-opens it. No email is involved anywhere.
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
      setError("No payment found. If you just paid, please try your bookmark link.");
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

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

  if (result.type === "single") {
    return (
      <div className="py-16 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-ink">This job was performed by</h1>
        <p className="mt-4 rounded-2xl border border-line bg-white p-5 text-xl text-ink">
          <span className="font-semibold">{result.business_name ?? "Name unavailable"}</span>
        </p>
        <p className="mt-4 text-muted">
          Bookmark this link — it re-opens this reveal any time:{" "}
          <Link href={result.bookmark_url} className="font-semibold text-ink underline underline-offset-4">
            {result.bookmark_url}
          </Link>
        </p>
        <p className="mt-2 text-sm text-muted">
          If you lose the link and clear your cookies, the reveal is gone and
          you&rsquo;d need to buy it again. The invoice behind this job is never shown.
        </p>
        <p className="mt-4">
          <Link href="/browse" className="font-semibold text-ink underline underline-offset-4">
            Browse more prices →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="py-16 max-w-3xl mx-auto">
      <h1 className="font-serif text-3xl text-ink">Your day pass is active</h1>
      <p className="mt-3 text-muted">
        Business names now show on all verified listings in this browser
        {result.expires_at && <> until {new Date(result.expires_at).toLocaleString()}</>}.
      </p>
      <p className="mt-3 text-muted">
        Bookmark this link — it re-activates your pass in any browser until it
        expires:{" "}
        <Link href={result.bookmark_url} className="font-semibold text-ink underline underline-offset-4">
          {result.bookmark_url}
        </Link>
      </p>
      <p className="mt-4">
        <Link href="/browse" className="font-semibold text-ink underline underline-offset-4">
          Browse prices →
        </Link>
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
