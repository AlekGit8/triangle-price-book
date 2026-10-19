"use client";

import { useState } from "react";
import { formatCents, formatMonthYear } from "@/lib/format";

interface QueueReport {
  id: string;
  service_name: string;
  category: string;
  amount_cents: number;
  amount_note: string | null;
  report_type: string;
  town: string;
  service_date: string | null;
  notes: string | null;
  verification_status: string;
  submitter_email: string | null;
  created_at: string;
  verifications: Array<{ id: string; invoice_path: string; created_at: string }>;
}

type Action = "verify" | "publish_unverified" | "reject";

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [reports, setReports] = useState<QueueReport[]>([]);
  const [published, setPublished] = useState<QueueReport[]>([]);
  const [tab, setTab] = useState<"queue" | "published">("queue");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(k: string, scope: "queue" | "published" = "queue") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/reports?scope=${scope}`, { headers: { "x-admin-key": k } });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to load");
      if (scope === "published") {
        setPublished(json.reports);
      } else {
        setReports(json.reports);
      }
      setUnlocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function moderate(id: string, action: Action, from: "queue" | "published" = "queue") {
    try {
      const res = await fetch("/api/admin/moderate", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed");
      if (from === "published") {
        setPublished((rs) => rs.filter((r) => r.id !== id));
      } else {
        setReports((rs) => rs.filter((r) => r.id !== id));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Moderation failed");
    }
  }

  if (!unlocked) {
    return (
      <div className="py-16 max-w-sm mx-auto">
        <h1 className="text-2xl font-extrabold text-brand-900">Moderation</h1>
        <p className="mt-2 text-sm text-stone-600">
          Enter the admin key from your <code>.env.local</code> (ADMIN_KEY).
        </p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load(key, "queue");
            load(key, "published");
          }}
        >
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2"
            placeholder="Admin key"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {loading ? "…" : "Unlock"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-extrabold text-brand-900">Moderation</h1>
        <button onClick={() => load(key, tab)} className="text-sm font-semibold text-brand-700 hover:underline">
          Refresh
        </button>
      </div>
      <p className="mt-2 text-stone-600">
        New submissions publish instantly with a document attached. Use this page
        to review the queue and take down anything abusive.
      </p>

      <div className="mt-4 flex gap-2">
        {(["queue", "published"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); load(key, t); }}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === t
                ? "bg-brand-700 text-white"
                : "border border-stone-300 text-stone-700 hover:border-brand-600"
            }`}
          >
            {t === "queue" ? `Review queue (${reports.length})` : `Published (${published.length})`}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {(tab === "queue" ? reports : published).map((r) => (
          <article key={r.id} className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {r.category} · {r.report_type} · {r.verification_status}
                </p>
                <h3 className="font-semibold text-stone-900">{r.service_name}</h3>
                <p className="text-sm text-stone-600">
                  {r.town}
                  {r.service_date ? ` · ${formatMonthYear(r.service_date)}` : ""}
                </p>
                {r.notes && <p className="mt-1 text-sm text-stone-600">{r.notes}</p>}
                {r.submitter_email && (
                  <p className="mt-1 text-xs text-stone-500">Submitter: {r.submitter_email}</p>
                )}
                {r.verifications.length > 0 ? (
                  <p className="mt-1 text-xs font-semibold text-brand-700">
                    Invoice attached: {r.verifications.length} file(s) — review in Supabase
                    Storage → invoices bucket, path prefix {r.id}/
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-stone-500">No invoice attached.</p>
                )}
              </div>
              <p className="text-2xl font-bold text-brand-800 whitespace-nowrap">
                {formatCents(r.amount_cents)}
                {r.amount_note && <span className="text-sm font-medium text-stone-500"> {r.amount_note}</span>}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {tab === "queue" ? (
                <>
                  <button
                    onClick={() => moderate(r.id, "verify", "queue")}
                    className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                  >
                    Verify &amp; publish
                  </button>
                  <button
                    onClick={() => moderate(r.id, "publish_unverified", "queue")}
                    className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-brand-600"
                  >
                    Publish unverified
                  </button>
                  <button
                    onClick={() => moderate(r.id, "reject", "queue")}
                    className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    if (confirm("Take down this published entry? It will be hidden from the site.")) {
                      moderate(r.id, "reject", "published");
                    }
                  }}
                  className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Take down
                </button>
              )}
            </div>
          </article>
        ))}
        {(tab === "queue" ? reports : published).length === 0 && (
          <p className="text-stone-600">
            {tab === "queue" ? "Queue is empty. Nice." : "Nothing published yet."}
          </p>
        )}
      </div>
    </div>
  );
}
